import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTodoSectionDto, ReorderTodoSectionsDto, UpdateTodoSectionDto } from './dto/todo-section.dto';
import { TodoSection } from './entities/todo-section.entity';
import { TodoItem } from './entities/todo.entity';

const DEFAULT_COLOR = '#2f6fed';

@Injectable()
export class TodoSectionsService {
  constructor(
    @InjectRepository(TodoSection) private readonly sections: Repository<TodoSection>,
    @InjectRepository(TodoItem) private readonly todos: Repository<TodoItem>,
  ) {}

  findAll(): Promise<TodoSection[]> {
    return this.sections.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
  }

  async create(dto: CreateTodoSectionDto): Promise<TodoSection> {
    const name = this.normalizeName(dto.name);
    const last = await this.sections.find({ order: { sortOrder: 'DESC', id: 'DESC' }, take: 1 });
    return this.sections.save(
      this.sections.create({
        name,
        color: dto.color ?? DEFAULT_COLOR,
        sortOrder: (last[0]?.sortOrder ?? -1) + 1,
      }),
    );
  }

  async update(id: number, dto: UpdateTodoSectionDto): Promise<TodoSection> {
    const section = await this.get(id);
    if (dto.name !== undefined) section.name = this.normalizeName(dto.name);
    if (dto.color !== undefined) section.color = dto.color;
    return this.sections.save(section);
  }

  async reorder(dto: ReorderTodoSectionsDto): Promise<TodoSection[]> {
    const all = await this.sections.find();
    const known = new Map(all.map((s) => [s.id, s]));
    const ordered: TodoSection[] = [];
    for (const id of dto.ids) {
      const section = known.get(id);
      if (!section || ordered.includes(section)) continue;
      section.sortOrder = ordered.length;
      ordered.push(section);
    }
    for (const section of all) {
      if (ordered.includes(section)) continue;
      section.sortOrder = ordered.length;
      ordered.push(section);
    }
    await this.sections.save(ordered);
    return this.findAll();
  }

  async remove(id: number, items: 'unassign' | 'delete'): Promise<{ ok: boolean }> {
    await this.get(id);
    if (items === 'delete') await this.todos.delete({ sectionId: id });
    else await this.todos.update({ sectionId: id }, { sectionId: null });
    await this.sections.delete({ id });
    return { ok: true };
  }

  private async get(id: number): Promise<TodoSection> {
    const section = await this.sections.findOne({ where: { id } });
    if (!section) throw new NotFoundException('Раздел не найден');
    return section;
  }

  private normalizeName(name: string): string {
    const value = name.trim();
    if (!value) throw new BadRequestException('Введите название раздела');
    return value;
  }
}
