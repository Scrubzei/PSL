import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTournamentRoundDeadlines1739000000000 implements MigrationInterface {
  name = 'AddTournamentRoundDeadlines1739000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tournaments" ADD COLUMN "roundDeadlines" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tournaments" DROP COLUMN "roundDeadlines"
    `);
  }
}
