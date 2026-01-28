import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDiscordAuth1737800000000 implements MigrationInterface {
  name = 'AddDiscordAuth1737800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add discordId column (nullable, unique)
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "discordId" character varying UNIQUE
    `);

    // Add discordAvatar column (nullable)
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "discordAvatar" character varying
    `);

    // Make password nullable (for Discord-only users)
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL
    `);

    // Make username nullable (set after OAuth)
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL
    `);

    // Create index on discordId for faster lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_discordId" ON "users" ("discordId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_discordId"`);

    // Make username required again
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL
    `);

    // Make password required again
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL
    `);

    // Remove discordAvatar column
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "discordAvatar"
    `);

    // Remove discordId column
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "discordId"
    `);
  }
}
