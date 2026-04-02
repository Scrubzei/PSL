import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMatchAcceptedAt1741200000000 implements MigrationInterface {
  name = 'AddMatchAcceptedAt1741200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "matches"
      ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP WITH TIME ZONE
    `);
    await queryRunner.query(`
      ALTER TABLE "matches"
      ADD COLUMN IF NOT EXISTS "rankedLadderApplied" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "matches"
      DROP COLUMN IF EXISTS "rankedLadderApplied"
    `);
    await queryRunner.query(`
      ALTER TABLE "matches"
      DROP COLUMN IF EXISTS "acceptedAt"
    `);
  }
}
