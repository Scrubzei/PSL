import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPs4Ps5Platform1742800000000 implements MigrationInterface {
  name = 'AddPs4Ps5Platform1742800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Combined PS4/PS5 platform — the console port covers both, so it's a single
    // entry (mirroring the existing single 'PS3' platform). Idempotent insert.
    await queryRunner.query(`
      INSERT INTO "platforms" ("name")
      SELECT 'PS4/PS5'
      WHERE NOT EXISTS (SELECT 1 FROM "platforms" WHERE "name" = 'PS4/PS5')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "platforms" WHERE "name" = 'PS4/PS5'`);
  }
}
