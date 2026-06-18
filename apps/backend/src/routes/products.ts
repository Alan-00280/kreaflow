import { createRoute, z } from "@hono/zod-openapi"

// ─────────────────────────────────────────
// SCHEMAS DEFINITION
// ─────────────────────────────────────────

export const productResponseSchema = z.object({
  id: z.string().openapi({ description: "Product ID (String)", example: "1" }),
  name: z.string().openapi({ description: "Nama Produk", example: "Apparel T-Shirt" }),
  basePrice: z.string().openapi({ description: "Harga Dasar Produk", example: "85000.00" }),
  isActive: z.boolean().openapi({ description: "Status Aktif Produk", example: true }),
  createdAt: z.string().openapi({ description: "Tanggal Dibuat", example: "2026-06-16T10:34:04Z" })
}).openapi('ProductResponse')

export const attributeOptionResponseSchema = z.object({
  id: z.string().openapi({ example: "1" }),
  optionValue: z.string().openapi({ example: "Hitam" })
}).openapi('AttributeOptionResponse')

export const productAttributeResponseSchema = z.object({
  id: z.string().openapi({ example: "1" }),
  attributeName: z.string().openapi({ example: "Warna Kain" }),
  inputType: z.enum(['text', 'number', 'option', 'file']).openapi({ example: "option" }),
  isRequired: z.boolean().openapi({ example: true }),
  options: z.array(attributeOptionResponseSchema).optional()
}).openapi('ProductAttributeResponse')

export const productDetailResponseSchema = productResponseSchema.extend({
  attributes: z.array(productAttributeResponseSchema)
}).openapi('ProductDetailResponse')

export const attributeCreateSchema = z.object({
  attributeName: z.string().max(100).openapi({ description: "Nama atribut kustomisasi", example: "Warna Kain" }),
  inputType: z.enum(['text', 'number', 'option', 'file']).openapi({ description: "Tipe input", example: "option" }),
  isRequired: z.boolean().default(false).openapi({ description: "Atribut wajib diisi", example: true }),
  options: z.array(z.string().max(255)).optional().openapi({ description: "Pilihan jawaban (jika tipe option)", example: ["Hitam", "Putih", "Navy"] })
}).openapi('AttributeCreate')

export const createProductRequestSchema = z.object({
  name: z.string().max(150).openapi({ description: "Nama produk satuan", example: "Apparel T-Shirt" }),
  basePrice: z.union([z.number(), z.string().regex(/^\d+(\.\d+)?$/)]).openapi({ description: "Harga dasar produk", example: "85000.00" }),
  isActive: z.boolean().default(true).openapi({ description: "Status aktif produk", example: true }),
  attributes: z.array(attributeCreateSchema).optional().openapi({ description: "Form kustomisasi atribut" })
}).openapi('CreateProductRequest')

export const updateProductRequestSchema = createProductRequestSchema.partial().openapi('UpdateProductRequest')

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

export const listProductsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Products'],
  summary: 'Daftar Semua Produk',
  description: 'Mengambil semua data produk satuan. Dapat diakses oleh Admin maupun Operator.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(productResponseSchema),
        },
      },
      description: 'Daftar produk berhasil diambil',
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

export const getProductDetailRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Products'],
  summary: 'Detail Produk',
  description: 'Mengambil data lengkap produk satuan beserta formulir atribut kustomisasinya berdasarkan ID.',
  request: {
    params: z.object({
      id: z.string().openapi({ description: "ID Produk", example: "1" })
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: productDetailResponseSchema,
        },
      },
      description: 'Detail produk berhasil ditemukan',
    },
    404: {
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
      description: 'Produk tidak ditemukan',
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

export const createProductRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Products'],
  summary: 'Membuat Produk Baru (Admin Only)',
  description: 'Mendaftarkan produk satuan baru lengkap dengan atribut kustomisasinya. Hanya untuk Admin.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: createProductRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: productDetailResponseSchema,
        },
      },
      description: 'Produk berhasil dibuat',
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

export const updateProductRoute = createRoute({
  method: 'put',
  path: '/{id}',
  tags: ['Products'],
  summary: 'Update Produk (Admin Only)',
  description: 'Mengubah data master produk satuan beserta atribut kustomisasinya. Hanya untuk Admin.',
  request: {
    params: z.object({
      id: z.string().openapi({ description: "ID Produk", example: "1" })
    }),
    body: {
      content: {
        'application/json': {
          schema: updateProductRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: productDetailResponseSchema,
        },
      },
      description: 'Produk berhasil diperbarui',
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
      description: 'Produk tidak ditemukan',
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

export const deleteProductRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Products'],
  summary: 'Menghapus Produk (Admin Only)',
  description: 'Menghapus produk satuan beserta seluruh kustomisasi terkait (Cascade). Hanya untuk Admin.',
  request: {
    params: z.object({
      id: z.string().openapi({ description: "ID Produk", example: "1" })
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: successResponseSchema,
        },
      },
      description: 'Produk berhasil dihapus',
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
      description: 'Produk tidak ditemukan',
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
