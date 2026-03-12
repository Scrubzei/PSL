import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlutoId1740100000000 implements MigrationInterface {
  name = 'AddPlutoId1740100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "plutoId" varchar UNIQUE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "plutoId"
    `);
  }
}
