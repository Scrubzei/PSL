import 'dotenv/config';
import { AppDataSource } from './data-source';

const tournamentNames = [
  'Winter Championship',
  'Pro League Finals',
  'Community Cup',
  'Weekend Warriors',
  'Elite Showdown',
  'Rising Stars',
  'Legends Tournament',
  'Grand Prix',
  'Battle Royale',
  'King of the Hill',
  'Last Man Standing',
  'Champion Series',
  'Quick Play Qualifier',
  'Prestige Event',
  'Season Finals',
];

interface SeedOptions {
  count: number;
  seats: number;
  game: string;
  platform: string;
  format: string;
  name?: string;
  slug?: string;
}

function parseArgs(): SeedOptions {
  const args = process.argv.slice(2);
  const options: SeedOptions = {
    count: 1,
    seats: 8,
    game: 'Bo2',
    platform: 'Plutonium',
    format: 'SINGLE_ELIMINATION',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--count':
      case '-c':
        options.count = parseInt(nextArg, 10) || 1;
        i++;
        break;
      case '--seats':
      case '-s':
        const seats = parseInt(nextArg, 10);
        // Validate power of 2 for bracket tournaments
        if (seats && [4, 8, 16, 32, 64].includes(seats)) {
          options.seats = seats;
        } else {
          console.warn(`Invalid seat count: ${nextArg}. Must be 4, 8, 16, 32, or 64. Using default: 8`);
        }
        i++;
        break;
      case '--game':
      case '-g':
        options.game = nextArg;
        i++;
        break;
      case '--platform':
      case '-p':
        options.platform = nextArg;
        i++;
        break;
      case '--format':
      case '-f':
        options.format = nextArg;
        i++;
        break;
      case '--name':
      case '-n':
        options.name = nextArg;
        i++;
        break;
      case '--slug':
      case '-l':
        options.slug = nextArg;
        i++;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        // Check if it's just a number (shorthand for count)
        if (!isNaN(parseInt(arg, 10))) {
          options.count = parseInt(arg, 10);
        }
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Tournament Seed Script

Usage: npm run seed:tournaments -- [options]

Options:
  -c, --count <n>      Number of tournaments to create (default: 1)
  -s, --seats <n>      Participants per tournament: 4, 8, 16, 32, 64 (default: 8)
  -g, --game <name>    Game name (default: Bo2)
  -p, --platform <name> Platform name (default: Plutonium)
  -f, --format <type>  Tournament format (default: SINGLE_ELIMINATION)
  -n, --name <name>    Custom tournament name (default: random)
  -l, --slug <slug>    Custom URL slug (default: generated from name)
  -h, --help           Show this help message

Examples:
  npm run seed:tournaments -- 5                    # Create 5 tournaments with defaults
  npm run seed:tournaments -- -c 3 -s 16           # Create 3 tournaments with 16 seats each
  npm run seed:tournaments -- -g Mw3 -p Xbox       # Create Bo2 Xbox tournament
  npm run seed:tournaments -- -c 2 -s 4 -g Bo2     # Create 2 small Bo2 Plutonium tournaments
`);
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function seedTournaments(options: SeedOptions) {
  await AppDataSource.initialize();
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    console.log(`\nSeeding ${options.count} tournament(s)...`);
    console.log(`  Game: ${options.game}`);
    console.log(`  Platform: ${options.platform}`);
    console.log(`  Seats: ${options.seats}`);
    console.log(`  Format: ${options.format}\n`);

    // Get specified game
    const games = await queryRunner.query(
      `SELECT id, name FROM "games" WHERE LOWER(name) = LOWER($1)`,
      [options.game]
    );
    if (games.length === 0) {
      // List available games
      const allGames = await queryRunner.query(`SELECT name FROM "games"`);
      console.error(`Game "${options.game}" not found.`);
      console.error(`Available games: ${allGames.map((g: any) => g.name).join(', ')}`);
      return;
    }
    const game = games[0];

    // Get specified platform
    const platforms = await queryRunner.query(
      `SELECT id, name FROM "platforms" WHERE LOWER(name) = LOWER($1)`,
      [options.platform]
    );
    if (platforms.length === 0) {
      const allPlatforms = await queryRunner.query(`SELECT name FROM "platforms"`);
      console.error(`Platform "${options.platform}" not found.`);
      console.error(`Available platforms: ${allPlatforms.map((p: any) => p.name).join(', ')}`);
      return;
    }
    const platform = platforms[0];

    // Get all users
    const users = await queryRunner.query(`SELECT id, username FROM "users"`);
    if (users.length < options.seats) {
      console.error(
        `Not enough users found. Need ${options.seats} but only have ${users.length}. Run the main seed first.`
      );
      return;
    }

    // Get an admin user to be the creator (or first user)
    const adminUser = await queryRunner.query(`
      SELECT id FROM "users" WHERE role = 'admin' LIMIT 1
    `);
    const creatorId = adminUser[0]?.id || users[0].id;

    for (let i = 0; i < options.count; i++) {
      // Use custom name if provided, otherwise pick a random tournament name
      let tournamentName: string;
      if (options.name) {
        tournamentName = options.count > 1 ? `${options.name} #${i + 1}` : options.name;
      } else {
        const baseName = tournamentNames[Math.floor(Math.random() * tournamentNames.length)];
        tournamentName = options.count > 1 ? `${baseName} #${i + 1}` : baseName;
      }

      // Generate slug
      let slug: string;
      if (options.slug) {
        slug = options.count > 1 ? `${options.slug}-${i + 1}` : options.slug;
      } else {
        slug = generateSlug(tournamentName);
      }

      console.log(`Creating: ${tournamentName} [${slug}] (${game.name} - ${platform.name}, ${options.seats} players)`);

      // Create tournament with REGISTRATION status
      const tournamentResult = await queryRunner.query(
        `INSERT INTO "tournaments" (
          "name", "slug", "description", "gameId", "platformId", "format",
          "maxParticipants", "status", "createdById"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'REGISTRATION', $8)
        RETURNING id`,
        [
          tournamentName,
          slug,
          `A ${game.name} tournament on ${platform.name}`,
          game.id,
          platform.id,
          options.format,
          options.seats,
          creatorId,
        ]
      );
      const tournamentId = tournamentResult[0].id;

      // Shuffle and pick random participants to fill all seats
      const shuffledUsers = [...users].sort(() => Math.random() - 0.5);
      const participants = shuffledUsers.slice(0, options.seats);

      // Add all participants (no seed assigned yet since it's registration)
      for (const participant of participants) {
        await queryRunner.query(
          `INSERT INTO "tournament_participants" ("tournamentId", "userId", "seed", "eliminated")
           VALUES ($1, $2, NULL, false)
           ON CONFLICT DO NOTHING`,
          [tournamentId, participant.id]
        );
      }

      console.log(`  Added ${participants.length} participants`);
    }

    console.log(`\nSuccessfully seeded ${options.count} tournament(s)!`);
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

console.log(`\n=== Tournament Seed Script ===`);
const options = parseArgs();
seedTournaments(options);
