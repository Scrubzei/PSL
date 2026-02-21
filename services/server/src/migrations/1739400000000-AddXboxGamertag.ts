import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddXboxGamertag1739400000000 implements MigrationInterface {
  name = 'AddXboxGamertag1739400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "xboxGamertag" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "xboxGamertag"
    `);
  }
}
