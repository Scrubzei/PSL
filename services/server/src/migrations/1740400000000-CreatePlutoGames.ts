import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlutoGames1740400000000 implements MigrationInterface {
  name = 'CreatePlutoGames1740400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "pluto_games" (
        "id" SERIAL PRIMARY KEY,
        "player1Id" TEXT NOT NULL,
        "player1Name" TEXT NOT NULL,
        "player2Id" TEXT NOT NULL,
        "player2Name" TEXT NOT NULL,
        "player1Score" INTEGER NOT NULL DEFAULT 0,
        "player2Score" INTEGER NOT NULL DEFAULT 0,
        "winnerId" TEXT,
        "mapName" TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "pluto_games"`);
  }
}
