import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { BuildRouteDto } from './dto/build-route.dto';

type GeoapifyInstructionObject = {
  text?: string;
  action?: string;
};

type GeoapifyStep = {
  instruction?: string | GeoapifyInstructionObject | unknown;
  distance?: number;
  time?: number;
  from_index?: number;
  to_index?: number;
};

type GeoapifyLeg = {
  steps?: GeoapifyStep[];
};

type GeoapifyRouteResponse = {
  features?: Array<{
    properties?: {
      distance?: number;
      time?: number;
      legs?: GeoapifyLeg[];
    };
    geometry?: {
      coordinates?: unknown;
    };
  }>;
};

type RoutePoint = {
  lat: number;
  lng: number;
};

@Injectable()
export class RouteService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async buildRoute(data: BuildRouteDto) {
    const {
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
      destinationName,
    } = data;

    const apiKey = this.configService.get<string>('GEOAPIFY_API_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException(
        'GEOAPIFY_API_KEY is not configured',
      );
    }

    const url = 'https://api.geoapify.com/v1/routing';

    const params = {
      waypoints: `${startLatitude},${startLongitude}|${endLatitude},${endLongitude}`,
      mode: 'walk',
      apiKey,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.get<GeoapifyRouteResponse>(url, { params }),
      );

      const feature = response.data?.features?.[0];

      if (!feature) {
        throw new InternalServerErrorException(
          'Geoapify did not return route data',
        );
      }

      const properties = feature.properties;
      const rawCoordinates = feature.geometry?.coordinates;
      const flatCoordinates = this.flattenCoordinates(rawCoordinates);
      const rawSteps = properties?.legs?.[0]?.steps ?? [];

      const geometry: RoutePoint[] = flatCoordinates.map(([lng, lat]) => ({
        lat,
        lng,
      }));

      const steps = rawSteps.map((step, index) => {
        const maneuverCoord = this.getManeuverCoordinate(
          flatCoordinates,
          step,
          index,
          endLongitude,
          endLatitude,
        );

        const rawInstruction = this.extractInstructionText(step.instruction);
        const translatedInstruction = this.translateInstruction(rawInstruction);

        return {
          index,
          instruction: translatedInstruction,
          rawInstruction,
          distanceMeters: Math.round(step.distance ?? 0),
          durationSeconds: Math.round(step.time ?? 0),
          maneuver: {
            type: this.detectManeuverType(rawInstruction),
            lat: maneuverCoord[1],
            lng: maneuverCoord[0],
          },
          voiceHint: this.buildVoiceHint(translatedInstruction),
        };
      });

      return {
        type: 'BUILD_ROUTE',
        text: destinationName
          ? `Маршрут до ${destinationName} построен`
          : 'Маршрут построен',
        route: {
          name: destinationName
            ? `Маршрут до ${destinationName}`
            : 'Пешеходный маршрут',
          start: {
            lat: startLatitude,
            lng: startLongitude,
          },
          end: {
            lat: endLatitude,
            lng: endLongitude,
          },
          geometry,
          steps,
          totalDistanceMeters: Math.round(properties?.distance ?? 0),
          totalDurationSeconds: Math.round(properties?.time ?? 0),
          firstInstruction: steps[0]?.instruction ?? null,
          firstVoiceHint: steps[0]?.voiceHint ?? null,
        },
      };
    } catch (error: any) {
      console.error(
        'Geoapify routing error:',
        error?.response?.data || error?.message || error,
      );

      throw new InternalServerErrorException(
        'Не удалось построить маршрут через Geoapify',
      );
    }
  }

  private flattenCoordinates(input: unknown): number[][] {
    const result: number[][] = [];

    const walk = (value: unknown) => {
      if (!Array.isArray(value)) {
        return;
      }

      if (
        value.length >= 2 &&
        typeof value[0] === 'number' &&
        typeof value[1] === 'number'
      ) {
        result.push([Number(value[0]), Number(value[1])]);
        return;
      }

      for (const item of value) {
        walk(item);
      }
    };

    walk(input);
    return result;
  }

  private getManeuverCoordinate(
    coordinates: number[][],
    step: GeoapifyStep,
    index: number,
    fallbackLng: number,
    fallbackLat: number,
  ): number[] {
    if (!coordinates.length) {
      return [fallbackLng, fallbackLat];
    }

    const candidateIndexes = [step.to_index, step.from_index, index + 1, index];

    for (const candidate of candidateIndexes) {
      if (
        typeof candidate === 'number' &&
        candidate >= 0 &&
        candidate < coordinates.length &&
        Array.isArray(coordinates[candidate]) &&
        coordinates[candidate].length >= 2
      ) {
        return coordinates[candidate];
      }
    }

    return coordinates[coordinates.length - 1] ?? [fallbackLng, fallbackLat];
  }

  private extractInstructionText(instruction: unknown): string {
    if (typeof instruction === 'string') {
      const text = instruction.trim();
      return text || 'Continue along the route';
    }

    if (instruction && typeof instruction === 'object') {
      const obj = instruction as Record<string, unknown>;

      if (typeof obj.text === 'string' && obj.text.trim()) {
        return obj.text.trim();
      }

      if (typeof obj.action === 'string' && obj.action.trim()) {
        return obj.action.trim();
      }
    }

    return 'Continue along the route';
  }

  private translateInstruction(text: string): string {
    const lower = text.toLowerCase();

    if (lower.includes('you have arrived at your destination')) {
      return 'Вы прибыли к месту назначения';
    }

    if (lower.includes('arrive at your destination')) {
      return 'Вы прибыли к месту назначения';
    }

    if (lower.includes('make a sharp right')) {
      return 'Резко поверните направо';
    }

    if (lower.includes('make a sharp left')) {
      return 'Резко поверните налево';
    }

    if (lower.includes('turn right onto the crosswalk')) {
      return 'Поверните направо на пешеходный переход';
    }

    if (lower.includes('turn left onto the crosswalk')) {
      return 'Поверните налево на пешеходный переход';
    }

    if (lower.includes('turn right onto the walkway')) {
      return 'Поверните направо на пешеходную дорожку';
    }

    if (lower.includes('turn left onto the walkway')) {
      return 'Поверните налево на пешеходную дорожку';
    }

    if (lower.includes('turn right onto')) {
      const street = this.extractStreetName(text, 'turn right onto');
      return street
        ? `Поверните направо на ${street}`
        : 'Поверните направо';
    }

    if (lower.includes('turn left onto')) {
      const street = this.extractStreetName(text, 'turn left onto');
      return street
        ? `Поверните налево на ${street}`
        : 'Поверните налево';
    }

    if (lower.includes('turn right')) {
      return 'Поверните направо';
    }

    if (lower.includes('turn left')) {
      return 'Поверните налево';
    }

    if (lower.includes('walk south on')) {
      const street = this.extractStreetName(text, 'walk south on');
      return street ? `Двигайтесь прямо по ${street}` : 'Двигайтесь прямо';
    }

    if (lower.includes('walk north on')) {
      const street = this.extractStreetName(text, 'walk north on');
      return street ? `Двигайтесь прямо по ${street}` : 'Двигайтесь прямо';
    }

    if (lower.includes('walk east on')) {
      const street = this.extractStreetName(text, 'walk east on');
      return street ? `Двигайтесь прямо по ${street}` : 'Двигайтесь прямо';
    }

    if (lower.includes('walk west on')) {
      const street = this.extractStreetName(text, 'walk west on');
      return street ? `Двигайтесь прямо по ${street}` : 'Двигайтесь прямо';
    }

    if (lower.includes('head south')) return 'Двигайтесь прямо';
    if (lower.includes('head north')) return 'Двигайтесь прямо';
    if (lower.includes('head east')) return 'Двигайтесь прямо';
    if (lower.includes('head west')) return 'Двигайтесь прямо';
    if (lower.includes('continue')) return 'Продолжайте движение по маршруту';

    return text;
  }

  private extractStreetName(text: string, phrase: string): string | null {
    const lower = text.toLowerCase();
    const startIndex = lower.indexOf(phrase);

    if (startIndex === -1) {
      return null;
    }

    const result = text.slice(startIndex + phrase.length).trim();
    const cleaned = result.replace(/\.$/, '').trim();

    return cleaned || null;
  }

  private detectManeuverType(instruction: string): string {
    const text = instruction.toLowerCase();

    if (text.includes('sharp right')) return 'turn-right';
    if (text.includes('sharp left')) return 'turn-left';
    if (text.includes('right')) return 'turn-right';
    if (text.includes('left')) return 'turn-left';
    if (text.includes('destination') || text.includes('arrive')) {
      return 'arrive';
    }
    if (
      text.includes('head') ||
      text.includes('walk') ||
      text.includes('start')
    ) {
      return 'depart';
    }

    return 'continue';
  }

  private buildVoiceHint(instruction: string): string {
    return instruction;
  }
}