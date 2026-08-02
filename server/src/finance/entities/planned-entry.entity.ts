import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type EntryType = 'expense' | 'income';

@Entity('planned_entry')
export class PlannedEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  date: string;

  @Column({ type: 'text' })
  type: EntryType;

  @Column({ type: 'real' })
  amount: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
