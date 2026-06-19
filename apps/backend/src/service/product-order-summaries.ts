import { OpenAPIHono } from '@hono/zod-openapi'
import { PrismaClient } from '../generated/prisma/client.js'
import { authMiddleware, requireRole, UserSession } from '../middlewares/auth.js'
import {
  createSummaryRoute,
  listSummariesRoute,
  getSummaryDetailRoute,
  updateSummaryProductsRoute,
  exportSummaryProductRoute
} from '../routes/product-order-summaries.js'

type ContextWithPrisma = {
  Variables: {
    prisma: PrismaClient
    user?: UserSession
  }
}

const productOrderSummaries = new OpenAPIHono<ContextWithPrisma>()

// Apply authMiddleware globally to all endpoints
productOrderSummaries.use('*', authMiddleware)

// Helper to serialize BigInt fields to String safely and map 'none' enum status back to 'null'
function serializeSummary(summary: any) {
  return {
    id: summary.id.toString(),
    name: summary.name,
    orderStartedDate: summary.orderStartedDate ? summary.orderStartedDate.toISOString().slice(0, 10) : '',
    orderEndDate: summary.orderEndDate ? summary.orderEndDate.toISOString().slice(0, 10) : '',
    createdAt: summary.createdAt.toISOString(),
    summaryProducts: summary.summaryProducts ? summary.summaryProducts.map((sp: any) => ({
      id: sp.id.toString(),
      summaryId: sp.summaryId.toString(),
      productId: sp.productId.toString(),
      totalQuantity: sp.totalQuantity,
      fulfillmentType: sp.fulfillmentType,
      fulfillmentStatus: sp.fulfillmentStatus === 'none' ? 'null' : sp.fulfillmentStatus,
      product: sp.product ? {
        id: sp.product.id.toString(),
        name: sp.product.name,
        basePrice: sp.product.basePrice.toString()
      } : undefined
    })) : []
  }
}

// POST / - Create summary batch
productOrderSummaries.openapi(createSummaryRoute, async (c) => {
  try {
    const authCheck = requireRole(['admin'])
    let isAuthorized = false
    await authCheck(c, async () => { isAuthorized = true })
    if (!isAuthorized) return c.json({ error: 'Forbidden' }, 403) as any

    const prisma = c.get('prisma')
    const { name, orderStartedDate, orderEndDate } = c.req.valid('json')

    const start = new Date(orderStartedDate)
    const end = new Date(orderEndDate)

    // 1. Fetch all OrderItems within order date range
    const ordersInRange = await prisma.order.findMany({
      where: {
        orderDate: {
          gte: start,
          lte: end
        }
      },
      include: {
        orderItems: true
      }
    })

    // 2. Aggregate quantities by productId
    const productQuantities: Record<string, number> = {}

    for (const order of ordersInRange) {
      for (const item of order.orderItems) {
        if (item.productId) {
          const prodIdStr = item.productId.toString()
          productQuantities[prodIdStr] = (productQuantities[prodIdStr] || 0) + item.quantity
        } else if (item.bundleId) {
          // Resolve bundle constituent products
          const bundleProducts = await prisma.bundleProduct.findMany({
            where: { bundleId: item.bundleId }
          })
          for (const bp of bundleProducts) {
            const prodIdStr = bp.productId.toString()
            productQuantities[prodIdStr] = (productQuantities[prodIdStr] || 0) + (item.quantity * bp.quantity)
          }
        }
      }
    }

    // 3. Create the summary and summary products in a single transaction
    const createdSummary = await prisma.$transaction(async (tx) => {
      const summary = await tx.productOrderSummary.create({
        data: {
          name,
          orderStartedDate: start,
          orderEndDate: end
        }
      })

      const summaryProductsData = Object.entries(productQuantities).map(([prodId, qty]) => ({
        summaryId: summary.id,
        productId: BigInt(prodId),
        totalQuantity: qty,
        fulfillmentType: 'pesan_vendor' as const,
        fulfillmentStatus: 'none' as const
      }))

      if (summaryProductsData.length > 0) {
        await tx.summaryProduct.createMany({
          data: summaryProductsData
        })
      }

      return tx.productOrderSummary.findUnique({
        where: { id: summary.id },
        include: {
          summaryProducts: {
            include: {
              product: true
            }
          }
        }
      })
    })

    if (!createdSummary) return c.json({ error: 'Gagal membuat ringkasan pesanan' }, 500)
    return c.json(serializeSummary(createdSummary), 201)
  } catch (error: any) {
    console.error('Create product order summary error:', error)
    return c.json({ error: 'Terjadi kesalahan internal server', detail: error.message }, 500)
  }
})

