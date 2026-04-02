import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { User } from '../users/user.entity';
import { Leaderboard } from '../leaderboards/leaderboard.entity';

export type MatchType = 'XP' | 'RANKED';
export type MatchStatus = 'SEARCHING' | 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';

/** Moderation pipeline for XP disputes */
export type DisputePhase =
  | 'NONE'
  | 'PLAYER_MISMATCH'
  | 'AWAITING_REF'
  | 'REF_DECIDED'
  | 'AWAITING_ADMIN'
  | 'FINAL';

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
  winnerId: string | null;

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

  @Column({ type: 'int', nullable: true })
  challengerEloBefore: number | null;

  @Column({ type: 'int', nullable: true })
  challengeeEloBefore: number | null;

  @Column({ default: false })
  eloApplied: boolean;

  @Column({ type: 'varchar', length: 32, default: 'NONE' })
  disputePhase: DisputePhase;

  @Column({ type: 'int', nullable: true })
  lastChallengerEloDelta: number | null;

  @Column({ type: 'int', nullable: true })
  lastChallengeeEloDelta: number | null;

  @Column({ nullable: true })
  refResolvedByUserId: string | null;

  @Column({ nullable: true })
  adminResolvedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'refResolvedByUserId' })
  refResolvedBy: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'adminResolvedByUserId' })
  adminResolvedBy: User | null;

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
