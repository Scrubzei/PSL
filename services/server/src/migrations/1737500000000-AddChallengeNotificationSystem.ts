import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChallengeNotificationSystem1737500000000 implements MigrationInterface {
  name = 'AddChallengeNotificationSystem1737500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to matches table
    await queryRunner.query(`
      ALTER TABLE "matches"
      ADD COLUMN "status" character varying NOT NULL DEFAULT 'PENDING'
    `);

    await queryRunner.query(`
      ALTER TABLE "matches"
      ADD COLUMN "bestOf" integer NOT NULL DEFAULT 3
    `);

    await queryRunner.query(`
      ALTER TABLE "matches"
      ADD COLUMN "selectedMaps" jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE "matches"
      ADD COLUMN "winnerId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "matches"
      ADD COLUMN "message" character varying
    `);

    await queryRunner.query(`
      ALTER TABLE "matches"
      ADD CONSTRAINT "FK_matches_winner" FOREIGN KEY ("winnerId") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    // Create notifications table
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "type" character varying NOT NULL,
        "title" character varying NOT NULL,
        "message" character varying NOT NULL,
        "relatedEntityId" uuid,
        "relatedEntityType" character varying,
        "isRead" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for notifications
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_userId" ON "notifications"("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_userId_isRead" ON "notifications"("userId", "isRead")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop notifications table and indexes
    await queryRunner.query(`DROP INDEX "IDX_notifications_userId_isRead"`);
    await queryRunner.query(`DROP INDEX "IDX_notifications_userId"`);
    await queryRunner.query(`DROP TABLE "notifications"`);

    // Remove columns from matches table
    await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_matches_winner"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "message"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "winnerId"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "selectedMaps"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "bestOf"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "status"`);
  }
}
