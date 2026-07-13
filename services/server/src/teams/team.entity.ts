import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { TeamMembership } from './team-membership.entity';
import { TeamInvite } from './team-invite.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ length: 8 })
  tag: string;

  @Column()
  game: string;

  @Column({ default: 'NA' })
  region: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  color: string;

  @Column({ nullable: true })
  bio: string;

  @Column()
  captainId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'captainId' })
  captain: User;

  @OneToMany(() => TeamMembership, (m) => m.team, { cascade: true })
  memberships: TeamMembership[];

  @OneToMany(() => TeamInvite, (i) => i.team, { cascade: true })
  invites: TeamInvite[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
