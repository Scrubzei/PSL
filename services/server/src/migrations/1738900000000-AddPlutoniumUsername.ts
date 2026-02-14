import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlutoniumUsername1738900000000 implements MigrationInterface {
  name = 'AddPlutoniumUsername1738900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "plutoniumUsername" varchar
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "plutoniumUsername"
    `);
  }
}
