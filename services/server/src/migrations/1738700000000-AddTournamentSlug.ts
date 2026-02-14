import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTournamentSlug1738700000000 implements MigrationInterface {
  name = 'AddTournamentSlug1738700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add nullable slug column first so existing rows don't fail
    await queryRunner.query(`
      ALTER TABLE "tournaments"
      ADD COLUMN "slug" varchar
    `);

    // Backfill existing tournaments with a slug derived from their name
    await queryRunner.query(`
      UPDATE "tournaments"
      SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE("name", '[^a-zA-Z0-9\\s-]', '', 'g'), '\\s+', '-', 'g'))
      WHERE "slug" IS NULL
    `);

    // Handle any duplicate slugs by appending first 4 chars of UUID
    await queryRunner.query(`
      UPDATE "tournaments" t
      SET "slug" = t."slug" || '-' || SUBSTRING(t."id"::text, 1, 4)
      WHERE t."slug" IN (
        SELECT "slug" FROM "tournaments" GROUP BY "slug" HAVING COUNT(*) > 1
      )
    `);

    // Make NOT NULL
    await queryRunner.query(`
      ALTER TABLE "tournaments"
      ALTER COLUMN "slug" SET NOT NULL
    `);

    // Add unique constraint and index
    await queryRunner.query(`
      ALTER TABLE "tournaments"
      ADD CONSTRAINT "uq_tournament_slug" UNIQUE ("slug")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tournament_slug" ON "tournaments"("slug")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_tournament_slug"`);
    await queryRunner.query(`ALTER TABLE "tournaments" DROP CONSTRAINT "uq_tournament_slug"`);
    await queryRunner.query(`ALTER TABLE "tournaments" DROP COLUMN "slug"`);
  }
}
