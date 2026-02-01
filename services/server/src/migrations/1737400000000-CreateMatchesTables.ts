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
