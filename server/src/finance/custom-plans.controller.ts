import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomPlan } from './entities/custom-plan.entity';
import { CustomPlanRow } from './entities/custom-plan-row.entity';
import {
  CreateCustomPlanDto,
  CreateCustomPlanRowDto,
  UpdateCustomPlanDto,
  UpdateCustomPlanRowDto,
} from './dto/custom-plan.dto';

@Controller('api/custom-plans')
export class CustomPlansController {
  constructor(
    @InjectRepository(CustomPlan)
    private readonly planRepo: Repository<CustomPlan>,
    @InjectRepository(CustomPlanRow)
    private readonly rowRepo: Repository<CustomPlanRow>,
  ) {}

  @Get()
  async findAll() {
    const plans = await this.planRepo.find({ order: { order: 'ASC', id: 'ASC' } });
    const rows = await this.rowRepo.find({ order: { date: 'ASC', id: 'ASC' } });
    return plans.map((p) => ({ ...p, rows: rows.filter((r) => r.planId === p.id) }));
  }

  @Post()
  async create(@Body() dto: CreateCustomPlanDto) {
    if (!dto.title?.trim()) {
      throw new BadRequestException('Укажите название плана');
    }
    const count = await this.planRepo.count();
    return this.planRepo.save(
      this.planRepo.create({
        title: dto.title,
        label: dto.label?.trim() || dto.title,
        initialBalance: dto.initialBalance ?? 0,
        order: count,
      }),
    );
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomPlanDto) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('План не найден');
    if (dto.title !== undefined) plan.title = dto.title;
    if (dto.label !== undefined) plan.label = dto.label;
    if (dto.initialBalance !== undefined) plan.initialBalance = dto.initialBalance;
    return this.planRepo.save(plan);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.planRepo.delete({ id });
    return { ok: true };
  }

  @Post(':id/rows')
  async addRow(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateCustomPlanRowDto) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('План не найден');
    if (!(dto.amount > 0)) {
      throw new BadRequestException('Сумма должна быть больше нуля');
    }
    return this.rowRepo.save(
      this.rowRepo.create({
        planId: id,
        date: dto.date,
        amount: dto.amount,
        overrideBefore: dto.overrideBefore ?? null,
        overrideSnapshot: dto.overrideSnapshot ?? null,
      }),
    );
  }

  @Patch('rows/:rowId')
  async updateRow(@Param('rowId', ParseIntPipe) rowId: number, @Body() dto: UpdateCustomPlanRowDto) {
    const row = await this.rowRepo.findOne({ where: { id: rowId } });
    if (!row) throw new NotFoundException('Строка не найдена');
    if (dto.date !== undefined) row.date = dto.date;
    if (dto.amount !== undefined) row.amount = dto.amount;
    if (dto.overrideBefore !== undefined) {
      row.overrideBefore = dto.overrideBefore;
      if (dto.overrideBefore === null) row.overrideSnapshot = null;
    }
    if (dto.overrideSnapshot !== undefined) row.overrideSnapshot = dto.overrideSnapshot;
    return this.rowRepo.save(row);
  }

  @Delete('rows/:rowId')
  async removeRow(@Param('rowId', ParseIntPipe) rowId: number) {
    await this.rowRepo.delete({ id: rowId });
    return { ok: true };
  }
}
