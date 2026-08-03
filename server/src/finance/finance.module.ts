import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BalanceService } from './balance.service';
import { DaysController } from './days.controller';
import { PlannedController } from './planned.controller';
import { RecurringController } from './recurring.controller';
import { CustomPlansController } from './custom-plans.controller';
import { DayBalance } from './entities/day-balance.entity';
import { PlannedEntry } from './entities/planned-entry.entity';
import { RecurringRule } from './entities/recurring-rule.entity';
import { CustomPlan } from './entities/custom-plan.entity';
import { CustomPlanRow } from './entities/custom-plan-row.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DayBalance, PlannedEntry, RecurringRule, CustomPlan, CustomPlanRow]),
  ],
  controllers: [DaysController, PlannedController, RecurringController, CustomPlansController],
  providers: [BalanceService],
})
export class FinanceModule {}
