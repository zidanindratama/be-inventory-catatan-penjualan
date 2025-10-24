import { z } from 'zod';
import { PayMethod, TxType } from '@prisma/client';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

const TransactionLineSchemaBase = z.object({
  itemId: objectId,
  qty: z.coerce.number().int(),
  unitCost: z.number().int().nonnegative().optional(),
  unitPrice: z.number().int().nonnegative().optional(),
});

const PaymentSchema = z.object({
  method: z.nativeEnum(PayMethod),
  amount: z.number().int().positive(),
  transferRef: z.string().trim().optional(),
});

export const CreateTransactionSchema = z
  .object({
    type: z.nativeEnum(TxType),
    date: z.coerce.date().optional(),
    note: z.string().trim().optional(),
    lines: z.array(TransactionLineSchemaBase).min(1),
    payment: PaymentSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.payment && val.type !== 'SALE') {
      ctx.addIssue({
        code: 'custom',
        path: ['payment'],
        message: 'Payment hanya boleh untuk tipe SALE',
      });
    }

    val.lines.forEach((line, idx) => {
      const path: (string | number)[] = ['lines', idx, 'qty'];

      if (val.type === 'ADJUST') {
        if (line.qty === 0) {
          ctx.addIssue({
            code: 'custom',
            path,
            message: 'Untuk ADJUST, qty tidak boleh 0 (boleh negatif/positif)',
          });
        }
      } else {
        if (!(line.qty > 0)) {
          ctx.addIssue({
            code: 'custom',
            path,
            message: 'Untuk SALE/STOCK_IN/REJECT, qty harus > 0',
          });
        }
      }
    });
  });

export type CreateTransactionDto = z.infer<typeof CreateTransactionSchema>;
