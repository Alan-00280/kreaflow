import { OpenAPIHono } from '@hono/zod-openapi'
import { PrismaClient } from '../generated/prisma/client.js'
import { authMiddleware, UserSession } from '../middlewares/auth.js'
import {
  createOrderRoute,
  listOrdersRoute,
  getOrderDetailRoute
} from '../routes/orders.js'

type ContextWithPrisma = {
  Variables: {
    prisma: PrismaClient
    user?: UserSession
  }
}

const orders = new OpenAPIHono<ContextWithPrisma>()

// Apply authMiddleware to all routes under orders
orders.use('*', authMiddleware)

// Helper to serialize BigInt fields to String safely before JSON serialization
function serializeOrder(order: any) {
  return {
    id: order.id.toString(),
    invoiceNumber: order.invoiceNumber,
    recordedByUserId: order.recordedByUserId.toString(),
    customerId: order.customerId.toString(),
    totalAmount: order.totalAmount.toString(),
    'order-date': order.orderDate ? order.orderDate.toISOString().slice(0, 10) : '',
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    customer: order.customer ? {
      id: order.customer.id.toString(),
      name: order.customer.name,
      phoneNumber: order.customer.phoneNumber,
      generation: order.customer.generation
    } : null,
    recordedByUser: order.recordedByUser ? {
      id: order.recordedByUser.id.toString(),
      name: order.recordedByUser.name,
      email: order.recordedByUser.email,
      role: order.recordedByUser.role
    } : null,
    items: order.orderItems ? order.orderItems.map((item: any) => ({
      id: item.id.toString(),
      productId: item.productId ? item.productId.toString() : null,
      bundleId: item.bundleId ? item.bundleId.toString() : null,
      quantity: item.quantity,
      priceAtPurchase: item.priceAtPurchase.toString(),
      product: item.product ? {
        id: item.product.id.toString(),
        name: item.product.name,
        basePrice: item.product.basePrice.toString()
      } : null,
      bundle: item.bundle ? {
        id: item.bundle.id.toString(),
        name: item.bundle.name,
        bundlePrice: item.bundle.bundlePrice.toString()
      } : null,
      details: item.orderItemDetails ? item.orderItemDetails.map((det: any) => ({
        id: det.id.toString(),
        attributeId: det.attributeId.toString(),
        selectedOptionId: det.selectedOptionId ? det.selectedOptionId.toString() : null,
        customValue: det.customValue,
        attributeName: det.productAttribute?.attributeName || '',
        inputType: det.productAttribute?.inputType || '',
        selectedOptionValue: det.attributeOption?.optionValue || null
      })) : []
    })) : []
  }
}

