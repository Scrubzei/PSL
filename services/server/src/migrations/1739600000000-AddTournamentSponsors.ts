import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTournamentSponsors1739600000000 implements MigrationInterface {
  name = 'AddTournamentSponsors1739600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "sponsors" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tournaments" DROP COLUMN IF EXISTS "sponsors"
    `);
  }
}
