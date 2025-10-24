import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  list(query: { q?: string; page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const take = query.limit ?? 20;
    const where: Prisma.ItemWhereInput = query.q
      ? { name: { contains: query.q, mode: Prisma.QueryMode.insensitive } }
      : {};
    return this.prisma.item.findMany({
      where,
      skip: (page - 1) * take,
      take,
      orderBy: { name: 'asc' },
    });
  }

  get(id: string) {
    return this.prisma.item.findUnique({ where: { id } });
  }

  async create(data: any) {
    return this.prisma.item.create({ data });
  }

  async update(id: string, data: any) {
    const exist = await this.get(id);
    if (!exist) throw new NotFoundException('Item not found');
    return this.prisma.item.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.prisma.item.delete({ where: { id } });
    return { id };
  }
}
