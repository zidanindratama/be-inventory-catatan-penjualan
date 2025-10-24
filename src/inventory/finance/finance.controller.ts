import { Controller, Get, Query } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { Auth } from '../../common/decorators/auth.decorator';

@Auth()
@Controller('finance')
export class FinanceController {
  constructor(private svc: FinanceService) {}

  @Get('summary')
  summary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.summary(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('cashflow')
  cashflow(@Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.cashflow(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('trend')
  trend(
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const by = (['day', 'week', 'month'] as const).includes(groupBy)
      ? groupBy
      : 'day';
    return this.svc.trend(
      by,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('gross-profit')
  grossProfit(@Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.grossProfit(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('payment-breakdown')
  paymentBreakdown(@Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.paymentBreakdown(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('top-items')
  topItems(
    @Query('limit') limit = '10',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const n = Number.parseInt(limit, 10);
    return this.svc.topItems(
      Number.isFinite(n) && n > 0 ? n : 10,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('statement')
  statement(@Query() q: any) {
    const page = q.page ? Number.parseInt(q.page, 10) : 1;
    const limit = q.limit ? Number.parseInt(q.limit, 10) : 20;

    return this.svc.statement({
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      q: q.q,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
    });
  }
}
