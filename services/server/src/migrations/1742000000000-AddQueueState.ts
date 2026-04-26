import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQueueState1742000000000 implements MigrationInterface {
  name = 'AddQueueState1742000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "queue_state" (
        "id" integer PRIMARY KEY DEFAULT 1,
        "state" jsonb NOT NULL DEFAULT '{"queues":[],"matches":[]}',
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "queue_state_singleton" CHECK (id = 1)
      )
    `);
    await queryRunner.query(`
      INSERT INTO "queue_state" ("id", "state") VALUES (1, '{"queues":[],"matches":[]}')
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "queue_state"`);
  }
}
