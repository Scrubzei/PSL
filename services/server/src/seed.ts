import "dotenv/config";
import { AppDataSource } from "./data-source";
async function seed() {
  await AppDataSource.initialize();
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    console.log("Starting seed...");

    const testUsers = [
      // Bo2 Plutonium leaderboard users
      { username: "Scrubzei" },
      { username: "Relxa" },
      { username: "Countxr" },
      { username: "Spartuns" },
      { username: "Bxvonn" },
      { username: "Relvic" },
      { username: "Chroma" },
      { username: "Dufuzz" },
      { username: "Slxep" },
      { username: "Bylarus" },
      { username: "Aylo" },
      { username: "Tezhify" },
      // Bo2 Xbox leaderboard users
      { username: "Wubzei" },
      { username: "Oxentary" },
      { username: "Zapsi" },
      { username: "Steroiz" },
      { username: "Nuketown Traps" },
      { username: "Yelicate" },
      { username: "Flashxng" },
      { username: "Berda" },
      // Bo2 PS3 leaderboard users
      { username: "Hops" },
      { username: "Zargoh" },
      { username: "Azii" },
      { username: "Sparkzei" },
      { username: "Titxnium" },
      { username: "Biosity" },
      { username: "FearMyTalent" },
      { username: "DelusionalTrails" },
      // Mw2 Xbox leaderboard users
      { username: "CoLd Qs" },
      { username: "All Killfeed" },
      { username: "Luis" },
      { username: "Cvoxo" },
      { username: "v Vizionaryz" },
      { username: "Sichology" },
      { username: "VeXzioNz" },
      { username: "Hozay" },
      { username: "School Tests" },
      { username: "VeriquL" },
    ];

    console.log("Seeding users...");
    for (const user of testUsers) {
      await queryRunner.query(
        `INSERT INTO "users" ("username") VALUES ($1) ON CONFLICT DO NOTHING`,
        [user.username],
      );
    }

    // Seed leaderboard entries for Bo2 Plutonium
    console.log("Seeding leaderboard entries...");
    const bo2Players = [
      { username: "Scrubzei", xp: 15420, rankScore: 1850 },
      { username: "Relxa", xp: 14200, rankScore: 1780 },
      { username: "Spartuns", xp: 12350, rankScore: 1720 },
      { username: "Bxvonn", xp: 11200, rankScore: 1680 },
      { username: "Relvic", xp: 9800, rankScore: 1590 },
      { username: "Tezhify", xp: 9500, rankScore: 1560 },
      { username: "Chroma", xp: 8200, rankScore: 1480 },
      { username: "Dufuzz", xp: 7600, rankScore: 1450 },
      { username: "Slxep", xp: 6200, rankScore: 1380 },
      { username: "Bylarus", xp: 5100, rankScore: 1290 },
      { username: "Countxr", xp: 4300, rankScore: 1150 },
      { username: "Aylo", xp: 3500, rankScore: 1120 },
    ];

    for (const player of bo2Players) {
      await queryRunner.query(
        `
        INSERT INTO "leaderboard_entries" ("userId", "leaderboardId", "xp", "rankScore", "xpOptIn", "elo", "rankedOptIn")
        SELECT u.id, l.id, $1, $2, true, 1000, true
        FROM "users" u, "leaderboards" l
        JOIN "games" g ON l."gameId" = g.id
        JOIN "platforms" p ON l."platformId" = p.id
        WHERE u.username = $3 AND g.name = 'Bo2' AND p.name = 'Plutonium'
        ON CONFLICT DO NOTHING
      `,
        [player.xp, player.rankScore, player.username],
      );
    }

    // Seed leaderboard entries for Bo2 Xbox
    console.log("Seeding Xbox Bo2 leaderboard entries...");
    const xboxBo2Players = [
      { username: "Wubzei", xp: 16200, rankScore: 1900 },
      { username: "Relxa", xp: 14800, rankScore: 1820 },
      { username: "Oxentary", xp: 13500, rankScore: 1750 },
      { username: "Zapsi", xp: 12100, rankScore: 1690 },
      { username: "Steroiz", xp: 10800, rankScore: 1620 },
      { username: "Scrubzei", xp: 9600, rankScore: 1560 },
      { username: "Nuketown Traps", xp: 8400, rankScore: 1490 },
      { username: "Yelicate", xp: 7200, rankScore: 1420 },
      { username: "Flashxng", xp: 6000, rankScore: 1350 },
      { username: "Berda", xp: 4800, rankScore: 1280 },
    ];

    for (const player of xboxBo2Players) {
      await queryRunner.query(
        `
        INSERT INTO "leaderboard_entries" ("userId", "leaderboardId", "xp", "rankScore", "xpOptIn", "elo", "rankedOptIn")
        SELECT u.id, l.id, $1, $2, true, 1000, true
        FROM "users" u, "leaderboards" l
        JOIN "games" g ON l."gameId" = g.id
        JOIN "platforms" p ON l."platformId" = p.id
        WHERE u.username = $3 AND g.name = 'Bo2' AND p.name = 'Xbox'
        ON CONFLICT DO NOTHING
      `,
        [player.xp, player.rankScore, player.username],
      );
    }

    // Seed leaderboard entries for Bo2 PS3
    console.log("Seeding PS3 Bo2 leaderboard entries...");
    const ps3Bo2Players = [
      { username: "Hops", xp: 15800, rankScore: 1880 },
      { username: "Oxentary", xp: 14200, rankScore: 1800 },
      { username: "Zargoh", xp: 12800, rankScore: 1730 },
      { username: "Azii", xp: 11500, rankScore: 1670 },
      { username: "Flashxng", xp: 10200, rankScore: 1600 },
      { username: "Sparkzei", xp: 9000, rankScore: 1540 },
      { username: "Titxnium", xp: 7800, rankScore: 1470 },
      { username: "Biosity", xp: 6600, rankScore: 1400 },
      { username: "FearMyTalent", xp: 5400, rankScore: 1330 },
      { username: "DelusionalTrails", xp: 4200, rankScore: 1260 },
    ];

    for (const player of ps3Bo2Players) {
      await queryRunner.query(
        `
        INSERT INTO "leaderboard_entries" ("userId", "leaderboardId", "xp", "rankScore", "xpOptIn", "elo", "rankedOptIn")
        SELECT u.id, l.id, $1, $2, true, 1000, true
        FROM "users" u, "leaderboards" l
        JOIN "games" g ON l."gameId" = g.id
        JOIN "platforms" p ON l."platformId" = p.id
        WHERE u.username = $3 AND g.name = 'Bo2' AND p.name = 'PS3'
        ON CONFLICT DO NOTHING
      `,
        [player.xp, player.rankScore, player.username],
      );
    }

    // Seed leaderboard entries for Mw2 Xbox
    console.log("Seeding Xbox Mw2 leaderboard entries...");
    const xboxMw2Players = [
      { username: "CoLd Qs", xp: 18500, rankScore: 1950 },
      { username: "All Killfeed", xp: 16200, rankScore: 1870 },
      { username: "Luis", xp: 14400, rankScore: 1790 },
      { username: "Cvoxo", xp: 12800, rankScore: 1720 },
      { username: "v Vizionaryz", xp: 11200, rankScore: 1650 },
      { username: "Sichology", xp: 9800, rankScore: 1580 },
      { username: "VeXzioNz", xp: 8400, rankScore: 1510 },
      { username: "Hozay", xp: 7000, rankScore: 1440 },
      { username: "School Tests", xp: 5600, rankScore: 1370 },
      { username: "VeriquL", xp: 4200, rankScore: 1300 },
    ];

    for (const player of xboxMw2Players) {
      await queryRunner.query(
        `
        INSERT INTO "leaderboard_entries" ("userId", "leaderboardId", "xp", "rankScore", "xpOptIn", "elo", "rankedOptIn")
        SELECT u.id, l.id, $1, $2, true, 1000, true
        FROM "users" u, "leaderboards" l
        JOIN "games" g ON l."gameId" = g.id
        JOIN "platforms" p ON l."platformId" = p.id
        WHERE u.username = $3 AND g.name = 'Mw2' AND p.name = 'Xbox'
        ON CONFLICT DO NOTHING
      `,
        [player.xp, player.rankScore, player.username],
      );
    }

    // Seed completed matches to give players win/loss records
    console.log("Seeding match history...");

    // Get all user IDs
    const allUsernames = [
      ...bo2Players.map((p) => p.username),
      ...xboxBo2Players.map((p) => p.username),
      ...ps3Bo2Players.map((p) => p.username),
      ...xboxMw2Players.map((p) => p.username),
    ];
    const uniqueUsernames = [...new Set(allUsernames)];

    const userRows = await queryRunner.query(
      `
      SELECT id, username FROM "users" WHERE username IN (${uniqueUsernames.map((_, i) => `$${i + 1}`).join(", ")})
    `,
      uniqueUsernames,
    );

    const userMap = new Map<string, string>();
    for (const row of userRows) {
      userMap.set(row.username, row.id);
    }

    const maps = ["Nuketown", "Raid", "Standoff"];

    // Helper function to seed matches for a leaderboard
    async function seedMatchesForLeaderboard(
      gameName: string,
      platformName: string,
      players: { username: string }[],
      targetWins: Record<string, number>,
    ) {
      const leaderboardRow = await queryRunner.query(
        `
        SELECT l.id FROM "leaderboards" l
        JOIN "games" g ON l."gameId" = g.id
        JOIN "platforms" p ON l."platformId" = p.id
        WHERE g.name = $1 AND p.name = $2
      `,
        [gameName, platformName],
      );

      const leaderboardId = leaderboardRow[0]?.id;
      if (!leaderboardId) return;

      const playerNames = players.map((p) => p.username);
      const winsRemaining = { ...targetWins };

      for (let i = 0; i < playerNames.length; i++) {
        for (let j = i + 1; j < playerNames.length; j++) {
          const player1 = playerNames[i];
          const player2 = playerNames[j];
          const player1Id = userMap.get(player1);
          const player2Id = userMap.get(player2);

          if (!player1Id || !player2Id) continue;

          const matchCount = 8;

          for (let m = 0; m < matchCount; m++) {
            let winnerId: string;
            let winnerName: string;

            if (winsRemaining[player1] > winsRemaining[player2]) {
              winnerId = player1Id;
              winnerName = player1;
            } else if (winsRemaining[player2] > winsRemaining[player1]) {
              winnerId = player2Id;
              winnerName = player2;
            } else {
              if (Math.random() > 0.5) {
                winnerId = player1Id;
                winnerName = player1;
              } else {
                winnerId = player2Id;
                winnerName = player2;
              }
            }

            if (winsRemaining[winnerName] > 0) {
              winsRemaining[winnerName]--;

              await queryRunner.query(
                `
                INSERT INTO "matches" (
                  "challengerId", "challengeeId", "leaderboardId", "type", "status",
                  "bestOf", "selectedMaps", "winnerId"
                ) VALUES ($1, $2, $3, 'RANKED', 'COMPLETED', 3, $4, $5)
              `,
                [
                  player1Id,
                  player2Id,
                  leaderboardId,
                  JSON.stringify(maps),
                  winnerId,
                ],
              );
            }
          }
        }
      }
    }

    // Seed Plutonium Bo2 matches
    console.log("Seeding Plutonium Bo2 matches...");
    await seedMatchesForLeaderboard("Bo2", "Plutonium", bo2Players, {
      Scrubzei: 87,
      Relxa: 72,
      Spartuns: 65,
      Bxvonn: 58,
      Tezhify: 55,
      Relvic: 52,
      Chroma: 45,
      Dufuzz: 42,
      Slxep: 35,
      Bylarus: 28,
      Countxr: 22,
      Aylo: 18,
    });

    // Seed Xbox Bo2 matches
    console.log("Seeding Xbox Bo2 matches...");
    await seedMatchesForLeaderboard("Bo2", "Xbox", xboxBo2Players, {
      Wubzei: 82,
      Relxa: 70,
      Oxentary: 62,
      Zapsi: 55,
      Steroiz: 48,
      Scrubzei: 42,
      "Nuketown Traps": 35,
      Yelicate: 28,
      Flashxng: 22,
      Berda: 16,
    });

    // Seed PS3 Bo2 matches
    console.log("Seeding PS3 Bo2 matches...");
    await seedMatchesForLeaderboard("Bo2", "PS3", ps3Bo2Players, {
      Hops: 78,
      Oxentary: 68,
      Zargoh: 58,
      Azii: 50,
      Flashxng: 44,
      Sparkzei: 38,
      Titxnium: 32,
      Biosity: 26,
      FearMyTalent: 20,
      DelusionalTrails: 14,
    });

    // Seed Xbox Mw2 matches
    console.log("Seeding Xbox Mw2 matches...");
    await seedMatchesForLeaderboard("Mw2", "Xbox", xboxMw2Players, {
      "CoLd Qs": 85,
      "All Killfeed": 74,
      Luis: 65,
      Cvoxo: 56,
      "v Vizionaryz": 48,
      Sichology: 40,
      VeXzioNz: 33,
      Hozay: 26,
      "School Tests": 19,
      VeriquL: 12,
    });

    // Seed tournament with configurable participant count
    const tournamentParticipants = parseInt(
      process.env.TOURNAMENT_PARTICIPANTS || "0",
      10,
    );
    if (tournamentParticipants >= 2) {
      console.log(
        `Seeding tournament with ${tournamentParticipants} participants...`,
      );

      // Get a game and platform to use
      const gameRow = await queryRunner.query(`SELECT id FROM "games" LIMIT 1`);
      const platformRow = await queryRunner.query(
        `SELECT id FROM "platforms" LIMIT 1`,
      );

      if (!gameRow[0] || !platformRow[0]) {
        console.error(
          "No games or platforms found — run migrations with game/platform seeds first",
        );
      } else {
        const gameId = gameRow[0].id;
        const platformId = platformRow[0].id;

        // Get all existing users
        const existingUsers = await queryRunner.query(
          `SELECT id, username FROM "users"`,
        );
        const availableUserIds: string[] = existingUsers.map((u: any) => u.id);

        // Create filler users if we don't have enough
        const needed = tournamentParticipants - availableUserIds.length;
        if (needed > 0) {
          console.log(`Creating ${needed} filler users...`);
          for (let i = 0; i < needed; i++) {
            const username = `SeedPlayer${availableUserIds.length + i + 1}`;
            await queryRunner.query(
              `INSERT INTO "users" ("username") VALUES ($1) ON CONFLICT DO NOTHING`,
              [username],
            );
            const row = await queryRunner.query(
              `SELECT id FROM "users" WHERE username = $1`,
              [username],
            );
            if (row[0]) {
              availableUserIds.push(row[0].id);
            }
          }
        }

        const participantIds = availableUserIds.slice(
          0,
          tournamentParticipants,
        );
        const creatorId = participantIds[0];

        // Pick a unique slug
        const slug = `seed-tournament-${Date.now()}`;

        // Create the tournament
        await queryRunner.query(
          `INSERT INTO "tournaments" ("name", "slug", "gameId", "platformId", "format", "maxParticipants", "createdById", "status")
           VALUES ($1, $2, $3, $4, 'SINGLE_ELIMINATION', $5, $6, 'REGISTRATION')`,
          [
            `Seed Tournament (${tournamentParticipants}p)`,
            slug,
            gameId,
            platformId,
            tournamentParticipants,
            creatorId,
          ],
        );

        const tournamentRow = await queryRunner.query(
          `SELECT id FROM "tournaments" WHERE slug = $1`,
          [slug],
        );
        const tournamentId = tournamentRow[0].id;

        // Sign up participants with seeds
        for (let i = 0; i < participantIds.length; i++) {
          await queryRunner.query(
            `INSERT INTO "tournament_participants" ("tournamentId", "userId", "seed")
             VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [tournamentId, participantIds[i], i + 1],
          );
        }

        console.log(
          `Tournament created: slug="${slug}", id=${tournamentId}, ${participantIds.length} participants signed up and seeded`,
        );
        console.log(
          "Tournament is in REGISTRATION status — start it via the admin UI or API to generate the bracket.",
        );

        // Create a second tournament with different game/platform if available
        const game2Row = await queryRunner.query(
          `SELECT id, name FROM "games" ORDER BY name OFFSET 1 LIMIT 1`,
        );
        const platform2Row = await queryRunner.query(
          `SELECT id, name FROM "platforms" ORDER BY name OFFSET 1 LIMIT 1`,
        );
        const game2Id = game2Row[0]?.id || gameId;
        const platform2Id = platform2Row[0]?.id || platformId;
        const game2Name = game2Row[0]?.name || "Alt";
        const platform2Name = platform2Row[0]?.name || "Alt";

        const slug2 = `seed-tournament-2-${Date.now()}`;
        const participants2Count = Math.min(8, availableUserIds.length);
        const participant2Ids = availableUserIds.slice(0, participants2Count);

        await queryRunner.query(
          `INSERT INTO "tournaments" ("name", "slug", "gameId", "platformId", "format", "maxParticipants", "createdById", "status")
           VALUES ($1, $2, $3, $4, 'SINGLE_ELIMINATION', $5, $6, 'REGISTRATION')`,
          [
            `${game2Name} ${platform2Name} Invitational`,
            slug2,
            game2Id,
            platform2Id,
            participants2Count,
            participant2Ids[0],
          ],
        );

        const tournament2Row = await queryRunner.query(
          `SELECT id FROM "tournaments" WHERE slug = $1`,
          [slug2],
        );
        const tournament2Id = tournament2Row[0].id;

        for (let i = 0; i < participant2Ids.length; i++) {
          await queryRunner.query(
            `INSERT INTO "tournament_participants" ("tournamentId", "userId", "seed")
             VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [tournament2Id, participant2Ids[i], i + 1],
          );
        }

        console.log(
          `Second tournament created: slug="${slug2}", id=${tournament2Id}, ${participant2Ids.length} participants signed up and seeded`,
        );
      }
    }

    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Seed failed:", error);
    throw error;
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

seed();
