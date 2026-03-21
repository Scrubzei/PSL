import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { User } from '../users/user.entity';
import { Leaderboard } from '../leaderboards/leaderboard.entity';

export type MatchType = 'XP' | 'RANKED';
export type MatchStatus = 'SEARCHING' | 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  challengerId: string;

  @Column({ nullable: true })
  challengeeId: string;

  @Column({ nullable: true })
  middlemanId: string;

  @Column()
  leaderboardId: string;

  @Column()
  type: MatchType;

  @Column({ default: 'PENDING' })
  status: MatchStatus;

  @Column({ default: 3 })
  bestOf: number;

  @Column({ type: 'jsonb', nullable: true })
  selectedMaps: string[];

  @Column({ nullable: true })
  winnerId: string;

  @Column({ nullable: true })
  challengerReportedWinnerId: string;

  @Column({ nullable: true })
  challengeeReportedWinnerId: string;

  @Column({ type: 'jsonb', nullable: true })
  challengerReportedMapResults: { mapName: string; winner: 'challenger' | 'challengee' }[];

  @Column({ type: 'jsonb', nullable: true })
  challengeeReportedMapResults: { mapName: string; winner: 'challenger' | 'challengee' }[];

  @Column({ nullable: true })
  message: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  wagerAmount: number;

  @Column({ default: false })
  linkOnly: boolean;

  @Column({ nullable: true, unique: true })
  shareToken: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'challengerId' })
  challenger: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'challengeeId' })
  challengee: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'middlemanId' })
  middleman: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'winnerId' })
  winner: User;

  @ManyToOne(() => Leaderboard)
  @JoinColumn({ name: 'leaderboardId' })
  leaderboard: Leaderboard;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
