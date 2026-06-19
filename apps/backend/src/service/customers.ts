import { OpenAPIHono } from '@hono/zod-openapi'
import { PrismaClient } from '../generated/prisma/client.js'
import { authMiddleware, UserSession } from '../middlewares/auth.js'
import { listCustomersRoute } from '../routes/customers.js'

type ContextWithPrisma = {
  Variables: {
    prisma: PrismaClient
    user?: UserSession
  }
}

const customers = new OpenAPIHono<ContextWithPrisma>()

// Apply authMiddleware to all routes under customers
customers.use('*', authMiddleware)

// Helper to serialize Customer BigInt fields to String safely
function serializeCustomer(customer: any) {
  return {
    id: customer.id.toString(),
    name: customer.name,
    phoneNumber: customer.phoneNumber,
    generation: customer.generation,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString()
  }
}

// GET / - List Customers
customers.openapi(listCustomersRoute, async (c) => {
  try {
    const prisma = c.get('prisma')
    const user = c.get('user') as UserSession | undefined
    if (!user) {
      return c.json({ error: 'Unauthorized: Sesi tidak ditemukan' }, 401)
    }

    const customerList = await prisma.customer.findMany({
      orderBy: { name: 'asc' }
    })

    return c.json(customerList.map(serializeCustomer), 200)
  } catch (error: any) {
    console.error('List customers error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

export default customers
