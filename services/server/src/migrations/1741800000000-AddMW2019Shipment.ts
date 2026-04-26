import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMW2019Shipment1741800000000 implements MigrationInterface {
  name = 'AddMW2019Shipment1741800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "game_maps" ("gameId", "mapName")
      SELECT g.id, 'Shipment' FROM "games" g
      WHERE g.name = 'MW 2019'
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "game_maps"
      WHERE "mapName" = 'Shipment'
      AND "gameId" IN (SELECT id FROM "games" WHERE name = 'MW 2019')
    `);
  }
}
