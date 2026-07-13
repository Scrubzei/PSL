import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Team } from './team.entity';

export type InviteStatus = 'pending' | 'accepted' | 'declined';

@Entity('team_invites')
export class TeamInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  teamId: string;

  @ManyToOne(() => Team, (t) => t.invites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @Column()
  invitedUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'invitedUserId' })
  invitedUser: User;

  @Column()
  invitedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'invitedByUserId' })
  invitedBy: User;

  @Column({ default: 'pending' })
  status: InviteStatus;

  @CreateDateColumn()
  createdAt: Date;
}
