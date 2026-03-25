import { Injectable } from '@nestjs/common';
import { WhereAmIDto } from './dto/where-am-i.dto';
import { RepeatDto } from './dto/repeat.dto';

@Injectable()
export class AssistantService {
  buildWhereAmIResponse(data: WhereAmIDto) {
    const { latitude, longitude, address, placeName } = data;

    if (placeName && address) {
      return {
        type: 'WHERE_AM_I',
        text: `Вы находитесь рядом с ${placeName}. Адрес: ${address}.`,
        data: {
          latitude,
          longitude,
          address,
          placeName,
        },
      };
    }

    if (address) {
      return {
        type: 'WHERE_AM_I',
        text: `Ваше текущее местоположение: ${address}.`,
        data: {
          latitude,
          longitude,
          address,
        },
      };
    }

    return {
      type: 'WHERE_AM_I',
      text: 'Не удалось определить точный адрес.',
      data: {
        latitude,
        longitude,
      },
    };
  }

  buildRepeatResponse(data: RepeatDto) {
    return {
      type: 'REPEAT',
      text: data.lastInstruction,
    };
  }

  // 🔥 INTENT (НЕ ТРОГАЕМ ЛОГИКУ)
  async parseIntent(text: string) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
Определи намерение пользователя для навигационного ассистента.

Возможные intent:
- nearby_search
- build_route
- where_am_i
- repeat
- weather
- unknown

Возможные category:
- food
- cafe
- shop
- pharmacy
- null

Ответ ТОЛЬКО в JSON.

Формат:
{
  "intent": "nearby_search | build_route | where_am_i | repeat | weather | unknown",
  "category": "food | cafe | shop | pharmacy | null"
}

Фраза пользователя: ${text}
`,
                },
              ],
            },
          ],
        }),
      },
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error?.message || 'Gemini request failed');
    }

    const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      return { intent: 'unknown', category: null };
    }

    try {
      const cleaned = textResponse
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const jsonOnly = cleaned.slice(
        cleaned.indexOf('{'),
        cleaned.lastIndexOf('}') + 1,
      );

      const parsed = JSON.parse(jsonOnly);

      return {
        intent: parsed.intent ?? 'unknown',
        category: parsed.category ?? null,
      };
    } catch {
      return { intent: 'unknown', category: null };
    }
  }

  // 🔥 HUMAN RESPONSE (НОВОЕ)
  async generateHumanResponse(prompt: string) {
    const apiKey = process.env.GEMINI_API_KEY;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
Ты — голосовой ассистент для умных очков.

Говори:
- кратко
- дружелюбно
- понятно
- как человек

${prompt}
`,
                },
              ],
            },
          ],
        }),
      },
    );

    const data = await res.json();
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Не удалось сформировать ответ'
    );
  }

  // 🔥 NEARBY PLACES
  async findNearbyPlaces(lat: number, lon: number, category: string) {
    const apiKey = process.env.GEOAPIFY_API_KEY;

    if (!apiKey) {
      throw new Error('GEOAPIFY_API_KEY is not configured');
    }

    const categoryMap: Record<string, string> = {
      food: 'catering.restaurant,catering.fast_food',
      cafe: 'catering.cafe',
      shop: 'commercial.supermarket',
      pharmacy: 'healthcare.pharmacy',
    };

    const url = new URL('https://api.geoapify.com/v2/places');

    url.searchParams.set(
      'categories',
      categoryMap[category] || categoryMap.food,
    );
    url.searchParams.set('filter', `circle:${lon},${lat},1000`);
    url.searchParams.set('limit', '5');
    url.searchParams.set('apiKey', apiKey);

    const res = await fetch(url.toString());
    const data = await res.json();

    return (data.features || []).map((f: any) => ({
      name: f.properties?.name || 'Без названия',
      address: f.properties?.formatted || 'Адрес не найден',
      lat: f.properties?.lat,
      lon: f.properties?.lon,
    }));
  }

  // 🔥 WEATHER
  async getWeather(lat: number, lon: number) {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
    );

    const data = await res.json();
    return data.current_weather;
  }

  // 🔥 ГЛАВНАЯ ЛОГИКА
  async handleUserQuery(text: string, latitude: number, longitude: number) {
    const intentData = await this.parseIntent(text);

    if (!intentData || intentData.intent === 'unknown') {
      return {
        type: 'ASSISTANT',
        text: 'Я не понял запрос. Попробуйте иначе.',
      };
    }

    // 🔥 ПОГОДА
    if (intentData.intent === 'weather') {
      const weather = await this.getWeather(latitude, longitude);

      const humanText = await this.generateHumanResponse(
        `Сейчас температура ${weather.temperature} градусов и ветер ${weather.windspeed} м/с`,
      );

      return {
        type: 'ASSISTANT',
        text: humanText,
        action: 'WEATHER',
      };
    }

    // 🔥 NEARBY
    if (intentData.intent === 'nearby_search') {
      const places = await this.findNearbyPlaces(
        latitude,
        longitude,
        intentData.category || 'food',
      );

      const names = places.map((p: any) => p.name).join(', ');

      const humanText = await this.generateHumanResponse(
        `Скажи пользователю, что рядом есть: ${names}`,
      );

      return {
        type: 'ASSISTANT',
        text: humanText,
        action: 'NEARBY_RESULTS',
        places,
      };
    }

    if (intentData.intent === 'build_route') {
      return {
        type: 'ASSISTANT',
        text: 'Хорошо, давайте построим маршрут.',
        action: 'BUILD_ROUTE',
      };
    }

    if (intentData.intent === 'repeat') {
      return {
        type: 'ASSISTANT',
        text: 'Повторяю последнюю подсказку.',
        action: 'REPEAT',
      };
    }

    if (intentData.intent === 'where_am_i') {
      return {
        type: 'ASSISTANT',
        text: 'Определяю ваше местоположение.',
        action: 'WHERE_AM_I',
        data: {
          latitude,
          longitude,
        },
      };
    }

    return {
      type: 'ASSISTANT',
      text: 'Запрос обработан.',
    };
  }
}