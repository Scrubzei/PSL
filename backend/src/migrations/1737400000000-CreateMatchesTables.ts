import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMatchesTables1737400000000 implements MigrationInterface {
  name = 'CreateMatchesTables1737400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create games table
    await queryRunner.query(`
      CREATE TABLE "games" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_games_name" UNIQUE ("name"),
        CONSTRAINT "PK_games_id" PRIMARY KEY ("id")
      )
    `);

    // Create platforms table
    await queryRunner.query(`
      CREATE TABLE "platforms" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_platforms_name" UNIQUE ("name"),
        CONSTRAINT "PK_platforms_id" PRIMARY KEY ("id")
      )
    `);

    // Create leaderboards table
    await queryRunner.query(`
      CREATE TABLE "leaderboards" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "gameId" uuid NOT NULL,
        "platformId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_leaderboards_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_leaderboards_game" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_leaderboards_platform" FOREIGN KEY ("platformId") REFERENCES "platforms"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_leaderboards_game_platform" UNIQUE ("gameId", "platformId")
      )
    `);

    // Create leaderboard_entries table
    await queryRunner.query(`
      CREATE TABLE "leaderboard_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "leaderboardId" uuid NOT NULL,
        "xp" integer NOT NULL DEFAULT 0,
        "rankScore" integer NOT NULL DEFAULT 1000,
        "wins" integer NOT NULL DEFAULT 0,
        "losses" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_leaderboard_entries_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_leaderboard_entries_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_leaderboard_entries_leaderboard" FOREIGN KEY ("leaderboardId") REFERENCES "leaderboards"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_leaderboard_entries_user_leaderboard" UNIQUE ("userId", "leaderboardId")
      )
    `);

    // Create matches table
    await queryRunner.query(`
      CREATE TABLE "matches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "challengerId" uuid NOT NULL,
        "challengeeId" uuid NOT NULL,
        "middlemanId" uuid,
        "leaderboardId" uuid NOT NULL,
        "type" character varying NOT NULL,
        "wagerAmount" decimal(10,2),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_matches_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_matches_challenger" FOREIGN KEY ("challengerId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_matches_challengee" FOREIGN KEY ("challengeeId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_matches_middleman" FOREIGN KEY ("middlemanId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_matches_leaderboard" FOREIGN KEY ("leaderboardId") REFERENCES "leaderboards"("id") ON DELETE CASCADE
      )
    `);

    // Create game_maps table
    await queryRunner.query(`
      CREATE TABLE "game_maps" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "gameId" uuid NOT NULL,
        "mapName" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_game_maps_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_game_maps_game" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE
      )
    `);

    // Seed games
    await queryRunner.query(`
      INSERT INTO "games" ("name") VALUES ('Bo2'), ('Mw3'), ('Mw2'), ('Bo1')
    `);

    // Seed platforms
    await queryRunner.query(`
      INSERT INTO "platforms" ("name") VALUES ('Plutonium'), ('Xbox'), ('PS3')
    `);

    // Seed leaderboards
    await queryRunner.query(`
      INSERT INTO "leaderboards" ("gameId", "platformId")
      SELECT g.id, p.id FROM "games" g, "platforms" p
      WHERE (g.name = 'Bo2' AND p.name IN ('Plutonium', 'Xbox', 'PS3'))
         OR (g.name = 'Mw3' AND p.name IN ('Plutonium', 'Xbox', 'PS3'))
         OR (g.name = 'Mw2' AND p.name IN ('Xbox', 'PS3'))
         OR (g.name = 'Bo1' AND p.name IN ('Plutonium', 'Xbox', 'PS3'))
    `);

    // Seed game maps - Bo2
    await queryRunner.query(`
      INSERT INTO "game_maps" ("gameId", "mapName")
      SELECT g.id, m.name FROM "games" g, (VALUES ('Nuketown'), ('Raid'), ('Carrier'), ('Standoff'), ('Studio'), ('Express')) AS m(name)
      WHERE g.name = 'Bo2'
    `);

    // Seed game maps - Mw3
    await queryRunner.query(`
      INSERT INTO "game_maps" ("gameId", "mapName")
      SELECT g.id, m.name FROM "games" g, (VALUES ('Dome'), ('Mission'), ('Terminal'), ('Arkaden')) AS m(name)
      WHERE g.name = 'Mw3'
    `);

    // Seed game maps - Mw2
    await queryRunner.query(`
      INSERT INTO "game_maps" ("gameId", "mapName")
      SELECT g.id, m.name FROM "games" g, (VALUES ('Scrapyard'), ('Terminal'), ('Highrise'), ('Rust')) AS m(name)
      WHERE g.name = 'Mw2'
    `);

    // Seed game maps - Bo1
    await queryRunner.query(`
      INSERT INTO "game_maps" ("gameId", "mapName")
      SELECT g.id, m.name FROM "games" g, (VALUES ('Nuketown')) AS m(name)
      WHERE g.name = 'Bo1'
    `);

    // Seed leaderboard entries for Bo2 Plutonium (first 10 users)
    // These are the original Bo2 players with varied stats
    const bo2Players = [
      { username: 'Scrubzei', xp: 15420, rankScore: 1850, wins: 87, losses: 12 },
      { username: 'Relxa', xp: 14200, rankScore: 1780, wins: 72, losses: 18 },
      { username: 'Spartuns', xp: 12350, rankScore: 1720, wins: 65, losses: 22 },
      { username: 'Bxvonn', xp: 11200, rankScore: 1680, wins: 58, losses: 26 },
      { username: 'Relvic', xp: 9800, rankScore: 1590, wins: 52, losses: 30 },
      { username: 'Tezhify', xp: 9500, rankScore: 1560, wins: 55, losses: 20 },
      { username: 'Chroma', xp: 8200, rankScore: 1480, wins: 45, losses: 32 },
      { username: 'Dufuzz', xp: 7600, rankScore: 1450, wins: 42, losses: 38 },
      { username: 'Slxep', xp: 6200, rankScore: 1380, wins: 35, losses: 42 },
      { username: 'Bylarus', xp: 5100, rankScore: 1290, wins: 28, losses: 45 },
      { username: 'Countxr', xp: 4300, rankScore: 1150, wins: 22, losses: 52 },
      { username: 'Aylo', xp: 3500, rankScore: 1120, wins: 18, losses: 48 },
    ];

    for (const player of bo2Players) {
      await queryRunner.query(`
        INSERT INTO "leaderboard_entries" ("userId", "leaderboardId", "xp", "rankScore", "wins", "losses")
        SELECT u.id, l.id, $1, $2, $3, $4
        FROM "users" u, "leaderboards" l
        JOIN "games" g ON l."gameId" = g.id
        JOIN "platforms" p ON l."platformId" = p.id
        WHERE u.username = $5 AND g.name = 'Bo2' AND p.name = 'Plutonium'
      `, [player.xp, player.rankScore, player.wins, player.losses, player.username]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "matches"`);
    await queryRunner.query(`DROP TABLE "leaderboard_entries"`);
    await queryRunner.query(`DROP TABLE "leaderboards"`);
    await queryRunner.query(`DROP TABLE "game_maps"`);
    await queryRunner.query(`DROP TABLE "platforms"`);
    await queryRunner.query(`DROP TABLE "games"`);
  }
}
