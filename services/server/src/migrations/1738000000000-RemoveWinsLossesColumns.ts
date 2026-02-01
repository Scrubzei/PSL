import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveWinsLossesColumns1738000000000 implements MigrationInterface {
  name = 'RemoveWinsLossesColumns1738000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leaderboard_entries" DROP COLUMN IF EXISTS "wins"`);
    await queryRunner.query(`ALTER TABLE "leaderboard_entries" DROP COLUMN IF EXISTS "losses"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leaderboard_entries" ADD COLUMN "wins" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "leaderboard_entries" ADD COLUMN "losses" integer NOT NULL DEFAULT 0`);
  }
}
