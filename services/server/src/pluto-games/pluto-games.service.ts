import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlutoGame } from './pluto-game.entity';
import { BotzeiService } from '../botzei/botzei.service';
import { MatchesService } from '../matches/matches.service';
import { UsersService } from '../users/users.service';
import { LeaderboardsService } from '../leaderboards/leaderboards.service';

interface PlutoGameResultDto {
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  player1Score: number;
  player2Score: number;
  mapName: string;
  platform?: string;
}

interface QueueGameResultDto {
  serverName: string;
  player1Name: string;
  player2Name: string;
  player1Score: number;
  player2Score: number;
  mapName: string;
  platform?: string;
}

@Injectable()
export class PlutoGamesService {
  constructor(
    @InjectRepository(PlutoGame)
    private readonly plutoGameRepo: Repository<PlutoGame>,
    private readonly botzeiService: BotzeiService,
    private readonly matchesService: MatchesService,
    private readonly usersService: UsersService,
    private readonly leaderboardsService: LeaderboardsService,
  ) {}

  async recordResult(dto: PlutoGameResultDto): Promise<PlutoGame> {
    const isP1Winner = dto.player1Score > dto.player2Score;
    const winnerId = isP1Winner ? dto.player1Id : dto.player2Id;
    const loserId = isP1Winner ? dto.player2Id : dto.player1Id;

    const game = this.plutoGameRepo.create({ ...dto, winnerId } as Partial<PlutoGame>);
    const saved = await this.plutoGameRepo.save(game);

    const [winnerH2HWins, loserH2HWins] = await Promise.all([
      this.plutoGameRepo.count({ where: [
        { player1Id: winnerId, player2Id: loserId, winnerId },
        { player1Id: loserId, player2Id: winnerId, winnerId },
      ]}),
      this.plutoGameRepo.count({ where: [
        { player1Id: winnerId, player2Id: loserId, winnerId: loserId },
        { player1Id: loserId, player2Id: winnerId, winnerId: loserId },
      ]}),
    ]);

    const payload = {
      winnerName: isP1Winner ? dto.player1Name : dto.player2Name,
      loserName: isP1Winner ? dto.player2Name : dto.player1Name,
      winnerScore: isP1Winner ? dto.player1Score : dto.player2Score,
      loserScore: isP1Winner ? dto.player2Score : dto.player1Score,
      mapName: dto.mapName,
      winnerRecord: `${winnerH2HWins}-${loserH2HWins}`,
      platform: dto.platform || 'plutonium',
    };

    await this.botzeiService.sendPlutoGameResult(payload);

    return saved;
  }

  async recordQueueResult(dto: QueueGameResultDto): Promise<{ success: boolean; eloChanges?: any }> {
    // Look up game server by name
    const gameServer = await this.botzeiService.getGameServerByName(dto.serverName);
    if (!gameServer || !gameServer.player1DiscordId) {
      throw new Error(`Game server "${dto.serverName}" not found or has no active match`);
    }

    const isP1Winner = dto.player1Score > dto.player2Score;
    const winnerName = isP1Winner ? dto.player1Name : dto.player2Name;
    const loserName = isP1Winner ? dto.player2Name : dto.player1Name;
    const winnerScore = isP1Winner ? dto.player1Score : dto.player2Score;
    const loserScore = isP1Winner ? dto.player2Score : dto.player1Score;

    // Map winner name to discord ID
    const winnerDiscordId = gameServer.player1PlutoUsername === winnerName
      ? gameServer.player1DiscordId
      : gameServer.player2DiscordId;

    // Save to pluto_games table
    const game = this.plutoGameRepo.create({
      player1Id: gameServer.player1PlutoId,
      player1Name: gameServer.player1PlutoUsername,
      player2Id: gameServer.player2PlutoId,
      player2Name: gameServer.player2PlutoUsername,
      player1Score: dto.player1Score,
      player2Score: dto.player2Score,
      mapName: dto.mapName,
      winnerId: gameServer.player1PlutoUsername === winnerName
        ? gameServer.player1PlutoId
        : gameServer.player2PlutoId,
    } as Partial<PlutoGame>);
    await this.plutoGameRepo.save(game);

    // Complete match for ELO + XP
    let eloChanges: any = null;
    if (gameServer.leaderboardId) {
      try {
        const match = await this.matchesService.createCompleted({
          challengerId: (await this.usersService.findByDiscordId(gameServer.player1DiscordId))?.id,
          challengeeId: (await this.usersService.findByDiscordId(gameServer.player2DiscordId))?.id,
          winnerId: (await this.usersService.findByDiscordId(winnerDiscordId))?.id,
          leaderboardId: gameServer.leaderboardId,
          map: dto.mapName,
        });

        const winnerId = (await this.usersService.findByDiscordId(winnerDiscordId))?.id;
        const loserId = winnerId === match.challengerId ? match.challengeeId : match.challengerId;

        // Award XP
        await this.leaderboardsService.awardXp(winnerId, gameServer.leaderboardId, 100);
        await this.leaderboardsService.awardXp(loserId, gameServer.leaderboardId, 25);

        const winnerEntry = await this.leaderboardsService.getUserEntry(winnerId, gameServer.leaderboardId);
        const loserEntry = await this.leaderboardsService.getUserEntry(loserId, gameServer.leaderboardId);

        const winnerEloBefore = winnerId === match.challengerId
          ? match.challengerEloBefore
          : match.challengeeEloBefore;
        const loserEloBefore = winnerId === match.challengerId
          ? match.challengeeEloBefore
          : match.challengerEloBefore;

        eloChanges = {
          winner: {
            before: winnerEloBefore,
            after: winnerEntry?.elo ?? null,
            change: winnerEntry?.elo != null && winnerEloBefore != null
              ? Math.round(winnerEntry.elo - winnerEloBefore) : null,
          },
          loser: {
            before: loserEloBefore,
            after: loserEntry?.elo ?? null,
            change: loserEntry?.elo != null && loserEloBefore != null
              ? Math.round(loserEntry.elo - loserEloBefore) : null,
          },
        };
      } catch (err) {
        console.error('[QueueResult] Failed to complete match for ELO:', err);
      }
    }

    // Reset game server
    await this.botzeiService.clearGameServerMatch(gameServer.id);

    // H2H record for the embed
    const p1Id = gameServer.player1PlutoId;
    const p2Id = gameServer.player2PlutoId;
    const wId = gameServer.player1PlutoUsername === winnerName ? p1Id : p2Id;
    const lId = wId === p1Id ? p2Id : p1Id;

    const [winnerH2HWins, loserH2HWins] = await Promise.all([
      this.plutoGameRepo.count({ where: [
        { player1Id: wId, player2Id: lId, winnerId: wId },
        { player1Id: lId, player2Id: wId, winnerId: wId },
      ]}),
      this.plutoGameRepo.count({ where: [
        { player1Id: wId, player2Id: lId, winnerId: lId },
        { player1Id: lId, player2Id: wId, winnerId: lId },
      ]}),
    ]);

    // Post game feed embed via botzei
    await this.botzeiService.sendPlutoGameResult({
      winnerName,
      loserName,
      winnerScore,
      loserScore,
      mapName: dto.mapName,
      winnerRecord: `${winnerH2HWins}-${loserH2HWins}`,
      platform: dto.platform || 'plutonium',
      eloChanges,
    });

    return { success: true, eloChanges };
  }
}
