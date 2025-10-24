import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

type GroupBy = 'day' | 'week' | 'month';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  private buildCreatedAtWhere(dateFrom?: Date, dateTo?: Date) {
    const createdAt: any = {};
    if (dateFrom) createdAt.gte = dateFrom;
    if (dateTo) createdAt.lte = dateTo;
    return Object.keys(createdAt).length ? { createdAt } : {};
  }

  private bucketKey(d: Date, by: GroupBy) {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();

    const yyyy = String(y);
    const mm = String(m).padStart(2, '0');
    const dd = String(day).padStart(2, '0');

    if (by === 'day') return `${yyyy}-${mm}-${dd}`;
    if (by === 'week') {
      const copy = new Date(Date.UTC(y, d.getMonth(), d.getDate()));
      const dayNum = copy.getUTCDay() || 7;
      copy.setUTCDate(copy.getUTCDate() + (1 - dayNum));
      return `W:${copy.toISOString().slice(0, 10)}`;
    }
    return `${yyyy}-${mm}`;
  }

  async summary(dateFrom?: Date, dateTo?: Date) {
    const where = this.buildCreatedAtWhere(dateFrom, dateTo);
    const entries = await this.prisma.finance.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    const omset = entries.reduce((s, e) => s + e.income, 0);
    const pengeluaran = entries.reduce((s, e) => s + e.expense, 0);
    const saldoAkhir = entries.at(-1)?.balanceAfter ?? 0;

    const items = await this.prisma.item.findMany({
      select: { stock: true, costPrice: true },
    });
    const modalStok = items.reduce((s, i) => s + i.stock * i.costPrice, 0);

    return {
      omset,
      pengeluaran,
      sisaUang: omset - pengeluaran,
      saldoAkhir,
      modalStok,
    };
  }

  async cashflow(dateFrom?: Date, dateTo?: Date) {
    const where = this.buildCreatedAtWhere(dateFrom, dateTo);
    const rows = await this.prisma.finance.findMany({
      where,
      include: { transaction: { select: { type: true } } },
    });

    const map = new Map<string, { income: number; expense: number }>();
    for (const r of rows) {
      const key = r.transaction?.type ?? 'OTHER';
      const cur = map.get(key) ?? { income: 0, expense: 0 };
      cur.income += r.income;
      cur.expense += r.expense;
      map.set(key, cur);
    }

    return Array.from(map, ([type, v]) => ({
      type,
      income: v.income,
      expense: v.expense,
      net: v.income - v.expense,
    }));
  }

  async trend(by: GroupBy, dateFrom?: Date, dateTo?: Date) {
    const where = this.buildCreatedAtWhere(dateFrom, dateTo);
    const rows = await this.prisma.finance.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    const buckets: Record<
      string,
      { income: number; expense: number; lastBalance?: number }
    > = {};

    let running = 0;
    for (const r of rows) {
      running = r.balanceAfter;
      const key = this.bucketKey(r.createdAt, by);
      buckets[key] ??= { income: 0, expense: 0 };
      buckets[key].income += r.income;
      buckets[key].expense += r.expense;
      buckets[key].lastBalance = running;
    }

    return Object.entries(buckets).map(([period, v]) => ({
      period,
      income: v.income,
      expense: v.expense,
      net: v.income - v.expense,
      balance: v.lastBalance ?? running,
    }));
  }

  async grossProfit(dateFrom?: Date, dateTo?: Date) {
    const whereTrx: any = { type: 'SALE' as const };
    if (dateFrom || dateTo) whereTrx.date = {};
    if (dateFrom) whereTrx.date.gte = dateFrom;
    if (dateTo) whereTrx.date.lte = dateTo;

    const sales = await this.prisma.transaction.findMany({
      where: whereTrx,
      select: {
        items: { select: { qty: true, unitCost: true, subtotalSell: true } },
      },
    });

    let income = 0;
    let cogs = 0;
    for (const t of sales) {
      for (const it of t.items) {
        income += it.subtotalSell ?? 0;
        cogs += it.qty * it.unitCost;
      }
    }

    const grossProfit = income - cogs;
    const marginPct = income ? (grossProfit / income) * 100 : 0;

    return { income, cogs, grossProfit, marginPct };
  }

  async paymentBreakdown(dateFrom?: Date, dateTo?: Date) {
    const where: any = { type: 'SALE' as const };
    if (dateFrom || dateTo) where.date = {};
    if (dateFrom) where.date.gte = dateFrom;
    if (dateTo) where.date.lte = dateTo;

    const sales = await this.prisma.transaction.findMany({
      where,
      select: {
        items: { select: { subtotalSell: true } },
        payment: { select: { method: true, amount: true } },
      },
    });

    const bucket = {
      CASH: { amount: 0, count: 0 },
      TRANSFER: { amount: 0, count: 0 },
      UNPAID: { amount: 0, count: 0 },
    };

    for (const s of sales) {
      const total = s.items.reduce((a, i) => a + (i.subtotalSell ?? 0), 0);
      if (s.payment) {
        const key = s.payment.method as 'CASH' | 'TRANSFER';
        bucket[key].amount += s.payment.amount;
        bucket[key].count += 1;
      } else {
        bucket.UNPAID.amount += total;
        bucket.UNPAID.count += 1;
      }
    }

    return bucket;
  }

  async topItems(limit = 10, dateFrom?: Date, dateTo?: Date) {
    const where: any = { type: 'SALE' as const };
    if (dateFrom || dateTo) where.date = {};
    if (dateFrom) where.date.gte = dateFrom;
    if (dateTo) where.date.lte = dateTo;

    const sales = await this.prisma.transaction.findMany({
      where,
      select: {
        items: { select: { itemId: true, qty: true, subtotalSell: true } },
      },
    });

    const map = new Map<string, { qty: number; omzet: number }>();
    for (const t of sales) {
      for (const i of t.items) {
        const cur = map.get(i.itemId) ?? { qty: 0, omzet: 0 };
        cur.qty += i.qty;
        cur.omzet += i.subtotalSell ?? 0;
        map.set(i.itemId, cur);
      }
    }

    const arr = Array.from(map, ([itemId, v]) => ({ itemId, ...v }));
    arr.sort((a, b) => b.omzet - a.omzet);

    // Ambil nama item
    const picked = arr.slice(0, Math.max(0, limit));
    const ids = picked.map((a) => a.itemId);
    const items = ids.length
      ? await this.prisma.item.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true },
        })
      : [];
    const nameById = Object.fromEntries(items.map((i) => [i.id, i.name]));

    return picked.map((r) => ({
      itemId: r.itemId,
      name: nameById[r.itemId] ?? r.itemId,
      qty: r.qty,
      omzet: r.omzet,
    }));
  }

  async statement(params: {
    from?: Date;
    to?: Date;
    q?: string;
    page?: number;
    limit?: number;
  }) {
    const { from, to, q, page = 1, limit = 20 } = params;

    const where: any = this.buildCreatedAtWhere(from, to);
    if (q) where.description = { contains: q, mode: 'insensitive' as const };

    const [rows, total] = await Promise.all([
      this.prisma.finance.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.finance.count({ where }),
    ]);

    return {
      page,
      limit,
      total,
      data: rows.map((r) => ({
        id: r.id,
        date: r.createdAt,
        description: r.description,
        income: r.income,
        expense: r.expense,
        balanceAfter: r.balanceAfter,
      })),
    };
  }
}
