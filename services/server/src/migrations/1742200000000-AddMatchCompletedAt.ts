import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMatchCompletedAt1742200000000 implements MigrationInterface {
  name = 'AddMatchCompletedAt1742200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "matches" ADD "completedAt" TIMESTAMP`);
    // Backfill: set completedAt to updatedAt for all completed matches
    await queryRunner.query(`UPDATE "matches" SET "completedAt" = "updatedAt" WHERE status = 'COMPLETED' AND "completedAt" IS NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "completedAt"`);
  }
}
