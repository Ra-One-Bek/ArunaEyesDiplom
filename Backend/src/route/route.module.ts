import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RouteController } from './route.controller';
import { RouteService } from './route.service';

@Module({
  imports: [HttpModule],
  controllers: [RouteController],
  providers: [RouteService],
})
export class RouteModule {}