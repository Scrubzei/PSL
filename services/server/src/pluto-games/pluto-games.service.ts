import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlutoGame } from './pluto-game.entity';
import { BotzeiService } from '../botzei/botzei.service';

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

@Injectable()
export class PlutoGamesService {
  constructor(
    @InjectRepository(PlutoGame)
    private readonly plutoGameRepo: Repository<PlutoGame>,
    private readonly botzeiService: BotzeiService,
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
}
