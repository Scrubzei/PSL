import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { BotzeiService } from './botzei.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';

@Controller('botzei')
export class BotzeiController {
  constructor(private readonly botzeiService: BotzeiService) {}

  @Post('channel-message')
  @UseGuards(ApiKeyGuard)
  async sendChannelMessage(
    @Body() body: { channelId: string; message?: string; embed?: any },
  ) {
    const success = await this.botzeiService.sendChannelMessage({
      channelId: body.channelId || '1465512337183211563',
      message: body.message,
      embed: body.embed,
    });

    return { success };
  }
}
