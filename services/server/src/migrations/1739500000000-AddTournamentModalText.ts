import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTournamentModalText1739500000000 implements MigrationInterface {
  name = 'AddTournamentModalText1739500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "howItWorks" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "disqualifications" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tournaments" DROP COLUMN IF EXISTS "disqualifications"
    `);
    await queryRunner.query(`
      ALTER TABLE "tournaments" DROP COLUMN IF EXISTS "howItWorks"
    `);
  }
}
