import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from './user.entity';

@Injectable()
export class DiscordUsernameSyncService {
  private readonly logger = new Logger(DiscordUsernameSyncService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async syncDiscordUsernames(): Promise<void> {
    const botToken = this.configService.get<string>('DISCORD_BOT_TOKEN');
    if (!botToken) {
      this.logger.warn('DISCORD_BOT_TOKEN not configured, skipping sync');
      return;
    }

    const users = await this.usersRepository.find({
      where: { discordId: Not(IsNull()) },
    });

    this.logger.log(`Syncing Discord usernames for ${users.length} users`);

    let updated = 0;
    for (const user of users) {
      try {
        const response = await fetch(`https://discord.com/api/v10/users/${user.discordId}`, {
          headers: { Authorization: `Bot ${botToken}` },
        });

        if (!response.ok) {
          if (response.status === 429) {
            const retryAfter = Number(response.headers.get('retry-after') || '5');
            this.logger.warn(`Rate limited, waiting ${retryAfter}s`);
            await new Promise(r => setTimeout(r, retryAfter * 1000));
            continue;
          }
          this.logger.warn(`Failed to fetch Discord user ${user.discordId}: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const discordUsername = data.username;

        if (discordUsername && discordUsername !== user.discordUsername) {
          user.discordUsername = discordUsername;
          await this.usersRepository.save(user);
          updated++;
        }

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        this.logger.error(`Error fetching Discord user ${user.discordId}: ${err.message}`);
      }
    }

    this.logger.log(`Updated ${updated} Discord usernames`);
  }
}
