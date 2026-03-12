import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('pluto_games')
export class PlutoGame {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  player1Id: string;

  @Column({ type: 'text' })
  player1Name: string;

  @Column({ type: 'text' })
  player2Id: string;

  @Column({ type: 'text' })
  player2Name: string;

  @Column({ type: 'int', default: 0 })
  player1Score: number;

  @Column({ type: 'int', default: 0 })
  player2Score: number;

  @Column({ type: 'text', nullable: true })
  winnerId: string;

  @Column({ type: 'text' })
  mapName: string;

  @CreateDateColumn()
  createdAt: Date;
}
