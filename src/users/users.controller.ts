import {
  Controller,
  Get,
  Param,
  Query,
  Patch,
  Body,
  Delete,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Role } from '@prisma/client';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { UpdateUserDto, UpdateUserSchema } from './dto/update-user.dto';
import { Request } from 'express';
import { Auth } from 'src/common/decorators/auth.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @Auth()
  getMe(@Req() req: Request) {
    const user = req.user as { sub?: string; id?: string } | undefined;
    const userId = user?.sub ?? user?.id;
    return this.usersService.getById(String(userId));
  }

  @Get()
  @Auth(Role.ADMIN)
  list(
    @Query('q') q?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('role') role?: Role,
  ) {
    return this.usersService.list({ q, page, limit, role });
  }

  @Get(':id')
  @Auth(Role.ADMIN)
  getById(@Param('id') id: string) {
    return this.usersService.getById(id);
  }

  @Patch(':id')
  @Auth(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateUserSchema)) body: UpdateUserDto,
  ) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  @Auth(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
