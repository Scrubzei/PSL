import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWithdrawalCooldown1739100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tournament_participants" ADD "withdrawnAt" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tournament_participants" DROP COLUMN "withdrawnAt"`);
  }
}
