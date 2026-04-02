import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MatchesService } from './matches.service';

@Injectable()
export class MatchReportCronService {
  private readonly logger = new Logger(MatchReportCronService.name);

  constructor(private readonly matchesService: MatchesService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleStaleReports(): Promise<void> {
    try {
      await this.matchesService.autoResolveStaleReports();
    } catch (e) {
      this.logger.error((e as Error).message);
    }
  }
}