// 1. POST / - Create Order (Admin & Operator)
orders.openapi(createOrderRoute, async (c) => {
  try {
    const prisma = c.get('prisma')
    const user = c.get('user') as UserSession | undefined
    if (!user) {
      return c.json({ error: 'Unauthorized: Sesi tidak ditemukan' }, 401)
    }

    const body = c.req.valid('json')

    // A. Verify invoice number uniqueness
    const existingOrder = await prisma.order.findUnique({
      where: { invoiceNumber: body.invoiceNumber }
    })
    if (existingOrder) {
      return c.json({ error: 'Nomor invoice sudah terdaftar di sistem' }, 400)
    }

    // C. Validate items and lock prices
    let calculatedTotal = 0
    const orderItemsToCreate: Array<{
      productId: bigint | null
      bundleId: bigint | null
      quantity: number
      priceAtPurchase: number
      details: Array<{ attributeId: string; selectedOptionId?: string | null; customValue?: string | null }>
    }> = []

    for (const item of body.items) {
      let price = 0
      
      if (item.productId && !item.bundleId) {
        // Product item
        const product = await prisma.product.findUnique({
          where: { id: BigInt(item.productId), isActive: true }
        })
        if (!product) {
          return c.json({ error: `Produk dengan ID ${item.productId} tidak ditemukan atau tidak aktif` }, 400)
        }
        price = parseFloat(product.basePrice.toString())

        // Validate product attribute details if provided
        if (item.details) {
          for (const det of item.details) {
            const attr = await prisma.productAttribute.findUnique({
              where: { id: BigInt(det.attributeId) }
            })
            if (!attr || attr.productId !== product.id) {
              return c.json({ error: `Atribut kustomisasi (ID: ${det.attributeId}) tidak valid untuk produk ${product.name}` }, 400)
            }
            if (det.selectedOptionId) {
              const opt = await prisma.attributeOption.findUnique({
                where: { id: BigInt(det.selectedOptionId) }
              })
              if (!opt || opt.attributeId !== attr.id) {
                return c.json({ error: `Pilihan opsi (ID: ${det.selectedOptionId}) tidak valid untuk atribut ${attr.attributeName}` }, 400)
              }
            }
          }
        }

        orderItemsToCreate.push({
          productId: BigInt(item.productId),
          bundleId: null,
          quantity: item.quantity,
          priceAtPurchase: price,
          details: item.details || []
        })

      } else if (item.bundleId && !item.productId) {
        // Bundle item
        const bundle = await prisma.bundle.findUnique({
          where: { id: BigInt(item.bundleId), isActive: true },
          include: {
            bundleProducts: true
          }
        })
        if (!bundle) {
          return c.json({ error: `Paket bundling dengan ID ${item.bundleId} tidak ditemukan atau tidak aktif` }, 400)
        }
        price = parseFloat(bundle.bundlePrice.toString())

        // Validate bundle product attribute details if provided
        if (item.details) {
          const bundleProductIds = bundle.bundleProducts.map(bp => bp.productId)
          for (const det of item.details) {
            const attr = await prisma.productAttribute.findUnique({
              where: { id: BigInt(det.attributeId) }
            })
            // Attribute must belong to one of the products in the bundle
            if (!attr || !bundleProductIds.includes(attr.productId)) {
              return c.json({ error: `Atribut kustomisasi (ID: ${det.attributeId}) tidak valid untuk produk penyusun paket ${bundle.name}` }, 400)
            }
            if (det.selectedOptionId) {
              const opt = await prisma.attributeOption.findUnique({
                where: { id: BigInt(det.selectedOptionId) }
              })
              if (!opt || opt.attributeId !== attr.id) {
                return c.json({ error: `Pilihan opsi (ID: ${det.selectedOptionId}) tidak valid untuk atribut ${attr.attributeName}` }, 400)
              }
            }
          }
        }

        orderItemsToCreate.push({
          productId: null,
          bundleId: BigInt(item.bundleId),
          quantity: item.quantity,
          priceAtPurchase: price,
          details: item.details || []
        })

      } else {
        return c.json({ error: 'Setiap item wajib memiliki tepat satu productId atau bundleId' }, 400)
      }

      calculatedTotal += price * item.quantity
    }

    // D. Write to database in a transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      // Find or create customer
      let customer = await tx.customer.findFirst({
        where: {
          name: body.customerName,
          generation: body.customerGeneration !== undefined ? body.customerGeneration : null
        }
      })
      if (!customer) {
        customer = await tx.customer.create({
          data: {
            name: body.customerName,
            phoneNumber: body.customerPhone || null,
            generation: body.customerGeneration !== undefined ? body.customerGeneration : null
          }
        })
      } else if (body.customerPhone) {
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: { phoneNumber: body.customerPhone }
        })
      }

      const order = await tx.order.create({
        data: {
          invoiceNumber: body.invoiceNumber,
          recordedByUserId: BigInt(user.id),
          customerId: customer.id,
          totalAmount: calculatedTotal,
          orderDate: new Date(body['order-date'])
        }
      })

      for (const item of orderItemsToCreate) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            bundleId: item.bundleId,
            quantity: item.quantity,
            priceAtPurchase: item.priceAtPurchase
          }
        })

        if (item.details && item.details.length > 0) {
          await tx.orderItemDetail.createMany({
            data: item.details.map((d: any) => ({
              orderItemId: orderItem.id,
              attributeId: BigInt(d.attributeId),
              selectedOptionId: d.selectedOptionId ? BigInt(d.selectedOptionId) : null,
              customValue: d.customValue ?? null
            }))
          })
        }
      }

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          customer: true,
          recordedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          orderItems: {
            include: {
              product: true,
              bundle: true,
              orderItemDetails: {
                include: {
                  productAttribute: {
                    include: {
                      attributeOptions: true
                    }
                  },
                  attributeOption: true
                }
              }
            }
          }
        }
      })
    })

    return c.json(serializeOrder(newOrder), 201)

  } catch (error: any) {
    console.error('Create order error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

// 2. GET / - List Order History (Admin sees all, Operator sees only their own)
orders.openapi(listOrdersRoute, async (c) => {
  try {
    const prisma = c.get('prisma')
    const user = c.get('user') as UserSession | undefined
    if (!user) {
      return c.json({ error: 'Unauthorized: Sesi tidak ditemukan' }, 401)
    }

    const orderList = await prisma.order.findMany({
      include: {
        customer: true,
        recordedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        orderItems: {
          include: {
            product: true,
            bundle: true,
            orderItemDetails: {
              include: {
                productAttribute: {
                  include: {
                    attributeOptions: true
                  }
                },
                attributeOption: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return c.json(orderList.map(serializeOrder), 200)

  } catch (error: any) {
    console.error('List orders error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

// 3. GET /:id - Order Detail (Admin sees all, Operator limited to their own)
orders.openapi(getOrderDetailRoute, async (c) => {
  try {
    const prisma = c.get('prisma')
    const user = c.get('user') as UserSession | undefined
    if (!user) {
      return c.json({ error: 'Unauthorized: Sesi tidak ditemukan' }, 401)
    }

    const { id } = c.req.valid('param')

    const order = await prisma.order.findUnique({
      where: { id: BigInt(id) },
      include: {
        customer: true,
        recordedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        orderItems: {
          include: {
            product: true,
            bundle: true,
            orderItemDetails: {
              include: {
                productAttribute: {
                  include: {
                    attributeOptions: true
                  }
                },
                attributeOption: true
              }
            }
          }
        }
      }
    })

    if (!order) {
      return c.json({ error: 'Nota pesanan tidak ditemukan' }, 404)
    }



    return c.json(serializeOrder(order), 200)

  } catch (error: any) {
    console.error('Get order detail error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

export default orders
