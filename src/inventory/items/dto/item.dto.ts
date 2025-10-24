import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

const OptionalUrl = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.string().url(),
);

export const CreateItemSchema = z.object({
  name: z
    .string()
    .min(1)
    .transform((s) => s.trim()),
  costPrice: z.coerce.number().int().nonnegative(),
  sellPrice: z.coerce.number().int().nonnegative(),
  stock: z.coerce.number().int().nonnegative().optional().default(0),
  imageUrl: OptionalUrl.optional(),
});

export class CreateItemDto extends createZodDto(CreateItemSchema) {}

export const UpdateItemSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .transform((s) => s.trim())
      .optional(),
    costPrice: z.coerce.number().int().nonnegative().optional(),
    sellPrice: z.coerce.number().int().nonnegative().optional(),
    stock: z.coerce.number().int().nonnegative().optional(),
    imageUrl: OptionalUrl.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Body must contain at least one field',
  });

export class UpdateItemDto extends createZodDto(UpdateItemSchema) {}
