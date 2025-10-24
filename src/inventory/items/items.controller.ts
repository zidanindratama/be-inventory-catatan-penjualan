import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ItemsService } from './items.service';
import {
  CreateItemDto,
  CreateItemSchema,
  UpdateItemDto,
  UpdateItemSchema,
} from './dto/item.dto';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { Auth } from 'src/common/decorators/auth.decorator';
import { Role } from '@prisma/client';

@Controller('items')
export class ItemsController {
  constructor(private svc: ItemsService) {}

  @Get()
  @Auth()
  list(
    @Query('q') q?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.svc.list({ q, page: Number(page), limit: Number(limit) });
  }

  @Get(':id')
  @Auth()
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Post()
  @Auth(Role.ADMIN)
  @UsePipes(new ZodValidationPipe(CreateItemSchema))
  create(@Body() dto: CreateItemDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Auth(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateItemSchema)) dto: UpdateItemDto,
  ) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Auth(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
