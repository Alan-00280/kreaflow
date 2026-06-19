import { OpenAPIHono } from '@hono/zod-openapi'
import { PrismaClient } from '../generated/prisma/client.js'
import { authMiddleware, requireRole, UserSession } from '../middlewares/auth.js'
import {
  listBundlesRoute,
  getBundleDetailRoute,
  createBundleRoute,
  updateBundleRoute,
  deleteBundleRoute
} from '../routes/bundles.js'

type ContextWithPrisma = {
  Variables: {
    prisma: PrismaClient
    user?: UserSession
  }
}

const bundles = new OpenAPIHono<ContextWithPrisma>()

// Apply authMiddleware to all routes under bundles
bundles.use('*', authMiddleware)

// Helper to serialize BigInt fields to String safely before JSON serialization
function serializeBundle(bundle: any) {
  return {
    id: bundle.id.toString(),
    name: bundle.name,
    description: bundle.description,
    bundlePrice: bundle.bundlePrice.toString(),
    isActive: bundle.isActive,
    createdAt: bundle.createdAt.toISOString(),
    products: bundle.bundleProducts ? bundle.bundleProducts.map((bp: any) => ({
      id: bp.id.toString(),
      productId: bp.productId.toString(),
      quantity: bp.quantity,
      product: {
        id: bp.product.id.toString(),
        name: bp.product.name,
        basePrice: bp.product.basePrice.toString(),
        isActive: bp.product.isActive
      }
    })) : []
  }
}

// 1. GET / - List Bundles (Admin & Operator)
bundles.openapi(listBundlesRoute, async (c) => {
  try {
    const prisma = c.get('prisma')
    const user = c.get('user') as UserSession | undefined
    
    let whereClause = {}
    if (user?.role === 'operator') {
      // Operator RBAC: only see active bundles
      whereClause = { isActive: true }
    }

    const bundleList = await prisma.bundle.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    })
    
    return c.json(
      bundleList.map((b) => ({
        id: b.id.toString(),
        name: b.name,
        description: b.description,
        bundlePrice: b.bundlePrice.toString(),
        isActive: b.isActive,
        createdAt: b.createdAt.toISOString()
      })),
      200
    )
  } catch (error: any) {
    console.error('List bundles error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

// 2. GET /:id - Bundle Detail (Admin & Operator)
bundles.openapi(getBundleDetailRoute, async (c) => {
  try {
    const prisma = c.get('prisma')
    const user = c.get('user') as UserSession | undefined
    const { id } = c.req.valid('param')
    
    const bundle = await prisma.bundle.findUnique({
      where: { id: BigInt(id) },
      include: {
        bundleProducts: {
          include: {
            product: true
          }
        }
      }
    })
    
    if (!bundle) {
      return c.json({ error: 'Paket bundling tidak ditemukan' }, 404)
    }

    if (user?.role === 'operator' && !bundle.isActive) {
      return c.json({ error: 'Forbidden: Anda tidak memiliki akses ke paket bundling yang tidak aktif' }, 403)
    }
    
    return c.json(serializeBundle(bundle), 200)
  } catch (error: any) {
    console.error('Get bundle detail error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

// 3. POST / - Create Bundle (Admin Only)
bundles.openapi(createBundleRoute, async (c) => {
  try {
    // RBAC Check
    const authCheck = requireRole(['admin'])
    let isAuthorized = false
    await authCheck(c, async () => { isAuthorized = true })
    if (!isAuthorized) {
      return c.json({ error: 'Forbidden: Hanya Admin yang diizinkan' }, 403)
    }

    const prisma = c.get('prisma')
    const body = c.req.valid('json')

    // Validate that all associated products exist
    const productIds = body.products.map((p) => BigInt(p.productId))
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } }
    })
    if (existingProducts.length !== productIds.length) {
      return c.json({ error: 'Satu atau lebih produk satuan tidak ditemukan dalam sistem' }, 400)
    }

    // Create bundle and its relations
    const bundle = await prisma.bundle.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        bundlePrice: body.bundlePrice,
        isActive: body.isActive ?? true,
        bundleProducts: {
          create: body.products.map((p) => ({
            productId: BigInt(p.productId),
            quantity: p.quantity
          }))
        }
      },
      include: {
        bundleProducts: {
          include: {
            product: true
          }
        }
      }
    })

    return c.json(serializeBundle(bundle), 201)
  } catch (error: any) {
    console.error('Create bundle error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

// 4. PUT /:id - Update Bundle (Admin Only)
bundles.openapi(updateBundleRoute, async (c) => {
  try {
    // RBAC Check
    const authCheck = requireRole(['admin'])
    let isAuthorized = false
    await authCheck(c, async () => { isAuthorized = true })
    if (!isAuthorized) {
      return c.json({ error: 'Forbidden: Hanya Admin yang diizinkan' }, 403)
    }

    const prisma = c.get('prisma')
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')

    const existingBundle = await prisma.bundle.findUnique({
      where: { id: BigInt(id) }
    })
    if (!existingBundle) {
      return c.json({ error: 'Paket bundling tidak ditemukan' }, 404)
    }

    // Validate products if provided in the body
    if (body.products) {
      const productIds = body.products.map((p) => BigInt(p.productId))
      const existingProducts = await prisma.product.findMany({
        where: { id: { in: productIds } }
      })
      if (existingProducts.length !== productIds.length) {
        return c.json({ error: 'Satu atau lebih produk satuan tidak ditemukan dalam sistem' }, 400)
      }
    }

    // Execute in transaction to maintain integrity of products replacement
    const bundle = await prisma.$transaction(async (tx) => {
      // Update basic fields
      await tx.bundle.update({
        where: { id: BigInt(id) },
        data: {
          name: body.name ?? undefined,
          description: body.description !== undefined ? body.description : undefined,
          bundlePrice: body.bundlePrice ?? undefined,
          isActive: body.isActive ?? undefined
        }
      })

      // If products list is provided, replace relations
      if (body.products !== undefined) {
        await tx.bundleProduct.deleteMany({
          where: { bundleId: BigInt(id) }
        })

        if (body.products) {
          for (const p of body.products) {
            await tx.bundleProduct.create({
              data: {
                bundleId: BigInt(id),
                productId: BigInt(p.productId),
                quantity: p.quantity
              }
            })
          }
        }
      }

      return tx.bundle.findUnique({
        where: { id: BigInt(id) },
        include: {
          bundleProducts: {
            include: {
              product: true
            }
          }
        }
      })
    })

    if (!bundle) return c.json({ error: 'Paket bundling tidak ditemukan setelah update' }, 404)
    return c.json(serializeBundle(bundle), 200)
  } catch (error: any) {
    console.error('Update bundle error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

// 5. DELETE /:id - Delete Bundle (Admin Only)
bundles.openapi(deleteBundleRoute, async (c) => {
  try {
    // RBAC Check
    const authCheck = requireRole(['admin'])
    let isAuthorized = false
    await authCheck(c, async () => { isAuthorized = true })
    if (!isAuthorized) {
      return c.json({ error: 'Forbidden: Hanya Admin yang diizinkan' }, 403)
    }

    const prisma = c.get('prisma')
    const { id } = c.req.valid('param')

    const existingBundle = await prisma.bundle.findUnique({
      where: { id: BigInt(id) }
    })
    if (!existingBundle) {
      return c.json({ error: 'Paket bundling tidak ditemukan' }, 404)
    }

    await prisma.bundle.delete({
      where: { id: BigInt(id) }
    })

    return c.json({ success: true }, 200)
  } catch (error: any) {
    console.error('Delete bundle error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

export default bundles
