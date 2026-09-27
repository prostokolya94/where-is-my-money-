import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTodoDto, UpdateTodoDto } from './dto/todo.dto';
import { TodoSection } from './entities/todo-section.entity';
import { TodoItem } from './entities/todo.entity';

@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(TodoItem) private readonly repo: Repository<TodoItem>,
    @InjectRepository(TodoSection) private readonly sections: Repository<TodoSection>,
  ) {}

  async findAll(): Promise<TodoItem[]> {
    const items = await this.repo.find({ order: { id: 'ASC' } });
    return items.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.done) {
        const doneLeft = a.doneAt ? a.doneAt.getTime() : 0;
        const doneRight = b.doneAt ? b.doneAt.getTime() : 0;
        return doneRight - doneLeft || b.id - a.id;
      }
      const left = a.dueDate ?? '9999-12-31';
      const right = b.dueDate ?? '9999-12-31';
      return left.localeCompare(right) || a.id - b.id;
    });
  }

  async create(dto: CreateTodoDto): Promise<TodoItem> {
    const title = dto.title.trim();
    if (!title) throw new BadRequestException('Введите название дела');

    const parentId = await this.checkParent(dto.parentId, null);
    const sectionId =
      parentId === null
        ? await this.checkSection(dto.sectionId)
        : await this.parentSection(parentId);

    const done = dto.done ?? false;
    const item = this.repo.create({
      title,
      done,
      doneAt: done ? new Date() : null,
      dueDate: dto.dueDate ?? null,
      sectionId,
      parentId,
    });
    return this.repo.save(item);
  }

  async update(id: number, dto: UpdateTodoDto): Promise<TodoItem> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Дело не найдено');

    if (dto.title !== undefined) {
      const title = dto.title.trim();
      if (!title) throw new BadRequestException('Введите название дела');
      item.title = title;
    }
    if (dto.dueDate !== undefined) item.dueDate = dto.dueDate;
    if (dto.parentId !== undefined) {
      const parentId = await this.checkParent(dto.parentId, id);
      item.parentId = parentId;
      if (parentId !== null) {
        if (dto.sectionId === undefined) item.sectionId = await this.parentSection(parentId);
        else await this.checkSection(dto.sectionId);
      } else if (dto.sectionId !== undefined) {
        item.sectionId = await this.checkSection(dto.sectionId);
      }
    } else if (dto.sectionId !== undefined) {
      item.sectionId = item.parentId === null ? await this.checkSection(dto.sectionId) : await this.parentSection(item.parentId);
    }
    if (dto.done !== undefined) {
      item.done = dto.done;
      item.doneAt = dto.done ? new Date() : null;
    }
    return this.repo.save(item);
  }

  async remove(id: number, children: 'cascade' | 'promote'): Promise<{ ok: boolean }> {
    const node = await this.repo.findOne({ where: { id }, select: { id: true, parentId: true } });
    if (!node) throw new NotFoundException('Дело не найдено');

    if (children === 'promote') {
      await this.repo.update({ parentId: id }, { parentId: node.parentId });
      await this.repo.delete({ id });
      return { ok: true };
    }

    const all = await this.repo.find({ select: { id: true, parentId: true } });
    const byParent = new Map<number, number[]>();
    for (const t of all) {
      if (t.parentId === null) continue;
      const list = byParent.get(t.parentId) ?? [];
      list.push(t.id);
      byParent.set(t.parentId, list);
    }

    const ids = [id];
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift() as number;
      for (const child of byParent.get(current) ?? []) {
        ids.push(child);
        queue.push(child);
      }
    }
    await this.repo.delete(ids);
    return { ok: true };
  }

  private async checkSection(id: number | null | undefined): Promise<number | null> {
    if (id === undefined || id === null) return null;
    const section = await this.sections.findOne({ where: { id } });
    if (!section) throw new BadRequestException('Раздел не найден');
    return id;
  }

  private async parentSection(parentId: number): Promise<number | null> {
    const parent = await this.repo.findOne({ where: { id: parentId }, select: { sectionId: true } });
    return parent?.sectionId ?? null;
  }

  private async checkParent(id: number | null | undefined, selfId: number | null): Promise<number | null> {
    if (id === undefined || id === null) return null;
    const parent = await this.repo.findOne({ where: { id } });
    if (!parent) throw new BadRequestException('Родительское дело не найдено');
    if (selfId === null) return id;
    if (id === selfId) throw new BadRequestException('Дело нельзя вложить в себя');

    const seen = new Set<number>();
    let cursor: number | null = id;
    while (cursor !== null && !seen.has(cursor)) {
      if (cursor === selfId) throw new BadRequestException('Дело нельзя вложить в свою подзадачу');
      seen.add(cursor);
      const node = await this.repo.findOne({ where: { id: cursor }, select: { parentId: true } });
      cursor = node?.parentId ?? null;
    }
    return id;
  }
}
