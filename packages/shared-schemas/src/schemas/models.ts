import { z } from 'zod'

// ─────────────────────────────────────────
// CUSTOM BASE FIELD SCHEMAS
// ─────────────────────────────────────────

export const bigIntSchema = z.union([
  z.bigint(),
  z.number().int(),
  z.string().regex(/^\d+$/)
])

export const decimalSchema = z.union([
  z.number(),
  z.string().regex(/^\d+(\.\d+)?$/)
])

export const dateTimeSchema = z.union([
  z.date(),
  z.string().datetime(),
  z.string()
])

// ─────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────

export const roleSchema = z.enum(['admin', 'operator'])
export type Role = z.infer<typeof roleSchema>

export const inputTypeSchema = z.enum(['text', 'number', 'option', 'file'])
export type InputType = z.infer<typeof inputTypeSchema>

// ─────────────────────────────────────────
// DATABASE MODELS
// ─────────────────────────────────────────

export const userModelSchema = z.object({
  id: bigIntSchema.optional(),
  name: z.string().max(100),
  email: z.string().max(150).email(),
  password: z.string().max(255),
  role: roleSchema.default('admin'),
  createdAt: dateTimeSchema.optional(),
  updatedAt: dateTimeSchema.optional()
})
export type UserModel = z.infer<typeof userModelSchema>

export const customerModelSchema = z.object({
  id: bigIntSchema.optional(),
  name: z.string().max(100),
  generation: z.number().int().nullable().optional(),
  createdAt: dateTimeSchema.optional(),
  updatedAt: dateTimeSchema.optional()
})
export type CustomerModel = z.infer<typeof customerModelSchema>

export const productModelSchema = z.object({
  id: bigIntSchema.optional(),
  name: z.string().max(150),
  basePrice: decimalSchema,
  isActive: z.boolean().default(true),
  createdAt: dateTimeSchema.optional()
})
export type ProductModel = z.infer<typeof productModelSchema>

export const bundleModelSchema = z.object({
  id: bigIntSchema.optional(),
  name: z.string().max(150),
  description: z.string().nullable().optional(),
  bundlePrice: decimalSchema,
  isActive: z.boolean().default(true),
  createdAt: dateTimeSchema.optional()
})
export type BundleModel = z.infer<typeof bundleModelSchema>

export const bundleProductModelSchema = z.object({
  id: bigIntSchema.optional(),
  bundleId: bigIntSchema,
  productId: bigIntSchema,
  quantity: z.number().int().default(1)
})
export type BundleProductModel = z.infer<typeof bundleProductModelSchema>

export const productAttributeModelSchema = z.object({
  id: bigIntSchema.optional(),
  productId: bigIntSchema,
  attributeName: z.string().max(100),
  inputType: inputTypeSchema,
  isRequired: z.boolean().default(false)
})
export type ProductAttributeModel = z.infer<typeof productAttributeModelSchema>

export const attributeOptionModelSchema = z.object({
  id: bigIntSchema.optional(),
  attributeId: bigIntSchema,
  optionValue: z.string().max(255)
})
export type AttributeOptionModel = z.infer<typeof attributeOptionModelSchema>

export const orderModelSchema = z.object({
  id: bigIntSchema.optional(),
  invoiceNumber: z.string().max(50),
  recordedByUserId: bigIntSchema,
  customerId: bigIntSchema,
  totalAmount: decimalSchema,
  createdAt: dateTimeSchema.optional(),
  updatedAt: dateTimeSchema.optional()
})
export type OrderModel = z.infer<typeof orderModelSchema>

export const orderItemModelSchema = z.object({
  id: bigIntSchema.optional(),
  orderId: bigIntSchema,
  productId: bigIntSchema.nullable().optional(),
  bundleId: bigIntSchema.nullable().optional(),
  quantity: z.number().int().default(1),
  priceAtPurchase: decimalSchema
})
export type OrderItemModel = z.infer<typeof orderItemModelSchema>

export const orderItemDetailModelSchema = z.object({
  id: bigIntSchema.optional(),
  orderItemId: bigIntSchema,
  attributeId: bigIntSchema,
  selectedOptionId: bigIntSchema.nullable().optional(),
  customValue: z.string().nullable().optional()
})
export type OrderItemDetailModel = z.infer<typeof orderItemDetailModelSchema>

export const fulfillmentTypeSchema = z.enum(['pesan_vendor', 'ambil_stok'])
export type FulfillmentType = z.infer<typeof fulfillmentTypeSchema>

export const fulfillmentStatusSchema = z.enum([
  'null',
  'ambil_di_sekretariat',
  'menghubungi_vendor',
  'diproses_vendor',
  'diterima_dari_vendor',
  'belum_menghubungi_vendor'
])
export type FulfillmentStatus = z.infer<typeof fulfillmentStatusSchema>

export const productOrderSummaryModelSchema = z.object({
  id: bigIntSchema.optional(),
  name: z.string().max(150),
  orderStartedDate: dateTimeSchema,
  orderEndDate: dateTimeSchema,
  createdAt: dateTimeSchema.optional()
})
export type ProductOrderSummaryModel = z.infer<typeof productOrderSummaryModelSchema>

export const summaryProductModelSchema = z.object({
  id: bigIntSchema.optional(),
  summaryId: bigIntSchema,
  productId: bigIntSchema,
  totalQuantity: z.number().int().nonnegative(),
  fulfillmentType: fulfillmentTypeSchema.default('pesan_vendor'),
  fulfillmentStatus: fulfillmentStatusSchema.default('null')
})
export type SummaryProductModel = z.infer<typeof summaryProductModelSchema>
