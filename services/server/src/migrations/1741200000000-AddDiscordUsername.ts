import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDiscordUsername1741200000000 implements MigrationInterface {
  name = 'AddDiscordUsername1741200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "discordUsername" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "discordUsername"
    `);
  }
}
