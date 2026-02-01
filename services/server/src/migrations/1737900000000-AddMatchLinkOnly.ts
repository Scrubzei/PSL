import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMatchLinkOnly1737900000000 implements MigrationInterface {
  name = 'AddMatchLinkOnly1737900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add linkOnly column (default false)
    await queryRunner.query(`
      ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "linkOnly" boolean NOT NULL DEFAULT false
    `);

    // Add shareToken column (nullable, unique)
    await queryRunner.query(`
      ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "shareToken" character varying UNIQUE
    `);

    // Create index on shareToken for faster lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_matches_shareToken" ON "matches" ("shareToken")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_matches_shareToken"`);

    // Remove shareToken column
    await queryRunner.query(`
      ALTER TABLE "matches" DROP COLUMN IF EXISTS "shareToken"
    `);

    // Remove linkOnly column
    await queryRunner.query(`
      ALTER TABLE "matches" DROP COLUMN IF EXISTS "linkOnly"
    `);
  }
}
