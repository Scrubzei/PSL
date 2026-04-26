import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

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

interface TournamentMatchResultPayload {
  tournamentName: string;
  tournamentSlug: string;
  winnerUsername: string;
  loserUsername: string;
  round: number;
  matchNumber: number;
  isFinal: boolean;
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

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {
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

  async sendTournamentMatchResult(payload: TournamentMatchResultPayload): Promise<boolean> {
    this.logger.log(`Sending tournament match result: ${payload.winnerUsername} beat ${payload.loserUsername} in ${payload.tournamentName}`);
    return this.makeRequest('/api/tournament-match-result', payload);
  }

  async sendDm(payload: GenericDmPayload): Promise<boolean> {
    if (!payload.discordId) {
      this.logger.debug('No discordId provided, skipping DM');
      return false;
    }

    return this.makeRequest('/api/dm', payload);
  }

  async sendChannelMessage(payload: { channelId: string; message?: string; embed?: any }): Promise<boolean> {
    if (!payload.channelId) {
      this.logger.debug('No channelId provided, skipping channel message');
      return false;
    }

    this.logger.log(`Sending channel message to ${payload.channelId}`);
    return this.makeRequest('/api/channel-message', payload);
  }

  async sendPlutoGameResult(payload: {
    winnerName: string;
    loserName: string;
    winnerScore: number;
    loserScore: number;
    mapName: string;
    winnerRecord: string;
  }): Promise<boolean> {
    this.logger.log(`Sending pluto game result: ${payload.winnerName} beat ${payload.loserName}`);
    return this.makeRequest('/api/pluto-game-result', payload);
  }

  async sendMatchfinderListing(payload: {
    matchId: string;
    username: string;
    game: string;
    platform: string;
    bestOf: number;
    selectedMaps: string[];
  }): Promise<boolean> {
    this.logger.log(`Sending matchfinder listing for ${payload.username} (${payload.game} ${payload.platform})`);
    return this.makeRequest('/api/matchfinder-listing', payload);
  }

  async getGuildSettings(guildId: string): Promise<any> {
    try {
      const result = await this.dataSource.query(
        `SELECT settings FROM guild_settings WHERE "guildId" = $1`,
        [guildId],
      );
      return result[0]?.settings ?? {};
    } catch {
      return {};
    }
  }

  async setGuildSettings(guildId: string, settings: any): Promise<any> {
    try {
      // Merge with existing settings
      const existing = await this.getGuildSettings(guildId);
      const merged = { ...existing, ...settings };
      await this.dataSource.query(
        `INSERT INTO guild_settings ("guildId", settings, "updatedAt") VALUES ($1, $2, now())
         ON CONFLICT ("guildId") DO UPDATE SET settings = $2, "updatedAt" = now()`,
        [guildId, JSON.stringify(merged)],
      );
      return merged;
    } catch (err) {
      this.logger.error('Failed to save guild settings:', err);
      return null;
    }
  }

  async getAllGuildSettings(): Promise<Record<string, any>> {
    try {
      const rows = await this.dataSource.query(
        `SELECT "guildId", settings FROM guild_settings`,
      );
      const result: Record<string, any> = {};
      for (const row of rows) {
        result[row.guildId] = row.settings;
      }
      return result;
    } catch {
      return {};
    }
  }

  async getGuildChannels(guildId: string): Promise<any[]> {
    const url = `${this.botzeiUrl}/api/guild/${guildId}/channels`;
    try {
      const response = await fetch(url, {
        headers: { 'X-API-Key': this.apiKey },
      });
      if (!response.ok) return [];
      return response.json();
    } catch {
      return [];
    }
  }

  async getQueues(): Promise<any[]> {
    const url = `${this.botzeiUrl}/api/queues`;
    try {
      const response = await fetch(url, { headers: { 'X-API-Key': this.apiKey } });
      if (!response.ok) return [];
      return response.json();
    } catch { return []; }
  }

  async createQueueViaBot(data: any): Promise<any> {
    const url = `${this.botzeiUrl}/api/queues`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return { error: err.error || 'Failed to create queue' };
      }
      return response.json();
    } catch (err) { return { error: 'Bot unreachable' }; }
  }

  async updateQueueViaBot(queueId: string, data: any): Promise<any> {
    const url = `${this.botzeiUrl}/api/queues/${queueId}`;
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return { error: err.error || 'Failed to update queue' };
      }
      return response.json();
    } catch { return { error: 'Bot unreachable' }; }
  }

  async deleteQueueViaBot(queueId: string): Promise<boolean> {
    const url = `${this.botzeiUrl}/api/queues/${queueId}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'X-API-Key': this.apiKey },
      });
      return response.ok;
    } catch { return false; }
  }

  async getGuilds(): Promise<any> {
    const url = `${this.botzeiUrl}/api/guilds`;
    try {
      const response = await fetch(url, {
        headers: { 'X-API-Key': this.apiKey },
      });
      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    }
  }

  async getPlutoQueueState(): Promise<any> {
    try {
      const result = await this.dataSource.query(
        `SELECT state FROM queue_state WHERE id = 2`,
      );
      return result[0]?.state ?? { queues: [], matches: [] };
    } catch {
      return { queues: [], matches: [] };
    }
  }

  async setPlutoQueueState(state: any): Promise<boolean> {
    try {
      await this.dataSource.query(
        `INSERT INTO queue_state (id, state, "updatedAt") VALUES (2, $1, now())
         ON CONFLICT (id) DO UPDATE SET state = $1, "updatedAt" = now()`,
        [JSON.stringify(state)],
      );
      return true;
    } catch (err) {
      this.logger.error('Failed to save pluto queue state:', err);
      return false;
    }
  }

  async getQueueState(): Promise<any> {
    try {
      const result = await this.dataSource.query(
        `SELECT state FROM queue_state WHERE id = 1`,
      );
      return result[0]?.state ?? { queues: [], matches: [] };
    } catch {
      return { queues: [], matches: [] };
    }
  }

  async setQueueState(state: any): Promise<boolean> {
    try {
      await this.dataSource.query(
        `INSERT INTO queue_state (id, state, "updatedAt") VALUES (1, $1, now())
         ON CONFLICT (id) DO UPDATE SET state = $1, "updatedAt" = now()`,
        [JSON.stringify(state)],
      );
      return true;
    } catch (err) {
      this.logger.error('Failed to save queue state:', err);
      return false;
    }
  }

  async getServerInfoTargets(): Promise<any[]> {
    try {
      return await this.dataSource.query(`SELECT * FROM server_info_targets ORDER BY "createdAt"`);
    } catch { return []; }
  }

  async addServerInfoTarget(serverName: string, channelId: string, messageId: string): Promise<any> {
    try {
      const result = await this.dataSource.query(
        `INSERT INTO server_info_targets ("serverName", "channelId", "messageId") VALUES ($1, $2, $3) RETURNING *`,
        [serverName, channelId, messageId],
      );
      return result[0];
    } catch (err) {
      this.logger.error('Failed to add server info target:', err);
      return null;
    }
  }

  async removeServerInfoTarget(id: number): Promise<boolean> {
    try {
      await this.dataSource.query(`DELETE FROM server_info_targets WHERE id = $1`, [id]);
      return true;
    } catch { return false; }
  }

  // ---------------------------------------------------------------------------
  // Game Servers
  // ---------------------------------------------------------------------------

  async getGameServers(queueId?: string): Promise<any[]> {
    try {
      if (queueId) {
        return await this.dataSource.query(
          `SELECT * FROM game_servers WHERE "queueId" = $1 ORDER BY name`,
          [queueId],
        );
      }
      return await this.dataSource.query(`SELECT * FROM game_servers ORDER BY name`);
    } catch { return []; }
  }

  async createGameServer(data: { queueId: string; name: string; ip: string; port: number }): Promise<any> {
    try {
      const result = await this.dataSource.query(
        `INSERT INTO game_servers ("queueId", name, ip, port) VALUES ($1, $2, $3, $4) RETURNING *`,
        [data.queueId, data.name, data.ip, data.port],
      );
      return result[0];
    } catch (err) {
      this.logger.error('Failed to create game server:', err);
      return null;
    }
  }

  async updateGameServer(id: string, data: { name?: string; ip?: string; port?: number; queueId?: string }): Promise<any> {
    try {
      const sets: string[] = [];
      const params: any[] = [];
      let i = 1;
      if (data.name !== undefined) { sets.push(`name = $${i++}`); params.push(data.name); }
      if (data.ip !== undefined) { sets.push(`ip = $${i++}`); params.push(data.ip); }
      if (data.port !== undefined) { sets.push(`port = $${i++}`); params.push(data.port); }
      if (data.queueId !== undefined) { sets.push(`"queueId" = $${i++}`); params.push(data.queueId); }
      sets.push(`"updatedAt" = now()`);
      params.push(id);
      const result = await this.dataSource.query(
        `UPDATE game_servers SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
        params,
      );
      return result[0] ?? null;
    } catch { return null; }
  }

  async deleteGameServer(id: string): Promise<boolean> {
    try {
      await this.dataSource.query(`DELETE FROM game_servers WHERE id = $1`, [id]);
      return true;
    } catch { return false; }
  }

  async setGameServerAvailability(id: string, available: boolean): Promise<any> {
    try {
      const result = await this.dataSource.query(
        `UPDATE game_servers SET available = $1, "updatedAt" = now() WHERE id = $2 RETURNING *`,
        [available, id],
      );
      return result[0] ?? null;
    } catch { return null; }
  }

  async setGameServerAvailabilityByName(name: string, available: boolean): Promise<any> {
    try {
      const result = await this.dataSource.query(
        `UPDATE game_servers SET available = $1, "updatedAt" = now() WHERE name = $2 RETURNING *`,
        [available, name],
      );
      return result[0] ?? null;
    } catch { return null; }
  }

  async getAvailableServer(queueId: string): Promise<any> {
    try {
      const result = await this.dataSource.query(
        `SELECT * FROM game_servers WHERE "queueId" = $1 AND available = true ORDER BY "updatedAt" ASC LIMIT 1`,
        [queueId],
      );
      return result[0] ?? null;
    } catch { return null; }
  }

  async sendServerInfo(payload: {
    player1Name: string;
    player2Name: string;
    player1Score: number;
    player2Score: number;
    map: string;
    server?: string;
    spectatorNames?: string[];
  }): Promise<boolean> {
    return this.makeRequest('/api/server-info', payload);
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
