import { z } from 'zod'

export const createOrderSchema = z.object({
  customerId: z.union([z.string(), z.number()]).refine(
    (value) => value !== undefined && value !== null,
    { message: 'ID Pelanggan wajib diisi' }
  ),
  totalAmount: z.union([
    z.number(),
    z.string().regex(/^\d+(\.\d{1,2})?$/, { message: 'Format total nominal tidak valid' })
  ]).refine(
    (value) => value !== undefined && value !== null,
    { message: 'Total nominal wajib diisi' }
  ),
  items: z.array(
    z.object({
      productId: z.union([z.string(), z.number()]).nullable().optional(),
      bundleId: z.union([z.string(), z.number()]).nullable().optional(),
      quantity: z.number({ message: 'Jumlah item wajib diisi' })
        .int({ message: 'Jumlah item harus berupa bilangan bulat' })
        .min(1, { message: 'Jumlah item minimal 1' }),
      priceAtPurchase: z.union([
        z.number(),
        z.string().regex(/^\d+(\.\d{1,2})?$/, { message: 'Format harga pembelian tidak valid' })
      ]).refine(
        (value) => value !== undefined && value !== null,
        { message: 'Harga pembelian wajib diisi' }
      ),
      details: z.array(
        z.object({
          attributeId: z.union([z.string(), z.number()]).refine(
            (value) => value !== undefined && value !== null,
            { message: 'ID Atribut wajib diisi' }
          ),
          selectedOptionId: z.union([z.string(), z.number()]).nullable().optional(),
          customValue: z.string().nullable().optional()
        })
      , { message: 'Detail kustomisasi item wajib diisi' })
    })
  , { message: 'Item pesanan wajib diisi' })
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
