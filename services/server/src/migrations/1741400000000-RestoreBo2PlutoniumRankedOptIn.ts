import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Re-enables ranked opt-in on Bo2 Plutonium for players who still have ranked placement (rankScore > 0).
 * - Undoes RemoveUserFromBo2PlutoniumRanked1740900000000 for the affected account(s).
 * - XP-only entries use rankScore 0; default rankScore is 1000 — we only restore when rankScore > 1000
 *   so real ladder placement (seeded players) is restored without flipping ambiguous defaults.
 */
export class RestoreBo2PlutoniumRankedOptIn1741400000000 implements MigrationInterface {
  name = 'RestoreBo2PlutoniumRankedOptIn1741400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "leaderboard_entries" le
      SET "rankedOptIn" = true
      FROM "leaderboards" l
      INNER JOIN "games" g ON g.id = l."gameId"
      INNER JOIN "platforms" p ON p.id = l."platformId"
      WHERE le."leaderboardId" = l.id
        AND LOWER(g.name) = 'bo2' AND LOWER(p.name) = 'plutonium'
        AND le."rankedOptIn" = false
        AND le."rankScore" > 1000
    `);
  }

  public async down(): Promise<void> {
    // Irreversible: cannot know which rows were false before this migration.
  }
}
