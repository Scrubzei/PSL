import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Column, Unique } from 'typeorm';
import { User } from '../users/user.entity';
import { Leaderboard } from './leaderboard.entity';

@Entity('leaderboard_entries')
@Unique(['userId', 'leaderboardId'])
export class LeaderboardEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  leaderboardId: string;

  @Column({ default: 0 })
  xp: number;

  @Column({ default: 1000 })
  rankScore: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Leaderboard)
  @JoinColumn({ name: 'leaderboardId' })
  leaderboard: Leaderboard;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
