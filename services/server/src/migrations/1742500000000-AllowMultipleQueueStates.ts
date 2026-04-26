import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowMultipleQueueStates1742500000000 implements MigrationInterface {
  name = 'AllowMultipleQueueStates1742500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "queue_state" DROP CONSTRAINT IF EXISTS "queue_state_singleton"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "queue_state" ADD CONSTRAINT "queue_state_singleton" CHECK (id = 1)`);
  }
}
