import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tournament } from './tournament.entity';
import { User } from '../users/user.entity';

export type TournamentMatchStatus = 'PENDING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED';

@Entity('tournament_matches')
export class TournamentMatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tournamentId: string;

  @Column()
  round: number;

  @Column()
  matchNumber: number;

  @Column({ nullable: true })
  player1Id: string;

  @Column({ nullable: true })
  player2Id: string;

  @Column({ nullable: true })
  winnerId: string;

  @Column({ default: 'PENDING' })
  status: TournamentMatchStatus;

  @Column({ nullable: true })
  nextMatchId: string;

  @ManyToOne(() => Tournament, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournamentId' })
  tournament: Tournament;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'player1Id' })
  player1: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'player2Id' })
  player2: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'winnerId' })
  winner: User;

  @ManyToOne(() => TournamentMatch, { nullable: true })
  @JoinColumn({ name: 'nextMatchId' })
  nextMatch: TournamentMatch;

  @Column({ default: false })
  isBye: boolean;

  @Column({ type: 'jsonb', nullable: true })
  gameMaps: { id: string; mapName: string }[];

  @Column({ type: 'timestamp', nullable: true })
  scheduledTime: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
