import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dev/staging ref account (see 1741000000000). Must stay `ref` so dispute moderation
 * yields REF_DECIDED (appealable). If this user is `admin`, they seal as FINAL and
 * players never see "Dispute ref decision".
 */
export class EnsureRefUserRoleRef1741600000000 implements MigrationInterface {
  name = 'EnsureRefUserRoleRef1741600000000';

  private readonly refUserId = '7bff1037-63ab-4d7a-948c-eb3ed7fea64e';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "users" SET "role" = 'ref' WHERE "id" = $1`, [
      this.refUserId,
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot restore previous role; no-op
  }
}
