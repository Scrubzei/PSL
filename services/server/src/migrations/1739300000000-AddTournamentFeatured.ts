import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTournamentFeatured1739300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tournaments" ADD "isFeatured" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tournaments" DROP COLUMN "isFeatured"`,
    );
  }
}
