import { Controller, Get } from '@nestjs/common';
import { PlatformsService } from './platforms.service';

@Controller('platforms')
export class PlatformsController {
  constructor(private platformsService: PlatformsService) {}

  @Get()
  async findAll() {
    return this.platformsService.findAll();
  }
}
