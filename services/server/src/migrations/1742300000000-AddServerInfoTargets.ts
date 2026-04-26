import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServerInfoTargets1742300000000 implements MigrationInterface {
  name = 'AddServerInfoTargets1742300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "server_info_targets" (
        "id" SERIAL PRIMARY KEY,
        "serverName" character varying NOT NULL,
        "channelId" character varying NOT NULL,
        "messageId" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "server_info_targets"`);
  }
}
