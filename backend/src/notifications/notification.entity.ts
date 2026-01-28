import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { User } from '../users/user.entity';

export type NotificationType =
  | 'CHALLENGE_RECEIVED'
  | 'CHALLENGE_ACCEPTED'
  | 'CHALLENGE_DECLINED'
  | 'CHALLENGE_CANCELLED'
  | 'MATCH_COMPLETED'
  | 'MATCH_DISPUTED'
  | 'DISPUTE_RESOLVED';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  type: NotificationType;

  @Column()
  title: string;

  @Column()
  message: string;

  @Column({ nullable: true })
  relatedEntityId: string;

  @Column({ nullable: true })
  relatedEntityType: string;

  @Column({ default: false })
  isRead: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
