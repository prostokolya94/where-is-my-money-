import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { CustomPlanRow } from './custom-plan-row.entity';

@Entity('custom_plan')
export class CustomPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  title: string;

  /** Метка (метка) для автоподтягивания расходов из календаря (без учёта регистра). */
  @Column({ type: 'text' })
  label: string;

  /** Начальное состояние цели (корректируемый баланс). */
  @Column({ type: 'real', default: 0 })
  initialBalance: number;

  @Column({ type: 'integer', default: 0 })
  order: number;

  @OneToMany(() => CustomPlanRow, (row) => row.plan, { cascade: true })
  rows: CustomPlanRow[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
