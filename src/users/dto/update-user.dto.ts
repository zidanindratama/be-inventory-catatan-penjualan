import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'USER']).optional(),
});

export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}
