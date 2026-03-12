import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCrossPlatform1740200000000 implements MigrationInterface {
  name = 'AddCrossPlatform1740200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add Cross-Platform platform
    await queryRunner.query(`
      INSERT INTO "platforms" ("name") VALUES ('Cross-Platform')
      ON CONFLICT DO NOTHING
    `);

    // Create cross-platform leaderboards for each game
    await queryRunner.query(`
      INSERT INTO "leaderboards" ("gameId", "platformId")
      SELECT g.id, p.id FROM "games" g, "platforms" p
      WHERE p.name = 'Cross-Platform'
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "leaderboards" WHERE "platformId" IN (
        SELECT id FROM "platforms" WHERE name = 'Cross-Platform'
      )
    `);
    await queryRunner.query(`DELETE FROM "platforms" WHERE name = 'Cross-Platform'`);
  }
}
