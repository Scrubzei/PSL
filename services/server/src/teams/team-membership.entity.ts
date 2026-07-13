import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Team } from './team.entity';

export type MemberRole = 'captain' | 'member';

@Entity('team_memberships')
@Unique(['teamId', 'userId'])
export class TeamMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  teamId: string;

  @ManyToOne(() => Team, (t) => t.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ default: 'member' })
  role: MemberRole;

  @CreateDateColumn()
  joinedAt: Date;
}
