import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One-off: reset Elo to initial rating (1000) for all XP ladder participants.
 */
export class ResetXpLeaderboardElo1741100000000 implements MigrationInterface {
  name = 'ResetXpLeaderboardElo1741100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "leaderboard_entries"
      SET "elo" = 1000
      WHERE "xpOptIn" = true
    `);
  }

  public async down(): Promise<void> {
    // Irreversible: previous Elo values were not retained.
  }
}
