import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRankedOptIn1740800000000 implements MigrationInterface {
  name = 'AddRankedOptIn1740800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "leaderboard_entries" ADD "rankedOptIn" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leaderboard_entries" DROP COLUMN "rankedOptIn"`);
  }
}
