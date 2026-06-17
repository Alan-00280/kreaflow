import { createRoute, z } from "@hono/zod-openapi"

// ─────────────────────────────────────────
// SCHEMAS DEFINITION
// ─────────────────────────────────────────

export const bundleResponseSchema = z.object({
  id: z.string().openapi({ description: "Bundle ID (String)", example: "1" }),
  name: z.string().openapi({ description: "Nama Paket Bundling", example: "Paket Hemat A" }),
  description: z.string().nullable().openapi({ description: "Deskripsi Paket Bundling", example: "Kombinasi T-Shirt dan Totebag" }),
  bundlePrice: z.string().openapi({ description: "Harga Khusus Paket Bundling", example: "120000.00" }),
  isActive: z.boolean().openapi({ description: "Status Aktif Paket Bundling", example: true }),
  createdAt: z.string().openapi({ description: "Tanggal Dibuat", example: "2026-06-16T10:34:04Z" })
}).openapi('BundleResponse')

export const bundleProductProductSchema = z.object({
  id: z.string().openapi({ example: "5" }),
  name: z.string().openapi({ example: "Apparel T-Shirt" }),
  basePrice: z.string().openapi({ example: "85000.00" }),
  isActive: z.boolean().openapi({ example: true })
}).openapi('BundleProductProduct')

export const bundleProductResponseSchema = z.object({
  id: z.string().openapi({ example: "1" }),
  productId: z.string().openapi({ example: "5" }),
  quantity: z.number().openapi({ example: 2 }),
  product: bundleProductProductSchema
}).openapi('BundleProductResponse')

export const bundleDetailResponseSchema = bundleResponseSchema.extend({
  products: z.array(bundleProductResponseSchema)
}).openapi('BundleDetailResponse')

export const bundleProductCreateSchema = z.object({
  productId: z.string().openapi({ description: "ID Produk Satuan", example: "5" }),
  quantity: z.number().int().min(1).openapi({ description: "Jumlah Kuantitas", example: 2 })
}).openapi('BundleProductCreate')

export const createBundleRequestSchema = z.object({
  name: z.string().max(150).openapi({ description: "Nama paket bundling", example: "Paket Hemat A" }),
  description: z.string().max(500).optional().openapi({ description: "Deskripsi paket bundling", example: "Kombinasi T-Shirt dan Totebag" }),
  bundlePrice: z.union([z.number(), z.string().regex(/^\d+(\.\d+)?$/)]).openapi({ description: "Harga khusus paket bundling", example: "120000.00" }),
  isActive: z.boolean().default(true).openapi({ description: "Status aktif paket bundling", example: true }),
  products: z.array(bundleProductCreateSchema).min(1).openapi({ description: "Daftar produk satuan dalam bundle" })
}).openapi('CreateBundleRequest')

export const updateBundleRequestSchema = createBundleRequestSchema.partial().openapi('UpdateBundleRequest')

export const errorResponseSchema = z.object({
  error: z.string().openapi({ example: "Terjadi kesalahan" }),
  detail: z.string().optional().openapi({ example: "Stack trace info" })
}).openapi('ErrorResponse')

export const successResponseSchema = z.object({
  success: z.boolean().openapi({ example: true })
}).openapi('SuccessResponse')

// ─────────────────────────────────────────
// ROUTE CONTRACTS
// ─────────────────────────────────────────

export const listBundlesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Bundles'],
  summary: 'Daftar Semua Paket Bundling',
  description: 'Mengambil semua data paket bundling. Admin melihat semua, Operator hanya melihat paket aktif.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(bundleResponseSchema),
        },
      },
      description: 'Daftar paket bundling berhasil diambil',
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

export const getBundleDetailRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Bundles'],
  summary: 'Detail Paket Bundling',
  description: 'Mengambil data lengkap paket bundling beserta daftar produk di dalamnya berdasarkan ID.',
  request: {
    params: z.object({
      id: z.string().openapi({ description: "ID Bundle", example: "1" })
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: bundleDetailResponseSchema,
        },
      },
      description: 'Detail paket bundling berhasil ditemukan',
    },
    404: {
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
      description: 'Paket bundling tidak ditemukan',
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

export const createBundleRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Bundles'],
  summary: 'Membuat Paket Bundling Baru (Admin Only)',
  description: 'Mendaftarkan paket bundling baru beserta produk-produk penyusunnya. Hanya untuk Admin.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: createBundleRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: bundleDetailResponseSchema,
        },
      },
      description: 'Paket bundling berhasil dibuat',
    },
    400: {
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
      description: 'Payload request tidak valid',
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
      description: 'Forbidden: Hanya Admin yang diizinkan',
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

export const updateBundleRoute = createRoute({
  method: 'put',
  path: '/{id}',
  tags: ['Bundles'],
  summary: 'Update Paket Bundling (Admin Only)',
  description: 'Mengubah data master paket bundling beserta daftar produk penyusunnya. Hanya untuk Admin.',
  request: {
    params: z.object({
      id: z.string().openapi({ description: "ID Bundle", example: "1" })
    }),
    body: {
      content: {
        'application/json': {
          schema: updateBundleRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: bundleDetailResponseSchema,
        },
      },
      description: 'Paket bundling berhasil diperbarui',
    },
    400: {
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
      description: 'Payload request tidak valid',
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
      description: 'Forbidden: Hanya Admin yang diizinkan',
    },
    404: {
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
      description: 'Paket bundling tidak ditemukan',
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

export const deleteBundleRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Bundles'],
  summary: 'Menghapus Paket Bundling (Admin Only)',
  description: 'Menghapus paket bundling beserta relasi produk di dalamnya. Hanya untuk Admin.',
  request: {
    params: z.object({
      id: z.string().openapi({ description: "ID Bundle", example: "1" })
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: successResponseSchema,
        },
      },
      description: 'Paket bundling berhasil dihapus',
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
      description: 'Forbidden: Hanya Admin yang diizinkan',
    },
    404: {
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
      description: 'Paket bundling tidak ditemukan',
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