// GET / - List all summaries
productOrderSummaries.openapi(listSummariesRoute, async (c) => {
  try {
    const authCheck = requireRole(['admin', 'operator'])
    let isAuthorized = false
    await authCheck(c, async () => { isAuthorized = true })
    if (!isAuthorized) return c.json({ error: 'Forbidden' }, 403) as any

    const prisma = c.get('prisma')
    const list = await prisma.productOrderSummary.findMany({
      include: {
        summaryProducts: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return c.json(list.map(serializeSummary), 200)
  } catch (error: any) {
    console.error('List product order summaries error:', error)
    return c.json({ error: 'Terjadi kesalahan internal server', detail: error.message }, 500)
  }
})

// GET /:id - Detail of specific summary
productOrderSummaries.openapi(getSummaryDetailRoute, async (c) => {
  try {
    const authCheck = requireRole(['admin', 'operator'])
    let isAuthorized = false
    await authCheck(c, async () => { isAuthorized = true })
    if (!isAuthorized) return c.json({ error: 'Forbidden' }, 403) as any

    const prisma = c.get('prisma')
    const { id } = c.req.valid('param')

    const summary = await prisma.productOrderSummary.findUnique({
      where: { id: BigInt(id) },
      include: {
        summaryProducts: {
          include: {
            product: true
          }
        }
      }
    })

    if (!summary) {
      return c.json({ error: 'Ringkasan pesanan tidak ditemukan' }, 404)
    }

    return c.json(serializeSummary(summary), 200)
  } catch (error: any) {
    console.error('Get product order summary detail error:', error)
    return c.json({ error: 'Terjadi kesalahan internal server', detail: error.message }, 500)
  }
})

// PATCH /:id/products - Bulk update fulfillment types & status
productOrderSummaries.openapi(updateSummaryProductsRoute, async (c) => {
  try {
    const authCheck = requireRole(['admin', 'operator'])
    let isAuthorized = false
    await authCheck(c, async () => { isAuthorized = true })
    if (!isAuthorized) return c.json({ error: 'Forbidden' }, 403) as any

    const prisma = c.get('prisma')
    const { id } = c.req.valid('param')
    const { products } = c.req.valid('json')

    const summaryId = BigInt(id)

    // Check if summary exists
    const summary = await prisma.productOrderSummary.findUnique({
      where: { id: summaryId }
    })
    if (!summary) {
      return c.json({ error: 'Ringkasan pesanan tidak ditemukan' }, 404)
    }

    // Execute bulk updates in a transaction
    await prisma.$transaction(
      products.map((p: any) => {
        const dbStatus = p.fulfillmentStatus === 'null' ? 'none' : p.fulfillmentStatus
        return prisma.summaryProduct.updateMany({
          where: {
            summaryId,
            productId: BigInt(p.productId)
          },
          data: {
            fulfillmentType: p.fulfillmentType,
            fulfillmentStatus: dbStatus
          }
        })
      })
    )

    return c.json({ success: true, message: 'Status pemenuhan produk berhasil diperbarui' }, 200)
  } catch (error: any) {
    console.error('Update summary products error:', error)
    return c.json({ error: 'Terjadi kesalahan internal server', detail: error.message }, 500)
  }
})

// GET /:id/export/:productId - Export product transaction to CSV
productOrderSummaries.openapi(exportSummaryProductRoute, async (c) => {
  try {
    const authCheck = requireRole(['admin', 'operator'])
    let isAuthorized = false
    await authCheck(c, async () => { isAuthorized = true })
    if (!isAuthorized) return c.json({ error: 'Forbidden' }, 403) as any

    const prisma = c.get('prisma')
    const { id, productId } = c.req.valid('param')

    const summary = await prisma.productOrderSummary.findUnique({
      where: { id: BigInt(id) }
    })
    if (!summary) {
      return c.json({ error: 'Ringkasan pesanan tidak ditemukan' }, 404)
    }

    const product = await prisma.product.findUnique({
      where: { id: BigInt(productId) }
    })
    if (!product) {
      return c.json({ error: 'Produk tidak ditemukan' }, 404)
    }

    // Query bundles containing this product
    const bundleProducts = await prisma.bundleProduct.findMany({
      where: { productId: BigInt(productId) }
    })
    const bundleIds = bundleProducts.map((bp) => bp.bundleId)

    // Retrieve order items
    const orderItems = await prisma.orderItem.findMany({
      where: {
        OR: [
          { productId: BigInt(productId) },
          { bundleId: { in: bundleIds } }
        ],
        order: {
          orderDate: {
            gte: summary.orderStartedDate,
            lte: summary.orderEndDate
          }
        }
      },
      include: {
        order: {
          include: {
            customer: true
          }
        },
        orderItemDetails: {
          where: {
            productAttribute: {
              productId: BigInt(productId)
            }
          },
          include: {
            productAttribute: true,
            attributeOption: true
          }
        }
      },
      orderBy: {
        order: {
          orderDate: 'asc'
        }
      }
    })

    // Fetch dynamic attributes
    const attributes = await prisma.productAttribute.findMany({
      where: { productId: BigInt(productId) },
      orderBy: { id: 'asc' }
    })
    const attributeNames = attributes.map(a => a.attributeName)

    function escapeCSVValue(val: any): string {
      if (val === null || val === undefined) return ''
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const headers = ['Invoice', 'Tanggal Nota', 'Nama Pelanggan', 'Qty', 'Harga Beli', ...attributeNames]
    const csvRows = [headers.map(escapeCSVValue).join(',')]

    for (const item of orderItems) {
      let qty = item.quantity
      if (item.bundleId) {
        const bp = bundleProducts.find(b => b.bundleId === item.bundleId)
        if (bp) {
          qty = item.quantity * bp.quantity
        }
      }

      const invoice = item.order?.invoiceNumber || '-'
      const dateStr = item.order?.orderDate ? item.order.orderDate.toISOString().slice(0, 10) : '-'
      const customerName = item.order?.customer?.name || '-'
      const price = item.priceAtPurchase.toString()

      const baseData = [invoice, dateStr, customerName, qty.toString(), price]

      const customData = attributes.map((attr) => {
        const detail = item.orderItemDetails.find(d => d.attributeId === attr.id)
        if (!detail) return ''
        if (attr.inputType === 'option') {
          return detail.attributeOption?.optionValue || ''
        }
        return detail.customValue || ''
      })

      const combined = [...baseData, ...customData]
      csvRows.push(combined.map(escapeCSVValue).join(','))
    }

    const csvString = csvRows.join('\r\n')

    c.header('Content-Type', 'text/csv')
    c.header('Content-Disposition', `attachment; filename=summary-${id}-product-${productId}.csv`)
    return c.text(csvString, 200)

  } catch (error: any) {
    console.error('Export summary product error:', error)
    return c.json({ error: 'Terjadi kesalahan internal server', detail: error.message }, 500)
  }
})

export default productOrderSummaries
