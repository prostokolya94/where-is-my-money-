import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('todo_item')
export class TodoItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'boolean', default: false })
  done: boolean;

  @Column({ name: 'due_date', type: 'text', nullable: true })
  dueDate: string | null;

  @Column({ name: 'done_at', type: 'datetime', nullable: true })
  doneAt: Date | null;

  @Column({ name: 'section_id', type: 'integer', nullable: true })
  sectionId: number | null;

  @Column({ name: 'parent_id', type: 'integer', nullable: true })
  parentId: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
