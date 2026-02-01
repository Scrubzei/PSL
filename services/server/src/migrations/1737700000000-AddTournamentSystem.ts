import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTournamentSystem1737700000000 implements MigrationInterface {
  name = 'AddTournamentSystem1737700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add role to users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "role" varchar(20) DEFAULT 'player' NOT NULL
    `);

    // Add avatar column to users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "avatar" varchar(500)
    `);

    // Add trophy columns to users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "goldTrophies" integer DEFAULT 0 NOT NULL,
      ADD COLUMN "silverTrophies" integer DEFAULT 0 NOT NULL,
      ADD COLUMN "bronzeTrophies" integer DEFAULT 0 NOT NULL
    `);

    // Add Hall of Fame trophy column
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "hofTrophies" integer DEFAULT 0 NOT NULL
    `);

    // Add Hall of Fame column
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "hallOfFame" boolean DEFAULT false NOT NULL
    `);

    // Set Hall of Fame players and their HOF trophies
    await queryRunner.query(`
      UPDATE "users" SET "hallOfFame" = true, "hofTrophies" = 3 WHERE "username" = 'Scrubzei'
    `);
    await queryRunner.query(`
      UPDATE "users" SET "hallOfFame" = true, "hofTrophies" = 2 WHERE "username" = 'Relxa'
    `);
    await queryRunner.query(`
      UPDATE "users" SET "hallOfFame" = true, "hofTrophies" = 1 WHERE "username" = 'Tezhify'
    `);

    // Set Scrubzei as admin
    await queryRunner.query(`
      UPDATE "users" SET "role" = 'admin' WHERE "username" = 'Scrubzei'
    `);

    // Assign Xbox 360 gamer pics to users
    const avatars = [
      { username: 'Scrubzei', avatar: '/assets/avatars/helmet.jpeg' },
      { username: 'Relxa', avatar: '/assets/avatars/gears of war.jpeg' },
      { username: 'Countxr', avatar: '/assets/avatars/dragon.jpeg' },
      { username: 'Spartuns', avatar: '/assets/avatars/gears of war.jpeg' },
      { username: 'Bxvonn', avatar: '/assets/avatars/monkey.jpeg' },
      { username: 'Relvic', avatar: '/assets/avatars/smiley.jpeg' },
      { username: 'Chroma', avatar: '/assets/avatars/skater boi.webp' },
      { username: 'Dufuzz', avatar: '/assets/avatars/dog.jpeg' },
      { username: 'Slxep', avatar: '/assets/avatars/panda.jpeg' },
      { username: 'Bylarus', avatar: '/assets/avatars/pirate.avif' },
      { username: 'Aylo', avatar: '/assets/avatars/soccer.jpeg' },
      { username: 'Tezhify', avatar: '/assets/avatars/egirl.avif' },
      { username: 'CoLd Qs', avatar: '/assets/avatars/dragon.jpeg' },
      { username: 'All Killfeed', avatar: '/assets/avatars/helmet.jpeg' },
      { username: 'Try to 1v1 me', avatar: '/assets/avatars/monkey.jpeg' },
      { username: 'v Visionaryz', avatar: '/assets/avatars/smiley.jpeg' },
      { username: 'Cvoxo', avatar: '/assets/avatars/dog.jpeg' },
      { username: 'VeXzioNz', avatar: '/assets/avatars/panda.jpeg' },
      { username: 'Sichology', avatar: '/assets/avatars/pirate.avif' },
      { username: 'Vertiqul', avatar: '/assets/avatars/soccer.jpeg' },
      { username: 'Prime xCash Son', avatar: '/assets/avatars/skater boi.webp' },
    ];

    for (const { username, avatar } of avatars) {
      await queryRunner.query(
        `UPDATE "users" SET "avatar" = $1 WHERE "username" = $2`,
        [avatar, username]
      );
    }

    // Assign trophies to players based on their skill level
    const trophies = [
      { username: 'Scrubzei', gold: 8, silver: 4, bronze: 2 },
      { username: 'Relxa', gold: 6, silver: 5, bronze: 3 },
      { username: 'Spartuns', gold: 5, silver: 6, bronze: 3 },
      { username: 'Bxvonn', gold: 4, silver: 5, bronze: 4 },
      { username: 'Relvic', gold: 3, silver: 4, bronze: 5 },
      { username: 'Tezhify', gold: 2, silver: 5, bronze: 3 },
      { username: 'Chroma', gold: 2, silver: 3, bronze: 4 },
      { username: 'Dufuzz', gold: 1, silver: 3, bronze: 5 },
      { username: 'Slxep', gold: 1, silver: 2, bronze: 4 },
      { username: 'Bylarus', gold: 0, silver: 2, bronze: 3 },
      { username: 'Countxr', gold: 0, silver: 1, bronze: 2 },
      { username: 'Aylo', gold: 0, silver: 1, bronze: 2 },
    ];

    for (const { username, gold, silver, bronze } of trophies) {
      await queryRunner.query(
        `UPDATE "users" SET "goldTrophies" = $1, "silverTrophies" = $2, "bronzeTrophies" = $3 WHERE "username" = $4`,
        [gold, silver, bronze, username]
      );
    }

    // Create tournaments table
    await queryRunner.query(`
      CREATE TABLE "tournaments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "description" varchar,
        "gameId" uuid NOT NULL,
        "platformId" uuid NOT NULL,
        "format" varchar NOT NULL DEFAULT 'SINGLE_ELIMINATION',
        "maxParticipants" int NOT NULL,
        "status" varchar NOT NULL DEFAULT 'REGISTRATION',
        "createdById" uuid NOT NULL,
        "registrationDeadline" timestamp,
        "startDate" timestamp,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now(),
        CONSTRAINT "fk_tournament_game" FOREIGN KEY ("gameId") REFERENCES "games"("id"),
        CONSTRAINT "fk_tournament_platform" FOREIGN KEY ("platformId") REFERENCES "platforms"("id"),
        CONSTRAINT "fk_tournament_creator" FOREIGN KEY ("createdById") REFERENCES "users"("id")
      )
    `);

    // Create tournament_participants table
    await queryRunner.query(`
      CREATE TABLE "tournament_participants" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tournamentId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "seed" int,
        "eliminated" boolean DEFAULT false,
        "createdAt" timestamp DEFAULT now(),
        CONSTRAINT "fk_participant_tournament" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_participant_user" FOREIGN KEY ("userId") REFERENCES "users"("id"),
        CONSTRAINT "uq_participant_tournament_user" UNIQUE ("tournamentId", "userId")
      )
    `);

    // Create tournament_matches table
    await queryRunner.query(`
      CREATE TABLE "tournament_matches" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tournamentId" uuid NOT NULL,
        "round" int NOT NULL,
        "matchNumber" int NOT NULL,
        "player1Id" uuid,
        "player2Id" uuid,
        "winnerId" uuid,
        "status" varchar NOT NULL DEFAULT 'PENDING',
        "nextMatchId" uuid,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now(),
        CONSTRAINT "fk_match_tournament" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_match_player1" FOREIGN KEY ("player1Id") REFERENCES "users"("id"),
        CONSTRAINT "fk_match_player2" FOREIGN KEY ("player2Id") REFERENCES "users"("id"),
        CONSTRAINT "fk_match_winner" FOREIGN KEY ("winnerId") REFERENCES "users"("id"),
        CONSTRAINT "fk_match_next" FOREIGN KEY ("nextMatchId") REFERENCES "tournament_matches"("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "idx_tournament_status" ON "tournaments"("status")`);
    await queryRunner.query(`CREATE INDEX "idx_participant_tournament" ON "tournament_participants"("tournamentId")`);
    await queryRunner.query(`CREATE INDEX "idx_match_tournament" ON "tournament_matches"("tournamentId")`);

    // Create default tournament (Bo2 Plutonium Championship) created by Scrubzei
    await queryRunner.query(`
      INSERT INTO "tournaments" ("name", "description", "gameId", "platformId", "format", "maxParticipants", "status", "createdById")
      SELECT
        'Bo2 Plutonium Championship',
        'The ultimate Black Ops 2 tournament on Plutonium. 16 players battle it out for glory!',
        g.id,
        p.id,
        'SINGLE_ELIMINATION',
        16,
        'REGISTRATION',
        u.id
      FROM "games" g, "platforms" p, "users" u
      WHERE g.name = 'Bo2' AND p.name = 'Plutonium' AND u.username = 'Scrubzei'
    `);

    // Sign up 16 users for the tournament
    const participants = [
      'Scrubzei', 'Relxa', 'Spartuns', 'Bxvonn', 'Relvic', 'Chroma', 'Dufuzz', 'Slxep',
      'Bylarus', 'Aylo', 'Tezhify', 'Countxr', 'CoLd Qs', 'All Killfeed', 'Try to 1v1 me', 'v Visionaryz'
    ];

    for (const username of participants) {
      await queryRunner.query(`
        INSERT INTO "tournament_participants" ("tournamentId", "userId")
        SELECT t.id, u.id
        FROM "tournaments" t, "users" u
        WHERE t.name = 'Bo2 Plutonium Championship' AND u.username = $1
      `, [username]);
    }

    // Add completed matches for all players
    const seedMatches = [
      // Scrubzei matches (dominant player)
      { challenger: 'Scrubzei', challengee: 'Relxa', winner: 'Scrubzei' },
      { challenger: 'Scrubzei', challengee: 'Spartuns', winner: 'Scrubzei' },
      { challenger: 'Scrubzei', challengee: 'Bxvonn', winner: 'Scrubzei' },
      { challenger: 'Scrubzei', challengee: 'Relvic', winner: 'Scrubzei' },
      { challenger: 'Relxa', challengee: 'Scrubzei', winner: 'Relxa' },

      // Relxa matches (rank 2, 80% win rate)
      { challenger: 'Relxa', challengee: 'Spartuns', winner: 'Relxa' },
      { challenger: 'Relxa', challengee: 'Bxvonn', winner: 'Relxa' },
      { challenger: 'Relxa', challengee: 'Relvic', winner: 'Relxa' },
      { challenger: 'Relxa', challengee: 'Tezhify', winner: 'Relxa' },
      { challenger: 'Relxa', challengee: 'Chroma', winner: 'Relxa' },
      { challenger: 'Relxa', challengee: 'Countxr', winner: 'Relxa' },
      { challenger: 'Spartuns', challengee: 'Relxa', winner: 'Spartuns' },

      // Spartuns matches
      { challenger: 'Spartuns', challengee: 'Bxvonn', winner: 'Spartuns' },
      { challenger: 'Spartuns', challengee: 'Relvic', winner: 'Spartuns' },
      { challenger: 'Spartuns', challengee: 'Chroma', winner: 'Spartuns' },
      { challenger: 'Spartuns', challengee: 'Countxr', winner: 'Spartuns' },
      { challenger: 'Bxvonn', challengee: 'Spartuns', winner: 'Bxvonn' },

      // Bxvonn matches
      { challenger: 'Bxvonn', challengee: 'Relvic', winner: 'Bxvonn' },
      { challenger: 'Bxvonn', challengee: 'Tezhify', winner: 'Bxvonn' },
      { challenger: 'Bxvonn', challengee: 'Countxr', winner: 'Bxvonn' },
      { challenger: 'Relvic', challengee: 'Bxvonn', winner: 'Relvic' },

      // Relvic matches
      { challenger: 'Relvic', challengee: 'Tezhify', winner: 'Relvic' },
      { challenger: 'Relvic', challengee: 'Chroma', winner: 'Relvic' },
      { challenger: 'Relvic', challengee: 'Countxr', winner: 'Relvic' },
      { challenger: 'Tezhify', challengee: 'Relvic', winner: 'Tezhify' },

      // Tezhify matches
      { challenger: 'Tezhify', challengee: 'Chroma', winner: 'Tezhify' },
      { challenger: 'Tezhify', challengee: 'Dufuzz', winner: 'Tezhify' },
      { challenger: 'Tezhify', challengee: 'Countxr', winner: 'Tezhify' },
      { challenger: 'Chroma', challengee: 'Tezhify', winner: 'Chroma' },

      // Chroma matches
      { challenger: 'Chroma', challengee: 'Dufuzz', winner: 'Chroma' },
      { challenger: 'Chroma', challengee: 'Slxep', winner: 'Chroma' },
      { challenger: 'Chroma', challengee: 'Countxr', winner: 'Chroma' },
      { challenger: 'Dufuzz', challengee: 'Chroma', winner: 'Dufuzz' },

      // Dufuzz matches
      { challenger: 'Dufuzz', challengee: 'Slxep', winner: 'Dufuzz' },
      { challenger: 'Dufuzz', challengee: 'Bylarus', winner: 'Dufuzz' },
      { challenger: 'Dufuzz', challengee: 'Countxr', winner: 'Dufuzz' },
      { challenger: 'Slxep', challengee: 'Dufuzz', winner: 'Slxep' },

      // Slxep matches
      { challenger: 'Slxep', challengee: 'Bylarus', winner: 'Slxep' },
      { challenger: 'Slxep', challengee: 'Countxr', winner: 'Slxep' },
      { challenger: 'Bylarus', challengee: 'Slxep', winner: 'Bylarus' },

      // Bylarus matches
      { challenger: 'Bylarus', challengee: 'Countxr', winner: 'Bylarus' },
      { challenger: 'Bylarus', challengee: 'Aylo', winner: 'Bylarus' },
      { challenger: 'Countxr', challengee: 'Bylarus', winner: 'Countxr' },

      // Countxr matches (struggling player - mostly losses)
      { challenger: 'Countxr', challengee: 'Aylo', winner: 'Countxr' },
      { challenger: 'Aylo', challengee: 'Countxr', winner: 'Aylo' },

      // Aylo matches
      { challenger: 'Aylo', challengee: 'Slxep', winner: 'Aylo' },
    ];

    for (const match of seedMatches) {
      await queryRunner.query(`
        INSERT INTO "matches" ("challengerId", "challengeeId", "leaderboardId", "type", "status", "winnerId", "bestOf", "selectedMaps")
        SELECT
          challenger.id,
          challengee.id,
          l.id,
          'RANKED',
          'COMPLETED',
          winner.id,
          3,
          '["Raid", "Standoff"]'::jsonb
        FROM "users" challenger, "users" challengee, "users" winner, "leaderboards" l
        JOIN "games" g ON l."gameId" = g.id
        JOIN "platforms" p ON l."platformId" = p.id
        WHERE challenger.username = $1
          AND challengee.username = $2
          AND winner.username = $3
          AND g.name = 'Bo2'
          AND p.name = 'Plutonium'
      `, [match.challenger, match.challengee, match.winner]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_match_tournament"`);
    await queryRunner.query(`DROP INDEX "idx_participant_tournament"`);
    await queryRunner.query(`DROP INDEX "idx_tournament_status"`);
    await queryRunner.query(`DROP TABLE "tournament_matches"`);
    await queryRunner.query(`DROP TABLE "tournament_participants"`);
    await queryRunner.query(`DROP TABLE "tournaments"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "goldTrophies"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "silverTrophies"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bronzeTrophies"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "hofTrophies"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "hallOfFame"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
  }
}
