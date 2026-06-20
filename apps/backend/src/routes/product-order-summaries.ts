import { createRoute, z } from "@hono/zod-openapi"
import { errorResponseSchema } from "./orders.js"

export const summaryProductResponseSchema = z.object({
  id: z.string().openapi({ description: "ID Summary Product", example: "1" }),
  summaryId: z.string().openapi({ description: "ID Product Order Summary", example: "1" }),
  productId: z.string().openapi({ description: "ID Produk", example: "1" }),
  totalQuantity: z.number().openapi({ description: "Jumlah Akumulasi Produk", example: 10 }),
  fulfillmentType: z.enum(['pesan_vendor', 'ambil_stok']).openapi({ description: "Tipe Pemesanan", example: "pesan_vendor" }),
  fulfillmentStatus: z.enum([
    'null',
    'ambil_di_sekretariat',
    'menghubungi_vendor',
    'diproses_vendor',
    'diterima_dari_vendor',
    'belum_menghubungi_vendor'
  ]).openapi({ description: "Status Pemenuhan", example: "null" }),
  product: z.object({
    id: z.string(),
    name: z.string(),
    basePrice: z.string()
  }).optional().openapi({ description: "Data Detail Produk" })
}).openapi('SummaryProductResponse')

export const productOrderSummaryResponseSchema = z.object({
  id: z.string().openapi({ description: "ID Product Order Summary", example: "1" }),
  name: z.string().openapi({ description: "Nama Summary", example: "OPEN PO Merchandise Batch 1" }),
  orderStartedDate: z.string().openapi({ description: "Tanggal Mulai Pesanan (YYYY-MM-DD)", example: "2026-06-01" }),
  orderEndDate: z.string().openapi({ description: "Tanggal Akhir Pesanan (YYYY-MM-DD)", example: "2026-06-12" }),
  createdAt: z.string().openapi({ description: "Tanggal Dibuat", example: "2026-06-18T00:00:00Z" }),
  summaryProducts: z.array(summaryProductResponseSchema).optional().openapi({ description: "Daftar Produk Terkait" })
}).openapi('ProductOrderSummaryResponse')

export const createSummaryRequestSchema = z.object({
  name: z.string().min(1).max(150).openapi({ description: "Nama Summary", example: "OPEN PO Merchandise Batch 1" }),
  orderStartedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Format tanggal mulai harus YYYY-MM-DD" }).openapi({ description: "Tanggal Mulai Pesanan (YYYY-MM-DD)", example: "2026-06-01" }),
  orderEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Format tanggal akhir harus YYYY-MM-DD" }).openapi({ description: "Tanggal Akhir Pesanan (YYYY-MM-DD)", example: "2026-06-12" }),
}).openapi('CreateSummaryRequest')

export const updateSummaryProductItemSchema = z.object({
  productId: z.string().openapi({ description: "ID Produk", example: "1" }),
  fulfillmentType: z.enum(['pesan_vendor', 'ambil_stok']).openapi({ description: "Tipe Pemesanan", example: "pesan_vendor" }),
  fulfillmentStatus: z.enum([
    'null',
    'ambil_di_sekretariat',
    'menghubungi_vendor',
    'diproses_vendor',
    'diterima_dari_vendor',
    'belum_menghubungi_vendor'
  ]).openapi({ description: "Status Pemenuhan", example: "menghubungi_vendor" }),
}).openapi('UpdateSummaryProductItem')

export const updateSummaryProductsRequestSchema = z.object({
  products: z.array(updateSummaryProductItemSchema).min(1).openapi({ description: "Daftar pembaruan produk" })
}).openapi('UpdateSummaryProductsRequest')

export const createSummaryRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Product Order Summaries'],
  summary: 'Membuat Ringkasan Pesanan Baru (Admin Only)',
  description: 'Mencatat ringkasan pesanan baru dengan menjumlahkan total produk terfilter pada rentang tanggal transaksi.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: createSummaryRequestSchema
        }
      }
    }
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: productOrderSummaryResponseSchema
        }
      },
      description: 'Ringkasan pesanan berhasil dibuat'
    },
    400: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Request payload tidak valid'
    },
    401: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Unauthorized: Sesi tidak aktif'
    },
    403: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Forbidden: Operator tidak berwenang membuat summary'
    },
    500: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Kesalahan internal server'
    }
  }
})

export const listSummariesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Product Order Summaries'],
  summary: 'Daftar Ringkasan Pesanan (Admin & Operator)',
  description: 'Mengambil daftar seluruh ringkasan pesanan.',
  request: {
    query: z.object({
      includeTrashed: z.enum(['true', 'false']).optional().openapi({ description: "Apakah menyertakan summary di sampah (Admin Only)", example: "true" })
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(productOrderSummaryResponseSchema)
        }
      },
      description: 'Daftar ringkasan pesanan berhasil diambil'
    },
    401: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Unauthorized: Sesi tidak aktif'
    },
    500: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Kesalahan internal server'
    }
  }
})

export const quickSummaryItemSchema = z.object({
  productId: z.string().openapi({ example: "1" }),
  productName: z.string().openapi({ example: "Ganci Akrilik" }),
  basePrice: z.string().openapi({ example: "12000" }),
  totalQuantity: z.number().openapi({ example: 15 })
}).openapi('QuickSummaryItem')

