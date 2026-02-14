import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TournamentSignupDmPayload {
  discordId: string;
  username: string;
  tournamentName: string;
  tournamentId: string;
  spotsLeft: number;
  maxParticipants: number;
  startDate?: string | null;
  roundDeadlines?: { name: string; deadline: string | null }[] | null;
}

interface GenericDmPayload {
  discordId: string;
  message?: string;
  embed?: any;
}

@Injectable()
export class BotzeiService {
  private readonly logger = new Logger(BotzeiService.name);
  private readonly botzeiUrl: string;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.botzeiUrl = this.configService.get<string>('BOTZEI_URL') || 'http://botzei:3001';
    this.apiKey = this.configService.get<string>('BOT_API_KEY') || '';
  }

  private async makeRequest(endpoint: string, payload: any): Promise<boolean> {
    const url = `${this.botzeiUrl}${endpoint}`;
    this.logger.log(`Making request to ${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        this.logger.warn(`Botzei request failed: ${response.status} - ${error.error || 'Unknown error'}`);
        return false;
      }

      this.logger.log(`Botzei request successful`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to communicate with Botzei at ${url}: ${error}`);
      return false;
    }
  }

  async sendTournamentSignupDm(payload: TournamentSignupDmPayload): Promise<boolean> {
    if (!payload.discordId) {
      this.logger.debug('No discordId provided, skipping DM');
      return false;
    }

    this.logger.log(`Sending tournament signup DM to ${payload.discordId} for tournament ${payload.tournamentName}`);
    this.logger.debug(`Botzei URL: ${this.botzeiUrl}, API Key set: ${!!this.apiKey}`);
    return this.makeRequest('/api/dm/tournament-signup', payload);
  }

  async sendDm(payload: GenericDmPayload): Promise<boolean> {
    if (!payload.discordId) {
      this.logger.debug('No discordId provided, skipping DM');
      return false;
    }

    return this.makeRequest('/api/dm', payload);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.botzeiUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
