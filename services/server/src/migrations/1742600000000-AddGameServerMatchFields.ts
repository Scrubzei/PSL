import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGameServerMatchFields1742600000000 implements MigrationInterface {
  name = 'AddGameServerMatchFields1742600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "game_servers"
        ADD COLUMN "player1PlutoId" character varying,
        ADD COLUMN "player2PlutoId" character varying,
        ADD COLUMN "player1DiscordId" character varying,
        ADD COLUMN "player2DiscordId" character varying,
        ADD COLUMN "player1PlutoUsername" character varying,
        ADD COLUMN "player2PlutoUsername" character varying,
        ADD COLUMN "threadId" character varying,
        ADD COLUMN "leaderboardId" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "game_servers"
        DROP COLUMN IF EXISTS "player1PlutoId",
        DROP COLUMN IF EXISTS "player2PlutoId",
        DROP COLUMN IF EXISTS "player1DiscordId",
        DROP COLUMN IF EXISTS "player2DiscordId",
        DROP COLUMN IF EXISTS "player1PlutoUsername",
        DROP COLUMN IF EXISTS "player2PlutoUsername",
        DROP COLUMN IF EXISTS "threadId",
        DROP COLUMN IF EXISTS "leaderboardId"
    `);
  }
}
