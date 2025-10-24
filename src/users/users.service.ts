import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

const userSafeSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async list(query: {
    q?: string;
    page?: number;
    limit?: number;
    role?: Role;
  }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const take = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const skip = (page - 1) * take;

    const where: Prisma.UserWhereInput = {
      ...(query.q
        ? {
            OR: [
              {
                name: { contains: query.q, mode: Prisma.QueryMode.insensitive },
              },
              {
                email: {
                  contains: query.q,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : {}),
      ...(query.role ? { role: query.role } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: userSafeSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit: take,
        total,
        totalPages: Math.max(1, Math.ceil(total / take)),
      },
    };
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSafeSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(
    id: string,
    data: Partial<
      Pick<Prisma.UserUncheckedUpdateInput, 'name' | 'email' | 'role'>
    >,
  ) {
    const exist = await this.prisma.user.findUnique({ where: { id } });
    if (!exist) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id },
      data,
      select: userSafeSelect,
    });
  }

  async remove(id: string) {
    const exist = await this.prisma.user.findUnique({ where: { id } });
    if (!exist) throw new NotFoundException('User not found');
    await this.prisma.user.delete({ where: { id } });
    return { id };
  }
}
