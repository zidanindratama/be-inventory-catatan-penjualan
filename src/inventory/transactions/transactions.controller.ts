import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import {
  CreateTransactionDto,
  CreateTransactionSchema,
} from './dto/transaction.dto';
import { AuthGuard } from '@nestjs/passport';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { Role } from '@prisma/client';
import { Auth } from 'src/common/decorators/auth.decorator';

@Auth(Role.ADMIN)
@Controller('transactions')
@UseGuards(AuthGuard('jwt'))
export class TransactionsController {
  constructor(private svc: TransactionsService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  @UsePipes(new ZodValidationPipe(CreateTransactionSchema))
  create(@Body() dto: CreateTransactionDto) {
    return this.svc.create(dto);
  }
}
