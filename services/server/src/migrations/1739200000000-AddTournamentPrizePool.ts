import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTournamentPrizePool1739200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tournaments" ADD "prizePool" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tournaments" DROP COLUMN "prizePool"`);
  }
}
