import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRankedSnapshotBefore1741500000000 implements MigrationInterface {
  name = 'AddRankedSnapshotBefore1741500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "matches"
      ADD COLUMN IF NOT EXISTS "rankedSnapshotBefore" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "matches"
      DROP COLUMN IF EXISTS "rankedSnapshotBefore"
    `);
  }
}
