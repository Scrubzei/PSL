import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTournamentMatchMaps1738600000000 implements MigrationInterface {
  name = 'AddTournamentMatchMaps1738600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tournament_matches"
      ADD COLUMN "gameMapId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "tournament_matches"
      ADD CONSTRAINT "fk_tournament_match_game_map"
      FOREIGN KEY ("gameMapId") REFERENCES "game_maps"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tournament_match_game_map" ON "tournament_matches"("gameMapId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_tournament_match_game_map"`);
    await queryRunner.query(`ALTER TABLE "tournament_matches" DROP CONSTRAINT "fk_tournament_match_game_map"`);
    await queryRunner.query(`ALTER TABLE "tournament_matches" DROP COLUMN "gameMapId"`);
  }
}
