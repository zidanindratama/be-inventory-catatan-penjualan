import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
});
export class RegisterDto extends createZodDto(RegisterSchema) {}

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export class LoginDto extends createZodDto(LoginSchema) {}
