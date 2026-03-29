import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type UserRole = 'player' | 'ref' | 'admin';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  username: string;

  @Column({ default: 'player' })
  role: UserRole;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true, unique: true })
  discordId: string;

  @Column({ nullable: true })
  plutoniumUsername: string;

  @Column({ nullable: true, unique: true })
  plutoId: string;

  @Column({ nullable: true })
  xboxGamertag: string;

  @Column({ nullable: true })
  emblem: string;

  @Column({ default: 0 })
  goldTrophies: number;

  @Column({ default: 0 })
  silverTrophies: number;

  @Column({ default: 0 })
  bronzeTrophies: number;

  @Column({ default: 0 })
  hofTrophies: number;

  @Column({ default: false })
  hallOfFame: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
