import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPsnUsername1742900000000 implements MigrationInterface {
  name = 'AddPsnUsername1742900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // PlayStation (PSN) username, used for PS4/PS5 tournaments.
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "psnUsername" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "psnUsername"
    `);
  }
}
