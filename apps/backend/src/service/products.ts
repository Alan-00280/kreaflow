import { OpenAPIHono } from '@hono/zod-openapi'
import { PrismaClient } from '../generated/prisma/client.js'
import { authMiddleware, requireRole } from '../middlewares/auth.js'
import {
  listProductsRoute,
  getProductDetailRoute,
  createProductRoute,
  updateProductRoute,
  deleteProductRoute
} from '../routes/products.js'

type ContextWithPrisma = {
  Variables: {
    prisma: PrismaClient
  }
}

const products = new OpenAPIHono<ContextWithPrisma>()

// Apply authMiddleware to all routes under products
products.use('*', authMiddleware)

// Helper to serialize BigInt fields to String safely before JSON serialization
function serializeProduct(product: any) {
  return {
    id: product.id.toString(),
    name: product.name,
    basePrice: product.basePrice.toString(),
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    attributes: product.productAttributes ? product.productAttributes.map((attr: any) => ({
      id: attr.id.toString(),
      attributeName: attr.attributeName,
      inputType: attr.inputType,
      isRequired: attr.isRequired,
      options: attr.attributeOptions ? attr.attributeOptions.map((opt: any) => ({
        id: opt.id.toString(),
        optionValue: opt.optionValue
      })) : []
    })) : []
  }
}

// 1. GET / - List Products (Admin & Operator)
products.openapi(listProductsRoute, async (c) => {
  try {
    const prisma = c.get('prisma')
    const productList = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    return c.json(
      productList.map((p) => ({
        id: p.id.toString(),
        name: p.name,
        basePrice: p.basePrice.toString(),
        isActive: p.isActive,
        createdAt: p.createdAt.toISOString()
      })),
      200
    )
  } catch (error: any) {
    console.error('List products error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

// 2. GET /:id - Product Detail (Admin & Operator)
products.openapi(getProductDetailRoute, async (c) => {
  try {
    const prisma = c.get('prisma')
    const { id } = c.req.valid('param')
    
    const product = await prisma.product.findUnique({
      where: { id: BigInt(id) },
      include: {
        productAttributes: {
          include: {
            attributeOptions: true
          }
        }
      }
    })
    
    if (!product) {
      return c.json({ error: 'Produk tidak ditemukan' }, 404)
    }
    
    return c.json(serializeProduct(product), 200)
  } catch (error: any) {
    console.error('Get product detail error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

// 3. POST / - Create Product (Admin Only)
products.openapi(createProductRoute, async (c) => {
  try {
    // RBAC Check
    const authCheck = requireRole(['admin'])
    let isAuthorized = false
    await authCheck(c, async () => { isAuthorized = true })
    if (!isAuthorized) return c.json({ error: 'Forbidden: Hanya Admin yang diizinkan' }, 403) as any

    const prisma = c.get('prisma')
    const body = c.req.valid('json')

    const product = await prisma.product.create({
      data: {
        name: body.name,
        basePrice: body.basePrice,
        isActive: body.isActive ?? true,
        productAttributes: body.attributes ? {
          create: body.attributes.map((attr) => ({
            attributeName: attr.attributeName,
            inputType: attr.inputType,
            isRequired: attr.isRequired ?? false,
            attributeOptions: attr.options ? {
              create: attr.options.map((opt) => ({
                optionValue: opt
              }))
            } : undefined
          }))
        } : undefined
      },
      include: {
        productAttributes: {
          include: {
            attributeOptions: true
          }
        }
      }
    })

    return c.json(serializeProduct(product), 201)
  } catch (error: any) {
    console.error('Create product error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

// 4. PUT /:id - Update Product (Admin Only)
products.openapi(updateProductRoute, async (c) => {
  try {
    // RBAC Check
    const authCheck = requireRole(['admin'])
    let isAuthorized = false
    await authCheck(c, async () => { isAuthorized = true })
    if (!isAuthorized) return c.json({ error: 'Forbidden: Hanya Admin yang diizinkan' }, 403) as any

    const prisma = c.get('prisma')
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')

    const existingProduct = await prisma.product.findUnique({
      where: { id: BigInt(id) }
    })
    if (!existingProduct) {
      return c.json({ error: 'Produk tidak ditemukan' }, 404)
    }

    // Execute in transaction to maintain integrity of attributes replacement
    const product = await prisma.$transaction(async (tx) => {
      // Update basic fields
      await tx.product.update({
        where: { id: BigInt(id) },
        data: {
          name: body.name ?? undefined,
          basePrice: body.basePrice ?? undefined,
          isActive: body.isActive ?? undefined
        }
      })

      // If attributes are passed in payload, replace existing attributes (cascade will delete options)
      if (body.attributes !== undefined) {
        await tx.productAttribute.deleteMany({
          where: { productId: BigInt(id) }
        })

        if (body.attributes) {
          for (const attr of body.attributes) {
            await tx.productAttribute.create({
              data: {
                productId: BigInt(id),
                attributeName: attr.attributeName,
                inputType: attr.inputType,
                isRequired: attr.isRequired ?? false,
                attributeOptions: attr.options ? {
                  create: attr.options.map((opt) => ({
                    optionValue: opt
                  }))
                } : undefined
              }
            })
          }
        }
      }

      return tx.product.findUnique({
        where: { id: BigInt(id) },
        include: {
          productAttributes: {
            include: {
              attributeOptions: true
            }
          }
        }
      })
    })

    return c.json(serializeProduct(product), 200)
  } catch (error: any) {
    console.error('Update product error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

// 5. DELETE /:id - Delete Product (Admin Only)
products.openapi(deleteProductRoute, async (c) => {
  try {
    // RBAC Check
    const authCheck = requireRole(['admin'])
    let isAuthorized = false
    await authCheck(c, async () => { isAuthorized = true })
    if (!isAuthorized) return c.json({ error: 'Forbidden: Hanya Admin yang diizinkan' }, 403) as any

    const prisma = c.get('prisma')
    const { id } = c.req.valid('param')

    const existingProduct = await prisma.product.findUnique({
      where: { id: BigInt(id) }
    })
    if (!existingProduct) {
      return c.json({ error: 'Produk tidak ditemukan' }, 404)
    }

    await prisma.product.delete({
      where: { id: BigInt(id) }
    })

    return c.json({ success: true }, 200)
  } catch (error: any) {
    console.error('Delete product error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

export default products