export const quickSummaryRoute = createRoute({
  method: 'get',
  path: '/quick',
  tags: ['Product Order Summaries'],
  summary: 'Mendapatkan Ringkasan Cepat tanpa Simpan (Admin & Operator)',
  description: 'Menghitung agregasi kuantitas produk berdasarkan rentang tanggal pesanan secara langsung.',
  request: {
    query: z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).openapi({ description: "Tanggal Mulai (YYYY-MM-DD)", example: "2026-06-01" }),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).openapi({ description: "Tanggal Akhir (YYYY-MM-DD)", example: "2026-06-12" })
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(quickSummaryItemSchema)
        }
      },
      description: 'Hasil ringkasan cepat berhasil dihitung'
    },
    400: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Request parameter tidak valid'
    },
    401: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Unauthorized: Sesi tidak aktif'
    },
    500: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Kesalahan internal server'
    }
  }
})

export const quickExportRoute = createRoute({
  method: 'get',
  path: '/quick/export',
  tags: ['Product Order Summaries'],
  summary: 'Ekspor Detail Transaksi Ringkasan Cepat ke CSV (Admin & Operator)',
  description: 'Mengunduh file CSV detail transaksi produk dalam rentang tanggal tertentu.',
  request: {
    query: z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).openapi({ description: "Tanggal Mulai (YYYY-MM-DD)", example: "2026-06-01" }),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).openapi({ description: "Tanggal Akhir (YYYY-MM-DD)", example: "2026-06-12" }),
      productId: z.string().openapi({ description: "ID Produk", example: "1" })
    })
  },
  responses: {
    200: {
      description: 'Stream download file CSV berhasil diproses'
    },
    400: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Request parameter tidak valid'
    },
    401: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Unauthorized: Sesi tidak aktif'
    },
    404: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Produk tidak ditemukan'
    },
    500: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Kesalahan internal server'
    }
  }
})

export const getSummaryDetailRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Product Order Summaries'],
  summary: 'Detail Ringkasan Pesanan (Admin & Operator)',
  description: 'Mengambil detail lengkap spesifik satu ringkasan pesanan berdasarkan ID.',
  request: {
    params: z.object({
      id: z.string().openapi({ description: "ID Ringkasan Pesanan", example: "1" })
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: productOrderSummaryResponseSchema
        }
      },
      description: 'Detail ringkasan pesanan ditemukan'
    },
    401: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Unauthorized: Sesi tidak aktif'
    },
    404: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Ringkasan pesanan tidak ditemukan'
    },
    500: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Kesalahan internal server'
    }
  }
})

export const updateSummaryProductsRoute = createRoute({
  method: 'patch',
  path: '/{id}/products',
  tags: ['Product Order Summaries'],
  summary: 'Memperbarui Status & Tipe Pemesanan Produk (Admin & Operator)',
  description: 'Memperbarui tipe pemesanan dan status pemenuhan produk di dalam ringkasan pesanan secara massal.',
  request: {
    params: z.object({
      id: z.string().openapi({ description: "ID Ringkasan Pesanan", example: "1" })
    }),
    body: {
      content: {
        'application/json': {
          schema: updateSummaryProductsRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), message: z.string() })
        }
      },
      description: 'Status pemenuhan produk berhasil diperbarui'
    },
    400: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Request payload tidak valid'
    },
    401: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Unauthorized: Sesi tidak aktif'
    },
    404: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Ringkasan pesanan tidak ditemukan'
    },
    500: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Kesalahan internal server'
    }
  }
})

export const exportSummaryProductRoute = createRoute({
  method: 'get',
  path: '/{id}/export/{productId}',
  tags: ['Product Order Summaries'],
  summary: 'Ekspor Detail Transaksi Produk ke CSV (Admin & Operator)',
  description: 'Mendownload file CSV yang berisi seluruh transaksi pemesanan produk teragregasi lengkap dengan atribut kustomisasinya.',
  request: {
    params: z.object({
      id: z.string().openapi({ description: "ID Ringkasan Pesanan", example: "1" }),
      productId: z.string().openapi({ description: "ID Produk", example: "1" })
    })
  },
  responses: {
    200: {
      description: 'Stream download file CSV berhasil diproses'
    },
    401: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Unauthorized: Sesi tidak aktif'
    },
    404: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Ringkasan pesanan atau produk tidak ditemukan'
    },
    500: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Kesalahan internal server'
    }
  }
})

export const trashSummaryRequestSchema = z.object({
  isTrashed: z.boolean().openapi({ description: "Status apakah summary dibuang ke sampah atau tidak", example: true })
}).openapi('TrashSummaryRequest')

export const trashSummaryRoute = createRoute({
  method: 'patch',
  path: '/{id}/trash',
  tags: ['Product Order Summaries'],
  summary: 'Memindahkan atau memulihkan Ringkasan Pesanan ke/dari Sampah (Admin Only)',
  description: 'Mengubah status isTrashed dari ringkasan pesanan. Hanya Admin yang berwenang.',
  request: {
    params: z.object({
      id: z.string().openapi({ description: "ID Ringkasan Pesanan", example: "1" })
    }),
    body: {
      content: {
        'application/json': {
          schema: trashSummaryRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), message: z.string() })
        }
      },
      description: 'Status sampah ringkasan pesanan berhasil diperbarui'
    },
    400: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Request payload tidak valid'
    },
    401: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Unauthorized: Sesi tidak aktif'
    },
    403: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Forbidden: Hanya Admin yang berwenang'
    },
    404: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Ringkasan pesanan tidak ditemukan'
    },
    500: {
      content: {
        'application/json': {
          schema: errorResponseSchema
        }
      },
      description: 'Kesalahan internal server'
    }
  }
})

