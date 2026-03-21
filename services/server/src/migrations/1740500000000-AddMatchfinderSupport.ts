import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMatchfinderSupport1740500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "matches" ALTER COLUMN "challengeeId" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "matches" ALTER COLUMN "challengeeId" SET NOT NULL`);
  }
}
