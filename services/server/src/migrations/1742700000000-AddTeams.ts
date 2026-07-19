import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeams1742700000000 implements MigrationInterface {
  name = 'AddTeams1742700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "teams" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "tag" character varying(8) NOT NULL,
        "game" character varying NOT NULL,
        "region" character varying NOT NULL DEFAULT 'NA',
        "logo" character varying,
        "color" character varying,
        "bio" character varying,
        "captainId" uuid NOT NULL REFERENCES "users"("id"),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        UNIQUE("tag", "game")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "team_memberships" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "teamId" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
        "userId" uuid NOT NULL REFERENCES "users"("id"),
        "role" character varying NOT NULL DEFAULT 'member',
        "joinedAt" TIMESTAMP NOT NULL DEFAULT now(),
        UNIQUE("teamId", "userId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "team_invites" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "teamId" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
        "invitedUserId" uuid NOT NULL REFERENCES "users"("id"),
        "invitedByUserId" uuid NOT NULL REFERENCES "users"("id"),
        "status" character varying NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Indexes for common queries
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_team_memberships_userId" ON "team_memberships" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_team_invites_invitedUserId" ON "team_invites" ("invitedUserId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_teams_game" ON "teams" ("game")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "team_invites"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "team_memberships"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "teams"`);
  }
}
