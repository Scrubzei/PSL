import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Game } from '../games/game.entity';
import { Platform } from '../platforms/platform.entity';
import { User } from '../users/user.entity';

export type TournamentStatus = 'REGISTRATION' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TournamentFormat = 'SINGLE_ELIMINATION';

@Entity('tournaments')
export class Tournament {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  gameId: string;

  @Column()
  platformId: string;

  @Column({ default: 'SINGLE_ELIMINATION' })
  format: TournamentFormat;

  @Column()
  maxParticipants: number;

  @Column({ default: 'REGISTRATION' })
  status: TournamentStatus;

  @Column()
  createdById: string;

  @Column({ type: 'timestamp', nullable: true })
  registrationDeadline: Date;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @ManyToOne(() => Game)
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @ManyToOne(() => Platform)
  @JoinColumn({ name: 'platformId' })
  platform: Platform;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
