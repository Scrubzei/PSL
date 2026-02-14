import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Tournament } from './tournament.entity';
import { User } from '../users/user.entity';

@Entity('tournament_participants')
@Unique(['tournamentId', 'userId'])
export class TournamentParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tournamentId: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  seed: number;

  @Column({ default: false })
  eliminated: boolean;

  @ManyToOne(() => Tournament, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournamentId' })
  tournament: Tournament;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'timestamp', nullable: true })
  withdrawnAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
