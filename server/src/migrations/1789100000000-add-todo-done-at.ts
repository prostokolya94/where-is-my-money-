import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTodoDoneAt1789100000000 implements MigrationInterface {
  name = 'AddTodoDoneAt1789100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.query(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='todo_item'`,
    );
    if (table.length === 0) return;

    const columns = await queryRunner.query(`PRAGMA table_info(todo_item)`);
    if (!columns.some((c) => c.name === 'done_at')) {
      await queryRunner.query(`ALTER TABLE todo_item ADD COLUMN done_at datetime`);
    }

    await queryRunner.query(
      `UPDATE todo_item SET done_at = updated_at WHERE done = 1 AND done_at IS NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.query(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='todo_item'`,
    );
    if (table.length === 0) return;
    await queryRunner.query(`UPDATE todo_item SET done_at = NULL WHERE done = 0`);
  }
}
