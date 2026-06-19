import { OpenAPIHono } from '@hono/zod-openapi'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, requireRole, UserSession } from '../middlewares/auth.js'
import {
  listVariantGroupsRoute,
  getVariantGroupDetailRoute,
  createVariantGroupRoute,
  updateVariantGroupRoute,
  deleteVariantGroupRoute
} from '../routes/variant-groups.js'

type ContextWithPrisma = {
  Variables: {
    prisma: PrismaClient
    user?: UserSession
  }
}

const variantGroups = new OpenAPIHono<ContextWithPrisma>()

// Apply authMiddleware globally to all endpoints under /variant-groups
variantGroups.use('*', authMiddleware)

// Helper to serialize BigInt fields to String safely before JSON serialization
function serializeVariantGroup(vg: any) {
  return {
    id: vg.id.toString(),
    name: vg.name,
    createdAt: vg.createdAt.toISOString(),
    products: vg.products ? vg.products.map((p: any) => ({
      id: p.id.toString(),
      name: p.name,
      basePrice: p.basePrice.toString(),
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString()
    })) : []
  }
}

// 1. GET / - List all variant product groups
variantGroups.openapi(listVariantGroupsRoute, async (c) => {
  try {
    const prisma = c.get('prisma')
    const list = await prisma.variantProductGroup.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return c.json(
      list.map((vg) => ({
        id: vg.id.toString(),
        name: vg.name,
        createdAt: vg.createdAt.toISOString()
      })),
      200
    )
  } catch (error: any) {
    console.error('List variant groups error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

// 2. GET /:id - Get variant product group detail
variantGroups.openapi(getVariantGroupDetailRoute, async (c) => {
  try {
    const prisma = c.get('prisma')
    const { id } = c.req.valid('param')

    const vg = await prisma.variantProductGroup.findUnique({
      where: { id: BigInt(id) },
      include: {
        products: true
      }
    })

    if (!vg) {
      return c.json({ error: 'Kelompok varian tidak ditemukan' }, 404)
    }

    return c.json(serializeVariantGroup(vg), 200)
  } catch (error: any) {
    console.error('Get variant group detail error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

// 3. POST / - Create variant product group (Admin Only)
variantGroups.openapi(createVariantGroupRoute, async (c) => {
  try {
    const authCheck = requireRole(['admin'])
    let isAuthorized = false
    await authCheck(c, async () => { isAuthorized = true })
    if (!isAuthorized) {
      return c.json({ error: 'Forbidden: Hanya Admin yang diizinkan' }, 403)
    }

    const prisma = c.get('prisma')
    const { name } = c.req.valid('json')

    const vg = await prisma.variantProductGroup.create({
      data: {
        name
      },
      include: {
        products: true
      }
    })

    return c.json(serializeVariantGroup(vg), 201)
  } catch (error: any) {
    console.error('Create variant group error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

// 4. PUT /:id - Update variant product group (Admin Only)
variantGroups.openapi(updateVariantGroupRoute, async (c) => {
  try {
    const authCheck = requireRole(['admin'])
    let isAuthorized = false
    await authCheck(c, async () => { isAuthorized = true })
    if (!isAuthorized) {
      return c.json({ error: 'Forbidden: Hanya Admin yang diizinkan' }, 403)
    }

    const prisma = c.get('prisma')
    const { id } = c.req.valid('param')
    const { name } = c.req.valid('json')

    const vg = await prisma.variantProductGroup.findUnique({
      where: { id: BigInt(id) }
    })
    if (!vg) {
      return c.json({ error: 'Kelompok varian tidak ditemukan' }, 404)
    }

    const updatedVg = await prisma.variantProductGroup.update({
      where: { id: BigInt(id) },
      data: {
        name: name ?? undefined
      },
      include: {
        products: true
      }
    })

    return c.json(serializeVariantGroup(updatedVg), 200)
  } catch (error: any) {
    console.error('Update variant group error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

// 5. DELETE /:id - Delete variant product group (Admin Only)
variantGroups.openapi(deleteVariantGroupRoute, async (c) => {
  try {
    const authCheck = requireRole(['admin'])
    let isAuthorized = false
    await authCheck(c, async () => { isAuthorized = true })
    if (!isAuthorized) {
      return c.json({ error: 'Forbidden: Hanya Admin yang diizinkan' }, 403)
    }

    const prisma = c.get('prisma')
    const { id } = c.req.valid('param')

    const vg = await prisma.variantProductGroup.findUnique({
      where: { id: BigInt(id) }
    })
    if (!vg) {
      return c.json({ error: 'Kelompok varian tidak ditemukan' }, 404)
    }

    await prisma.variantProductGroup.delete({
      where: { id: BigInt(id) }
    })

    return c.json({ success: true }, 200)
  } catch (error: any) {
    console.error('Delete variant group error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

export default variantGroups
