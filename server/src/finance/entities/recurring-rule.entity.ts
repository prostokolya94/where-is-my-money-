import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntryType } from './planned-entry.entity';

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

@Entity('recurring_rule')
export class RecurringRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  type: EntryType;

  @Column({ type: 'real' })
  amount: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'text' })
  frequency: Frequency;

  @Column({ type: 'text' })
  startDate: string;

  @Column({ type: 'text', nullable: true })
  endDate: string | null;

  /** 0=Пн .. 6=Вс (для weekly) */
  @Column({ type: 'integer', nullable: true })
  dayOfWeek: number | null;

  /** 1..31 (для monthly и yearly) */
  @Column({ type: 'integer', nullable: true })
  dayOfMonth: number | null;

  /** 1..12 (для yearly) */
  @Column({ type: 'integer', nullable: true })
  monthOfYear: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
