import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One-off: remove user from Bo2 Plutonium ranked ladder only; XP (xpOptIn) unchanged.
 */
export class RemoveUserFromBo2PlutoniumRanked1740900000000 implements MigrationInterface {
  name = 'RemoveUserFromBo2PlutoniumRanked1740900000000';

  private readonly userId = '99e60c01-73d1-4a5d-90c1-b9b937e29a49';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE "leaderboard_entries" le
      SET "rankedOptIn" = false
      WHERE le."userId" = $1
        AND le."leaderboardId" = (
          SELECT l.id
          FROM "leaderboards" l
          INNER JOIN "games" g ON g.id = l."gameId"
          INNER JOIN "platforms" p ON p.id = l."platformId"
          WHERE LOWER(g.name) = 'bo2' AND LOWER(p.name) = 'plutonium'
        )
      `,
      [this.userId],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE "leaderboard_entries" le
      SET "rankedOptIn" = true
      WHERE le."userId" = $1
        AND le."leaderboardId" = (
          SELECT l.id
          FROM "leaderboards" l
          INNER JOIN "games" g ON g.id = l."gameId"
          INNER JOIN "platforms" p ON p.id = l."platformId"
          WHERE LOWER(g.name) = 'bo2' AND LOWER(p.name) = 'plutonium'
        )
      `,
      [this.userId],
    );
  }
}
