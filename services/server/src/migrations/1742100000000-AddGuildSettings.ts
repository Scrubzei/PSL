import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGuildSettings1742100000000 implements MigrationInterface {
  name = 'AddGuildSettings1742100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "guild_settings" (
        "guildId" character varying PRIMARY KEY,
        "settings" jsonb NOT NULL DEFAULT '{}',
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "guild_settings"`);
  }
}
