import 'dotenv/config';
import { AppDataSource } from './data-source';
import * as bcrypt from 'bcrypt';

async function seed() {
  await AppDataSource.initialize();
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    console.log('Starting seed...');

    // Seed test users - password is "testpassword123" for all
    const password = await bcrypt.hash('testpassword123', 10);

    const testUsers = [
      // Bo2 Plutonium leaderboard users
      { username: 'Scrubzei', email: 'scrubzei@test.com' },
      { username: 'Relxa', email: 'relxa@test.com' },
      { username: 'Countxr', email: 'countxr@test.com' },
      { username: 'Spartuns', email: 'spartuns@test.com' },
      { username: 'Bxvonn', email: 'bxvonn@test.com' },
      { username: 'Relvic', email: 'relvic@test.com' },
      { username: 'Chroma', email: 'chroma@test.com' },
      { username: 'Dufuzz', email: 'dufuzz@test.com' },
      { username: 'Slxep', email: 'slxep@test.com' },
      { username: 'Bylarus', email: 'bylarus@test.com' },
      { username: 'Aylo', email: 'aylo@test.com' },
      { username: 'Tezhify', email: 'tezhify@test.com' },
      // Bo2 Xbox leaderboard users
      { username: 'Wubzei', email: 'wubzei@test.com' },
      { username: 'Oxentary', email: 'oxentary@test.com' },
      { username: 'Zapsi', email: 'zapsi@test.com' },
      { username: 'Steroiz', email: 'steroiz@test.com' },
      { username: 'Nuketown Traps', email: 'nuketowntraps@test.com' },
      { username: 'Yelicate', email: 'yelicate@test.com' },
      { username: 'Flashxng', email: 'flashxng@test.com' },
      { username: 'Berda', email: 'berda@test.com' },
      // Bo2 PS3 leaderboard users
      { username: 'Hops', email: 'hops@test.com' },
      { username: 'Zargoh', email: 'zargoh@test.com' },
      { username: 'Azii', email: 'azii@test.com' },
      { username: 'Sparkzei', email: 'sparkzei@test.com' },
      { username: 'Titxnium', email: 'titxnium@test.com' },
      { username: 'Biosity', email: 'biosity@test.com' },
      { username: 'FearMyTalent', email: 'fearmytalent@test.com' },
      { username: 'DelusionalTrails', email: 'delusionaltrails@test.com' },
      // Mw2 Xbox leaderboard users
      { username: 'CoLd Qs', email: 'coldqs@test.com' },
      { username: 'All Killfeed', email: 'allkillfeed@test.com' },
      { username: 'Luis', email: 'luis@test.com' },
      { username: 'Cvoxo', email: 'cvoxo@test.com' },
      { username: 'v Vizionaryz', email: 'vvizionaryz@test.com' },
      { username: 'Sichology', email: 'sichology@test.com' },
      { username: 'VeXzioNz', email: 'vexzionz@test.com' },
      { username: 'Hozay', email: 'hozay@test.com' },
      { username: 'School Tests', email: 'schooltests@test.com' },
      { username: 'VeriquL', email: 'veriqul@test.com' },
    ];

    console.log('Seeding users...');
    for (const user of testUsers) {
      await queryRunner.query(
        `INSERT INTO "users" ("email", "password", "username") VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [user.email, password, user.username]
      );
    }

    // Seed leaderboard entries for Bo2 Plutonium
    console.log('Seeding leaderboard entries...');
    const bo2Players = [
      { username: 'Scrubzei', xp: 15420, rankScore: 1850 },
      { username: 'Relxa', xp: 14200, rankScore: 1780 },
      { username: 'Spartuns', xp: 12350, rankScore: 1720 },
      { username: 'Bxvonn', xp: 11200, rankScore: 1680 },
      { username: 'Relvic', xp: 9800, rankScore: 1590 },
      { username: 'Tezhify', xp: 9500, rankScore: 1560 },
      { username: 'Chroma', xp: 8200, rankScore: 1480 },
      { username: 'Dufuzz', xp: 7600, rankScore: 1450 },
      { username: 'Slxep', xp: 6200, rankScore: 1380 },
      { username: 'Bylarus', xp: 5100, rankScore: 1290 },
      { username: 'Countxr', xp: 4300, rankScore: 1150 },
      { username: 'Aylo', xp: 3500, rankScore: 1120 },
    ];

    for (const player of bo2Players) {
      await queryRunner.query(`
        INSERT INTO "leaderboard_entries" ("userId", "leaderboardId", "xp", "rankScore")
        SELECT u.id, l.id, $1, $2
        FROM "users" u, "leaderboards" l
        JOIN "games" g ON l."gameId" = g.id
        JOIN "platforms" p ON l."platformId" = p.id
        WHERE u.username = $3 AND g.name = 'Bo2' AND p.name = 'Plutonium'
        ON CONFLICT DO NOTHING
      `, [player.xp, player.rankScore, player.username]);
    }

    // Seed leaderboard entries for Bo2 Xbox
    console.log('Seeding Xbox Bo2 leaderboard entries...');
    const xboxBo2Players = [
      { username: 'Wubzei', xp: 16200, rankScore: 1900 },
      { username: 'Relxa', xp: 14800, rankScore: 1820 },
      { username: 'Oxentary', xp: 13500, rankScore: 1750 },
      { username: 'Zapsi', xp: 12100, rankScore: 1690 },
      { username: 'Steroiz', xp: 10800, rankScore: 1620 },
      { username: 'Scrubzei', xp: 9600, rankScore: 1560 },
      { username: 'Nuketown Traps', xp: 8400, rankScore: 1490 },
      { username: 'Yelicate', xp: 7200, rankScore: 1420 },
      { username: 'Flashxng', xp: 6000, rankScore: 1350 },
      { username: 'Berda', xp: 4800, rankScore: 1280 },
    ];

    for (const player of xboxBo2Players) {
      await queryRunner.query(`
        INSERT INTO "leaderboard_entries" ("userId", "leaderboardId", "xp", "rankScore")
        SELECT u.id, l.id, $1, $2
        FROM "users" u, "leaderboards" l
        JOIN "games" g ON l."gameId" = g.id
        JOIN "platforms" p ON l."platformId" = p.id
        WHERE u.username = $3 AND g.name = 'Bo2' AND p.name = 'Xbox'
        ON CONFLICT DO NOTHING
      `, [player.xp, player.rankScore, player.username]);
    }

    // Seed leaderboard entries for Bo2 PS3
    console.log('Seeding PS3 Bo2 leaderboard entries...');
    const ps3Bo2Players = [
      { username: 'Hops', xp: 15800, rankScore: 1880 },
      { username: 'Oxentary', xp: 14200, rankScore: 1800 },
      { username: 'Zargoh', xp: 12800, rankScore: 1730 },
      { username: 'Azii', xp: 11500, rankScore: 1670 },
      { username: 'Flashxng', xp: 10200, rankScore: 1600 },
      { username: 'Sparkzei', xp: 9000, rankScore: 1540 },
      { username: 'Titxnium', xp: 7800, rankScore: 1470 },
      { username: 'Biosity', xp: 6600, rankScore: 1400 },
      { username: 'FearMyTalent', xp: 5400, rankScore: 1330 },
      { username: 'DelusionalTrails', xp: 4200, rankScore: 1260 },
    ];

    for (const player of ps3Bo2Players) {
      await queryRunner.query(`
        INSERT INTO "leaderboard_entries" ("userId", "leaderboardId", "xp", "rankScore")
        SELECT u.id, l.id, $1, $2
        FROM "users" u, "leaderboards" l
        JOIN "games" g ON l."gameId" = g.id
        JOIN "platforms" p ON l."platformId" = p.id
        WHERE u.username = $3 AND g.name = 'Bo2' AND p.name = 'PS3'
        ON CONFLICT DO NOTHING
      `, [player.xp, player.rankScore, player.username]);
    }

    // Seed leaderboard entries for Mw2 Xbox
    console.log('Seeding Xbox Mw2 leaderboard entries...');
    const xboxMw2Players = [
      { username: 'CoLd Qs', xp: 18500, rankScore: 1950 },
      { username: 'All Killfeed', xp: 16200, rankScore: 1870 },
      { username: 'Luis', xp: 14400, rankScore: 1790 },
      { username: 'Cvoxo', xp: 12800, rankScore: 1720 },
      { username: 'v Vizionaryz', xp: 11200, rankScore: 1650 },
      { username: 'Sichology', xp: 9800, rankScore: 1580 },
      { username: 'VeXzioNz', xp: 8400, rankScore: 1510 },
      { username: 'Hozay', xp: 7000, rankScore: 1440 },
      { username: 'School Tests', xp: 5600, rankScore: 1370 },
      { username: 'VeriquL', xp: 4200, rankScore: 1300 },
    ];

    for (const player of xboxMw2Players) {
      await queryRunner.query(`
        INSERT INTO "leaderboard_entries" ("userId", "leaderboardId", "xp", "rankScore")
        SELECT u.id, l.id, $1, $2
        FROM "users" u, "leaderboards" l
        JOIN "games" g ON l."gameId" = g.id
        JOIN "platforms" p ON l."platformId" = p.id
        WHERE u.username = $3 AND g.name = 'Mw2' AND p.name = 'Xbox'
        ON CONFLICT DO NOTHING
      `, [player.xp, player.rankScore, player.username]);
    }

    // Seed completed matches to give players win/loss records
    console.log('Seeding match history...');

    // Get all user IDs
    const allUsernames = [
      ...bo2Players.map(p => p.username),
      ...xboxBo2Players.map(p => p.username),
      ...ps3Bo2Players.map(p => p.username),
      ...xboxMw2Players.map(p => p.username),
    ];
    const uniqueUsernames = [...new Set(allUsernames)];

    const userRows = await queryRunner.query(`
      SELECT id, username FROM "users" WHERE username IN (${uniqueUsernames.map((_, i) => `$${i + 1}`).join(', ')})
    `, uniqueUsernames);

    const userMap = new Map<string, string>();
    for (const row of userRows) {
      userMap.set(row.username, row.id);
    }

    const maps = ['Nuketown', 'Raid', 'Standoff'];

    // Helper function to seed matches for a leaderboard
    async function seedMatchesForLeaderboard(
      gameName: string,
      platformName: string,
      players: { username: string }[],
      targetWins: Record<string, number>
    ) {
      const leaderboardRow = await queryRunner.query(`
        SELECT l.id FROM "leaderboards" l
        JOIN "games" g ON l."gameId" = g.id
        JOIN "platforms" p ON l."platformId" = p.id
        WHERE g.name = $1 AND p.name = $2
      `, [gameName, platformName]);

      const leaderboardId = leaderboardRow[0]?.id;
      if (!leaderboardId) return;

      const playerNames = players.map(p => p.username);
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

              await queryRunner.query(`
                INSERT INTO "matches" (
                  "challengerId", "challengeeId", "leaderboardId", "type", "status",
                  "bestOf", "selectedMaps", "winnerId"
                ) VALUES ($1, $2, $3, 'RANKED', 'COMPLETED', 3, $4, $5)
              `, [player1Id, player2Id, leaderboardId, JSON.stringify(maps), winnerId]);
            }
          }
        }
      }
    }

    // Seed Plutonium Bo2 matches
    console.log('Seeding Plutonium Bo2 matches...');
    await seedMatchesForLeaderboard('Bo2', 'Plutonium', bo2Players, {
      'Scrubzei': 87, 'Relxa': 72, 'Spartuns': 65, 'Bxvonn': 58,
      'Tezhify': 55, 'Relvic': 52, 'Chroma': 45, 'Dufuzz': 42,
      'Slxep': 35, 'Bylarus': 28, 'Countxr': 22, 'Aylo': 18,
    });

    // Seed Xbox Bo2 matches
    console.log('Seeding Xbox Bo2 matches...');
    await seedMatchesForLeaderboard('Bo2', 'Xbox', xboxBo2Players, {
      'Wubzei': 82, 'Relxa': 70, 'Oxentary': 62, 'Zapsi': 55,
      'Steroiz': 48, 'Scrubzei': 42, 'Nuketown Traps': 35, 'Yelicate': 28,
      'Flashxng': 22, 'Berda': 16,
    });

    // Seed PS3 Bo2 matches
    console.log('Seeding PS3 Bo2 matches...');
    await seedMatchesForLeaderboard('Bo2', 'PS3', ps3Bo2Players, {
      'Hops': 78, 'Oxentary': 68, 'Zargoh': 58, 'Azii': 50,
      'Flashxng': 44, 'Sparkzei': 38, 'Titxnium': 32, 'Biosity': 26,
      'FearMyTalent': 20, 'DelusionalTrails': 14,
    });

    // Seed Xbox Mw2 matches
    console.log('Seeding Xbox Mw2 matches...');
    await seedMatchesForLeaderboard('Mw2', 'Xbox', xboxMw2Players, {
      'CoLd Qs': 85, 'All Killfeed': 74, 'Luis': 65, 'Cvoxo': 56,
      'v Vizionaryz': 48, 'Sichology': 40, 'VeXzioNz': 33, 'Hozay': 26,
      'School Tests': 19, 'VeriquL': 12,
    });

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

seed();
