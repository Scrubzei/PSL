import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTournamentMatchGameMaps1739900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add gameMaps jsonb column
    await queryRunner.query(
      `ALTER TABLE "tournament_matches" ADD COLUMN "gameMaps" jsonb`,
    );

    // Migrate existing gameMapId data to gameMaps
    await queryRunner.query(`
      UPDATE "tournament_matches" tm
      SET "gameMaps" = jsonb_build_array(jsonb_build_object('id', gm."id"::text, 'mapName', gm."mapName"))
      FROM "game_maps" gm
      WHERE tm."gameMapId" = gm."id" AND tm."gameMapId" IS NOT NULL
    `);

    // Drop the foreign key constraint on gameMapId
    const fkConstraints = await queryRunner.query(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'tournament_matches' AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%gameMapId%'
    `);
    for (const fk of fkConstraints) {
      await queryRunner.query(
        `ALTER TABLE "tournament_matches" DROP CONSTRAINT "${fk.constraint_name}"`,
      );
    }

    // Drop gameMapId column
    await queryRunner.query(
      `ALTER TABLE "tournament_matches" DROP COLUMN "gameMapId"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add gameMapId column
    await queryRunner.query(
      `ALTER TABLE "tournament_matches" ADD COLUMN "gameMapId" uuid`,
    );

    // Add back FK constraint
    await queryRunner.query(
      `ALTER TABLE "tournament_matches" ADD CONSTRAINT "FK_tournament_matches_gameMapId" FOREIGN KEY ("gameMapId") REFERENCES "game_maps"("id") ON DELETE SET NULL`,
    );

    // Migrate gameMaps data back to gameMapId (take first map)
    await queryRunner.query(`
      UPDATE "tournament_matches"
      SET "gameMapId" = ("gameMaps"->0->>'id')::uuid
      WHERE "gameMaps" IS NOT NULL AND jsonb_array_length("gameMaps") > 0
    `);

    // Drop gameMaps column
    await queryRunner.query(
      `ALTER TABLE "tournament_matches" DROP COLUMN "gameMaps"`,
    );
  }
}
