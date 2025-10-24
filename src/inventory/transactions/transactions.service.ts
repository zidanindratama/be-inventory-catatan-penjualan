import { BadRequestException, Injectable } from '@nestjs/common';
import { TxType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: any, userId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const lines = await Promise.all(
        dto.lines.map(async (l) => {
          const item = await tx.item.findUnique({ where: { id: l.itemId } });
          if (!item) throw new BadRequestException('Item not found');

          const unitCost = l.unitCost ?? item.costPrice;
          const unitPrice = l.unitPrice ?? item.sellPrice;

          let delta = 0;
          if (dto.type === 'STOCK_IN') delta = l.qty;
          if (dto.type === 'SALE') delta = -l.qty;
          if (dto.type === 'REJECT') delta = -l.qty;
          if (dto.type === 'ADJUST') delta = l.qty;

          const newStock = item.stock + delta;
          if (newStock < 0)
            throw new BadRequestException(`Stock not enough for ${item.name}`);

          await tx.item.update({
            where: { id: item.id },
            data: { stock: newStock },
          });

          return {
            itemId: item.id,
            qty: l.qty,
            unitCost,
            unitPrice: dto.type === 'SALE' ? unitPrice : null,
            subtotalCost: unitCost * l.qty,
            subtotalSell: dto.type === 'SALE' ? unitPrice * l.qty : null,
          };
        }),
      );

      const trx = await tx.transaction.create({
        data: {
          type: dto.type as TxType,
          date: dto.date ?? new Date(),
          note: dto.note,
          createdById: userId,
          items: { create: lines },
          payment:
            dto.type === 'SALE' && dto.payment
              ? { create: dto.payment }
              : undefined,
        },
        include: { items: true, payment: true },
      });

      const income =
        dto.type === 'SALE'
          ? lines.reduce((s, i) => s + (i.subtotalSell ?? 0), 0)
          : 0;
      const expense =
        dto.type === 'STOCK_IN' ||
        dto.type === 'REJECT' ||
        dto.type === 'ADJUST'
          ? lines.reduce((s, i) => s + i.subtotalCost, 0) *
            (dto.type === 'STOCK_IN' ? 1 : 0)
          : 0;

      const last = await tx.finance.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      const balanceAfter = (last?.balanceAfter ?? 0) + income - expense;

      await tx.finance.create({
        data: {
          transactionId: trx.id,
          description:
            dto.type === 'SALE'
              ? 'Omset penjualan'
              : dto.type === 'STOCK_IN'
                ? 'Modal belanja stok'
                : dto.type === 'REJECT'
                  ? 'Barang reject (non-omset)'
                  : 'Penyesuaian stok',
          income,
          expense,
          balanceAfter,
        },
      });

      return trx;
    });
  }

  list() {
    return this.prisma.transaction.findMany({
      orderBy: { date: 'desc' },
      include: { items: true, payment: true, financeEntry: true },
    });
  }
}
