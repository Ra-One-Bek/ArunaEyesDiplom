import { Body, Controller, Post } from '@nestjs/common';
import { RouteService } from './route.service';
import { BuildRouteDto } from './dto/build-route.dto';

@Controller('route')
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Post('build')
  buildRoute(@Body() body: BuildRouteDto) {
    return this.routeService.buildRoute(body);
  }
}