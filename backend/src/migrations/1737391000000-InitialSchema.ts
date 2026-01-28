import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class InitialSchema1737391000000 implements MigrationInterface {
  name = 'InitialSchema1737391000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "username" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    // Seed test users - password is "testpassword123" for all
    const password = await bcrypt.hash('testpassword123', 10);

    const testUsers = [
      // Bo2 leaderboard users
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
      // Mw2 leaderboard users
      { username: 'CoLd Qs', email: 'coldqs@test.com' },
      { username: 'All Killfeed', email: 'allkillfeed@test.com' },
      { username: 'Try to 1v1 me', email: 'tryto1v1me@test.com' },
      { username: 'v Visionaryz', email: 'vvisionaryz@test.com' },
      { username: 'Cvoxo', email: 'cvoxo@test.com' },
      { username: 'VeXzioNz', email: 'vexzionz@test.com' },
      { username: 'Sichology', email: 'sichology@test.com' },
      { username: 'Vertiqul', email: 'vertiqul@test.com' },
      { username: 'Prime xCash Son', email: 'primexcashson@test.com' },
    ];

    for (const user of testUsers) {
      await queryRunner.query(
        `INSERT INTO "users" ("email", "password", "username") VALUES ($1, $2, $3)`,
        [user.email, password, user.username]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
