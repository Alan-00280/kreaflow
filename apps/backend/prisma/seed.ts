import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set')
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
  console.log(`   - Admin seeded!`)

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
  console.log(`   - Operator seeded!`)

  // 👥 Module B: Mock Customers (customers table)
  console.log('👥 Seeding Customers...')
  let customer1 = await prisma.customer.findFirst({
    where: { name: 'Customer001 (seeded)' },
  })
  if (!customer1) {
    customer1 = await prisma.customer.create({
      data: {
        name: 'Customer001 (seeded)',
        generation: 2023,
      },
    })
  }
  console.log(`   - Customer 1 seeded: ${customer1.name}`)

  let customer2 = await prisma.customer.findFirst({
    where: { name: 'Customer002 (seeded)' },
  })
  if (!customer2) {
    customer2 = await prisma.customer.create({
      data: {
        name: 'Customer002 (seeded)',
        generation: 2024,
      },
    })
  }
  console.log(`   - Customer 2 seeded: ${customer2.name}`)

  // 📦 Module C: Master Catalog & Dynamic Attributes (products, attributes & options)
  console.log('📦 Seeding Products & Attributes...')
  let product1 = await prisma.product.findFirst({
    where: { name: '(seeded) Apparel T-Shirt' },
  })
  if (!product1) {
    product1 = await prisma.product.create({
      data: {
        name: '(seeded) Apparel T-Shirt',
        basePrice: 85000.00,
        isActive: true,
        productAttributes: {
          create: [
            {
              attributeName: 'Warna Kain',
              inputType: 'option',
              isRequired: true,
              attributeOptions: {
                create: [
                  { optionValue: 'Hitam' },
                  { optionValue: 'Putih' },
                  { optionValue: 'Navy' },
                ],
              },
            },
            {
              attributeName: 'Ukuran Sablon',
              inputType: 'option',
              isRequired: true,
              attributeOptions: {
                create: [
                  { optionValue: 'A4' },
                  { optionValue: 'A3' },
                ],
              },
            },
            {
              attributeName: 'Catatan Tambahan',
              inputType: 'text',
              isRequired: false,
            },
          ],
        },
      },
    })
  }
  console.log(`   - Product 1 seeded: ${product1.name}`)

  let product2 = await prisma.product.findFirst({
    where: { name: '(seeded) Javanese Bag' },
  })
  if (!product2) {
    product2 = await prisma.product.create({
      data: {
        name: '(seeded) Javanese Bag',
        basePrice: 45000.00,
        isActive: true,
        productAttributes: {
          create: [
            {
              attributeName: 'Desain Cetak (File Link)',
              inputType: 'file',
              isRequired: true,
            },
          ],
        },
      },
    })
  }
  console.log(`   - Product 2 seeded: ${product2.name}`)

  // 🎁 Module D: Bundling Configuration (bundles & bundle_products)
  console.log('🎁 Seeding Bundles...')
  let bundle = await prisma.bundle.findFirst({
    where: { name: 'Paket Maba Hemat' },
  })
  if (!bundle) {
    bundle = await prisma.bundle.create({
      data: {
        name: 'Paket Maba Hemat',
        description: 'Paket merchandise kustom esensial untuk mahasiswa baru.',
        bundlePrice: 115000.00,
        isActive: true,
        bundleProducts: {
          create: [
            {
              productId: product1.id,
              quantity: 1,
            },
            {
              productId: product2.id,
              quantity: 1,
            },
          ],
        },
      },
    })
  }
  console.log(`   - Bundle seeded: ${bundle.name}`)

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