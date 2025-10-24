import {
  Body,
  Controller,
  Post,
  UseGuards,
  Req,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import {
  LoginSchema,
  RegisterSchema,
  RegisterInput,
  LoginInput,
} from './dto/auth.dto';
import { Request } from 'express';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('auth')
export class AuthController {
  constructor(private svc: AuthService) {}

  @Post('register')
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  register(@Body() dto: RegisterInput) {
    return this.svc.register(dto);
  }

  @Post('login')
  @UsePipes(new ZodValidationPipe(LoginSchema))
  login(@Body() dto: LoginInput) {
    return this.svc.login(dto.email, dto.password);
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  refresh(@Req() req: Request) {
    const user = req.user as any;
    return this.svc.refresh(user.sub);
  }
}
