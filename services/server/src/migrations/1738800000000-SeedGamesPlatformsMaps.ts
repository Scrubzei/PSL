import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedGamesPlatformsMaps1738800000000 implements MigrationInterface {
  name = 'SeedGamesPlatformsMaps1738800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Seed games
    await queryRunner.query(`
      INSERT INTO "games" ("name") VALUES ('Bo2'), ('Mw3'), ('Mw2'), ('Bo1')
      ON CONFLICT DO NOTHING
    `);

    // Seed platforms
    await queryRunner.query(`
      INSERT INTO "platforms" ("name") VALUES ('Plutonium'), ('IW4X'), ('Xbox'), ('PS3')
      ON CONFLICT DO NOTHING
    `);

    // Seed leaderboards
    await queryRunner.query(`
      INSERT INTO "leaderboards" ("gameId", "platformId")
      SELECT g.id, p.id FROM "games" g, "platforms" p
      WHERE (g.name = 'Bo2' AND p.name IN ('Plutonium', 'Xbox', 'PS3'))
         OR (g.name = 'Mw3' AND p.name IN ('Plutonium', 'Xbox', 'PS3'))
         OR (g.name = 'Mw2' AND p.name IN ('IW4X', 'Xbox', 'PS3'))
         OR (g.name = 'Bo1' AND p.name IN ('Plutonium', 'Xbox', 'PS3'))
      ON CONFLICT DO NOTHING
    `);

    // Seed game maps - Bo2
    await queryRunner.query(`
      INSERT INTO "game_maps" ("gameId", "mapName")
      SELECT g.id, m.name FROM "games" g, (VALUES ('Nuketown'), ('Raid'), ('Carrier'), ('Standoff'), ('Studio'), ('Express')) AS m(name)
      WHERE g.name = 'Bo2'
      ON CONFLICT DO NOTHING
    `);

    // Seed game maps - Mw3
    await queryRunner.query(`
      INSERT INTO "game_maps" ("gameId", "mapName")
      SELECT g.id, m.name FROM "games" g, (VALUES ('Dome'), ('Mission'), ('Terminal'), ('Arkaden')) AS m(name)
      WHERE g.name = 'Mw3'
      ON CONFLICT DO NOTHING
    `);

    // Seed game maps - Mw2
    await queryRunner.query(`
      INSERT INTO "game_maps" ("gameId", "mapName")
      SELECT g.id, m.name FROM "games" g, (VALUES ('Scrapyard'), ('Terminal'), ('Highrise'), ('Rust')) AS m(name)
      WHERE g.name = 'Mw2'
      ON CONFLICT DO NOTHING
    `);

    // Seed game maps - Bo1
    await queryRunner.query(`
      INSERT INTO "game_maps" ("gameId", "mapName")
      SELECT g.id, m.name FROM "games" g, (VALUES ('Nuketown')) AS m(name)
      WHERE g.name = 'Bo1'
      ON CONFLICT DO NOTHING
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "game_maps"`);
    await queryRunner.query(`DELETE FROM "leaderboards"`);
    await queryRunner.query(`DELETE FROM "platforms"`);
    await queryRunner.query(`DELETE FROM "games"`);
  }
}
