import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGameServers1742400000000 implements MigrationInterface {
  name = 'AddGameServers1742400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "game_servers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "queueId" character varying NOT NULL,
        "name" character varying NOT NULL,
        "ip" character varying NOT NULL,
        "port" integer NOT NULL,
        "available" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "game_servers"`);
  }
}
