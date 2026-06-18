import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set')
}
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_USER_PASSWORD) {
  throw new Error('ADMIN_EMAIL and ADMIN_USER_PASSWORD must be set in environment variables')
}
if (!process.env.OPERATOR_EMAIL || !process.env.OPERATOR_USER_PASSWORD) {
  throw new Error('OPERATOR_EMAIL and OPERATOR_USER_PASSWORD must be set in environment variables')
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Starting database seeding...')

  // 👤 Module A: Internal Users (users table)
  console.log('👤 Seeding Users...')
  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL as string },
    update: {},
    create: {
      name: 'System Administrator',
      email: process.env.ADMIN_EMAIL as string,
      password: process.env.ADMIN_USER_PASSWORD as string,
      role: 'admin',
    },
  })
  console.log(`   - Admin seeded, ${admin.name}`)

  const operator = await prisma.user.upsert({
    where: { email: process.env.OPERATOR_EMAIL as string },
    update: {},
    create: {
      name: 'Logistics Operator',
      email: process.env.OPERATOR_EMAIL as string,
      password: process.env.OPERATOR_USER_PASSWORD as string,
      role: 'operator',
    },
  })
  console.log(`   - Operator seeded, ${operator.name}`)

  console.log('✅ Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })