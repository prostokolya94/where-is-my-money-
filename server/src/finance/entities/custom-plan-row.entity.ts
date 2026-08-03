import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CustomPlan } from './custom-plan.entity';

@Entity('custom_plan_row')
export class CustomPlanRow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'plan_id', type: 'integer' })
  planId: number;

  @ManyToOne(() => CustomPlan, (plan) => plan.rows, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: CustomPlan;

  @Column({ type: 'text' })
  date: string;

  /** Сумма списания по плану. */
  @Column({ type: 'real' })
  amount: number;

  /** Ручное переопределение «перед платежом» (null — авторасчёт). */
  @Column({ name: 'override_before', type: 'real', nullable: true })
  overrideBefore: number | null;

  /** Авторасчёт «перед», действовавший на момент ручного переопределения. */
  @Column({ name: 'override_snapshot', type: 'real', nullable: true })
  overrideSnapshot: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
