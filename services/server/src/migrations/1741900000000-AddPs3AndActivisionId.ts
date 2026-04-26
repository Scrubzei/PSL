import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPs3AndActivisionId1741900000000 implements MigrationInterface {
  name = 'AddPs3AndActivisionId1741900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "ps3Username" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "activisionId" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "activisionId"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "ps3Username"`);
  }
}
