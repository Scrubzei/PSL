import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMatchResultReporting1737600000000 implements MigrationInterface {
  name = 'AddMatchResultReporting1737600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add columns for each player's reported winner
    await queryRunner.query(`
      ALTER TABLE "matches"
      ADD COLUMN "challengerReportedWinnerId" uuid,
      ADD COLUMN "challengeeReportedWinnerId" uuid,
      ADD COLUMN "challengerReportedMapResults" jsonb,
      ADD COLUMN "challengeeReportedMapResults" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "matches"
      DROP COLUMN "challengerReportedWinnerId",
      DROP COLUMN "challengeeReportedWinnerId",
      DROP COLUMN "challengerReportedMapResults",
      DROP COLUMN "challengeeReportedMapResults"
    `);
  }
}
