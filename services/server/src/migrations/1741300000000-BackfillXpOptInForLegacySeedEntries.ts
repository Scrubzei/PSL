import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Legacy seed inserts omitted xpOptIn/elo, so rows defaulted to xpOptIn=false.
 * User profiles only show XP challenge when both players have xpOptIn on the same ladder.
 * This backfills typical ranked+XP seed rows (ranked ladder, XP accumulated, no Elo yet).
 */
export class BackfillXpOptInForLegacySeedEntries1741300000000 implements MigrationInterface {
  name = 'BackfillXpOptInForLegacySeedEntries1741300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "leaderboard_entries"
      SET "xpOptIn" = true, "elo" = COALESCE("elo", 1000)
      WHERE "xpOptIn" = false
        AND "elo" IS NULL
        AND "rankedOptIn" = true
        AND "xp" > 0
    `);
  }

  public async down(): Promise<void> {
    // Irreversible: cannot distinguish backfilled rows from intentional state.
  }
}
