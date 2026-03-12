import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTournamentMatchScheduledTime1740000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tournament_matches" ADD COLUMN "scheduledTime" timestamp`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tournament_matches" DROP COLUMN "scheduledTime"`,
    );
  }
}
