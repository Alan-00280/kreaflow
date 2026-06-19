import { createRoute, z } from "@hono/zod-openapi"
import { productResponseSchema, errorResponseSchema, successResponseSchema } from "./products.js"

// ─────────────────────────────────────────
// SCHEMAS DEFINITION
// ─────────────────────────────────────────

export const variantGroupResponseSchema = z.object({
  id: z.string().openapi({ description: "Variant Group ID (String)", example: "1" }),
  name: z.string().openapi({ description: "Nama Kelompok Varian", example: "Ganci Akrilik" }),
  createdAt: z.string().openapi({ description: "Tanggal Dibuat", example: "2026-06-16T10:34:04Z" })
}).openapi('VariantGroupResponse')

export const variantGroupDetailResponseSchema = variantGroupResponseSchema.extend({
  products: z.array(productResponseSchema).optional().openapi({ description: "Daftar produk varian konkret dalam kelompok ini" })
}).openapi('VariantGroupDetailResponse')

export const createVariantGroupRequestSchema = z.object({
  name: z.string().max(150).openapi({ description: "Nama kelompok varian", example: "Ganci Akrilik" })
}).openapi('CreateVariantGroupRequest')

export const updateVariantGroupRequestSchema = createVariantGroupRequestSchema.partial().openapi('UpdateVariantGroupRequest')

// ─────────────────────────────────────────
// ROUTE CONTRACTS
// ─────────────────────────────────────────

export const listVariantGroupsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Variant Groups'],
  summary: 'Daftar Semua Kelompok Varian',
  description: 'Mengambil semua data kelompok varian produk. Dapat diakses oleh Admin maupun Operator.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(variantGroupResponseSchema),
        },
      },
      description: 'Daftar kelompok varian berhasil diambil',
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

export const getVariantGroupDetailRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Variant Groups'],
  summary: 'Detail Kelompok Varian',
  description: 'Mengambil data lengkap kelompok varian beserta daftar produk varian konkret di dalamnya berdasarkan ID.',
  request: {
    params: z.object({
      id: z.string().openapi({ description: "ID Kelompok Varian", example: "1" })
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: variantGroupDetailResponseSchema,
        },
      },
      description: 'Detail kelompok varian berhasil ditemukan',
    },
    404: {
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
      description: 'Kelompok varian tidak ditemukan',
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

export const createVariantGroupRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Variant Groups'],
  summary: 'Membuat Kelompok Varian Baru (Admin Only)',
  description: 'Mendaftarkan kelompok varian baru. Hanya untuk Admin.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: createVariantGroupRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: variantGroupDetailResponseSchema,
        },
      },
      description: 'Kelompok varian berhasil dibuat',
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

export const updateVariantGroupRoute = createRoute({
  method: 'put',
  path: '/{id}',
  tags: ['Variant Groups'],
  summary: 'Update Kelompok Varian (Admin Only)',
  description: 'Mengubah nama kelompok varian. Hanya untuk Admin.',
  request: {
    params: z.object({
      id: z.string().openapi({ description: "ID Kelompok Varian", example: "1" })
    }),
    body: {
      content: {
        'application/json': {
          schema: updateVariantGroupRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: variantGroupDetailResponseSchema,
        },
      },
      description: 'Kelompok varian berhasil diperbarui',
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
      description: 'Kelompok varian tidak ditemukan',
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

export const deleteVariantGroupRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Variant Groups'],
  summary: 'Menghapus Kelompok Varian (Admin Only)',
  description: 'Menghapus kelompok varian. Pautan relasi di produk akan menjadi NULL (SET NULL). Hanya untuk Admin.',
  request: {
    params: z.object({
      id: z.string().openapi({ description: "ID Kelompok Varian", example: "1" })
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: successResponseSchema,
        },
      },
      description: 'Kelompok varian berhasil dihapus',
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
      description: 'Kelompok varian tidak ditemukan',
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
