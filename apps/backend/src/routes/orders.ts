import { createRoute, z } from "@hono/zod-openapi"

// ─────────────────────────────────────────
// SCHEMAS DEFINITION
// ─────────────────────────────────────────

export const orderResponseSchema = z.object({
  id: z.string().openapi({ description: "Order ID (String)", example: "1" }),
  invoiceNumber: z.string().openapi({ description: "Nomor Invoice Nota Pesanan", example: "INV-20260618-001" }),
  recordedByUserId: z.string().openapi({ description: "User ID yang mencatat transaksi", example: "1" }),
  customerId: z.string().openapi({ description: "Customer ID pembeli", example: "1" }),
  totalAmount: z.string().openapi({ description: "Total Nilai Transaksi", example: "120000.00" }),
  createdAt: z.string().openapi({ description: "Tanggal Transaksi Dibuat", example: "2026-06-18T00:00:00Z" })
}).openapi('OrderResponse')

export const orderItemDetailResponseSchema = z.object({
  id: z.string().openapi({ example: "1" }),
  attributeId: z.string().openapi({ example: "2" }),
  selectedOptionId: z.string().nullable().openapi({ example: "5" }),
  customValue: z.string().nullable().openapi({ example: "Custom Text" }),
  attributeName: z.string().openapi({ example: "Ukuran" }),
  inputType: z.string().openapi({ example: "text" }),
  selectedOptionValue: z.string().nullable().openapi({ example: "L" })
}).openapi('OrderItemDetailResponse')

export const orderItemResponseSchema = z.object({
  id: z.string().openapi({ example: "1" }),
  productId: z.string().nullable().openapi({ example: "3" }),
  bundleId: z.string().nullable().openapi({ example: "2" }),
  quantity: z.number().openapi({ example: 1 }),
  priceAtPurchase: z.string().openapi({ example: "120000.00" }),
  product: z.object({
    id: z.string(),
    name: z.string(),
    basePrice: z.string()
  }).nullable().optional(),
  bundle: z.object({
    id: z.string(),
    name: z.string(),
    bundlePrice: z.string()
  }).nullable().optional(),
  details: z.array(orderItemDetailResponseSchema)
}).openapi('OrderItemResponse')

export const orderDetailResponseSchema = orderResponseSchema.extend({
  customer: z.object({
    id: z.string(),
    name: z.string(),
    generation: z.number().nullable()
  }).nullable(),
  recordedByUser: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.string()
  }).nullable(),
  items: z.array(orderItemResponseSchema)
}).openapi('OrderDetailResponse')

export const orderItemDetailCreateSchema = z.object({
  attributeId: z.string().openapi({ description: "ID Atribut Kustomisasi Produk", example: "2" }),
  selectedOptionId: z.string().optional().nullable().openapi({ description: "ID Opsi Jawaban Pilihan Ganda (opsional)", example: "5" }),
  customValue: z.string().optional().nullable().openapi({ description: "Nilai kustomisasi input bebas (opsional)", example: "Custom Text" })
}).openapi('OrderItemDetailCreate')

export const orderItemCreateSchema = z.object({
  productId: z.string().optional().nullable().openapi({ description: "ID Produk Satuan", example: "3" }),
  bundleId: z.string().optional().nullable().openapi({ description: "ID Paket Bundling", example: "2" }),
  quantity: z.number().int().min(1).openapi({ description: "Kuantitas pembelian", example: 1 }),
  details: z.array(orderItemDetailCreateSchema).optional().openapi({ description: "Form kustomisasi atribut" })
}).openapi('OrderItemCreate')

export const createOrderRequestSchema = z.object({
  invoiceNumber: z.string().min(1).max(50).openapi({ description: "Nomor Invoice Nota Pesanan (Unique)", example: "INV-20260618-001" }),
  customerName: z.string().min(1).max(100).openapi({ description: "Nama Customer/Pelanggan", example: "John Doe" }),
  customerGeneration: z.number().int().optional().nullable().openapi({ description: "Angkatan/Generasi Customer (opsional)", example: 2024 }),
  items: z.array(orderItemCreateSchema).min(1).openapi({ description: "Daftar item produk satuan / bundling dalam pesanan" })
}).openapi('CreateOrderRequest')

export const errorResponseSchema = z.object({
  error: z.string().openapi({ example: "Terjadi kesalahan" }),
  detail: z.string().optional().openapi({ example: "Stack trace info" })
}).openapi('ErrorResponse')

// ─────────────────────────────────────────
// ROUTE CONTRACTS
// ─────────────────────────────────────────

export const createOrderRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Orders'],
  summary: 'Membuat Nota Pesanan Baru',
  description: 'Mencatat transaksi baru, mengunci harga, dan menyimpan kustomisasi. Terbuka untuk Admin & Operator.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: createOrderRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: orderDetailResponseSchema,
        },
      },
      description: 'Nota pesanan berhasil dibuat',
    },
    400: {
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
      description: 'Payload request tidak valid atau invoice duplikat',
    },
    401: {
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
      description: 'Unauthorized: Sesi tidak aktif',
    },
    500: {
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
      description: 'Kesalahan internal server',
    }
  }
})

export const listOrdersRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Orders'],
  summary: 'Daftar Riwayat Nota Pesanan',
  description: 'Mengambil daftar riwayat transaksi. Seluruh pengguna (Admin & Operator) dapat melihat seluruh data pesanan.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(orderDetailResponseSchema),
        },
      },
      description: 'Daftar riwayat transaksi berhasil diambil',
    },
    401: {
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
      description: 'Unauthorized: Sesi tidak aktif',
    },
    500: {
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
      description: 'Kesalahan internal server',
    }
  }
})

export const getOrderDetailRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Orders'],
  summary: 'Detail Riwayat Nota Pesanan',
  description: 'Mengambil informasi lengkap spesifik satu nota pesanan berdasarkan ID. Seluruh pengguna (Admin & Operator) berwenang melihat detail transaksi.',
  request: {
    params: z.object({
      id: z.string().openapi({ description: "ID Nota Pesanan", example: "1" })
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: orderDetailResponseSchema,
        },
      },
      description: 'Detail nota pesanan ditemukan',
    },
    401: {
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
      description: 'Unauthorized: Sesi tidak aktif',
    },
    403: {
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
      description: 'Forbidden: Operator tidak berwenang melihat transaksi operator lain',
    },
    404: {
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
      description: 'Nota pesanan tidak ditemukan',
    },
    500: {
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
      description: 'Kesalahan internal server',
    }
  }
})
