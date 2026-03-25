import { Body, Controller, Post } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { WhereAmIDto } from './dto/where-am-i.dto';
import { RepeatDto } from './dto/repeat.dto';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('where-am-i')
  whereAmI(@Body() body: WhereAmIDto) {
    return this.assistantService.buildWhereAmIResponse(body);
  }

  @Post('repeat')
  repeat(@Body() body: RepeatDto) {
    return this.assistantService.buildRepeatResponse(body);
  }

  @Post('query')
  query(
    @Body()
    body: {
      text: string;
      latitude: number;
      longitude: number;
    },
  ) {
    return this.assistantService.handleUserQuery(
      body.text,
      body.latitude,
      body.longitude,
    );
  }
}