import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMW20191740300000000 implements MigrationInterface {
  name = 'AddMW20191740300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add MW 2019 game
    await queryRunner.query(`
      INSERT INTO "games" ("name") VALUES ('MW 2019')
      ON CONFLICT DO NOTHING
    `);

    // Create cross-platform leaderboard
    await queryRunner.query(`
      INSERT INTO "leaderboards" ("gameId", "platformId")
      SELECT g.id, p.id FROM "games" g, "platforms" p
      WHERE g.name = 'MW 2019' AND p.name = 'Cross-Platform'
      ON CONFLICT DO NOTHING
    `);

    // Seed Gunfight / 1v1 maps
    await queryRunner.query(`
      INSERT INTO "game_maps" ("gameId", "mapName")
      SELECT g.id, m.name FROM "games" g, (VALUES
        ('Speedball'),
        ('King'),
        ('Pine'),
        ('Stack'),
        ('Docks'),
        ('Hill'),
        ('Gulag Showers'),
        ('Livestock'),
        ('Bazaar'),
        ('Trench'),
        ('Atrium'),
        ('Rust')
      ) AS m(name)
      WHERE g.name = 'MW 2019'
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "game_maps" WHERE "gameId" IN (
        SELECT id FROM "games" WHERE name = 'MW 2019'
      )
    `);
    await queryRunner.query(`
      DELETE FROM "leaderboards" WHERE "gameId" IN (
        SELECT id FROM "games" WHERE name = 'MW 2019'
      )
    `);
    await queryRunner.query(`DELETE FROM "games" WHERE name = 'MW 2019'`);
  }
}
