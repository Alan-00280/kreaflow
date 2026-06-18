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
        phoneNumber: '+6285748023239'
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
        phoneNumber: '+6288989567073'
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

  // 🛒 Module E: Order & Order Items Seeding
  console.log('🛒 Seeding Orders & Order Items...')
  const orderCount = await prisma.order.count()
  if (orderCount === 0) {
    // Query attribute and option definitions to populate custom attributes correctly
    const tShirtAttrs = await prisma.productAttribute.findMany({
      where: { productId: product1.id },
      include: { attributeOptions: true }
    })
    const warnaKainAttr = tShirtAttrs.find(a => a.attributeName === 'Warna Kain')
    const ukuranSablonAttr = tShirtAttrs.find(a => a.attributeName === 'Ukuran Sablon')
    const catatanAttr = tShirtAttrs.find(a => a.attributeName === 'Catatan Tambahan')

    const warnaKainOptions = warnaKainAttr?.attributeOptions || []
    const ukuranSablonOptions = ukuranSablonAttr?.attributeOptions || []

    const bagAttrs = await prisma.productAttribute.findMany({
      where: { productId: product2.id }
    })
    const desainAttr = bagAttrs.find(a => a.attributeName === 'Desain Cetak (File Link)')

    // Order 1: 2026-06-01 (Customer 1, Admin, 2 items)
    await prisma.order.create({
      data: {
        invoiceNumber: 'INV-20260601-001',
        recordedByUserId: admin.id,
        customerId: customer1.id,
        totalAmount: 130000.00,
        orderDate: new Date('2026-06-01'),
        orderItems: {
          create: [
            {
              productId: product1.id,
              quantity: 1,
              priceAtPurchase: 85000.00,
              orderItemDetails: {
                create: [
                  ...(warnaKainAttr && warnaKainOptions[0] ? [{ attributeId: warnaKainAttr.id, selectedOptionId: warnaKainOptions[0].id }] : []),
                  ...(ukuranSablonAttr && ukuranSablonOptions[0] ? [{ attributeId: ukuranSablonAttr.id, selectedOptionId: ukuranSablonOptions[0].id }] : [])
                ]
              }
            },
            {
              productId: product2.id,
              quantity: 1,
              priceAtPurchase: 45000.00,
              orderItemDetails: {
                create: [
                  ...(desainAttr ? [{ attributeId: desainAttr.id, customValue: 'https://drive.google.com/file/d/tas1' }] : [])
                ]
              }
            }
          ]
        }
      }
    })

    // Order 2: 2026-06-02 (Customer 2, Operator, 1 item)
    await prisma.order.create({
      data: {
        invoiceNumber: 'INV-20260602-002',
        recordedByUserId: operator.id,
        customerId: customer2.id,
        totalAmount: 115000.00,
        orderDate: new Date('2026-06-02'),
        orderItems: {
          create: [
            {
              bundleId: bundle.id,
              quantity: 1,
              priceAtPurchase: 115000.00,
              orderItemDetails: {
                create: [
                  ...(warnaKainAttr && warnaKainOptions[1] ? [{ attributeId: warnaKainAttr.id, selectedOptionId: warnaKainOptions[1].id }] : []),
                  ...(ukuranSablonAttr && ukuranSablonOptions[0] ? [{ attributeId: ukuranSablonAttr.id, selectedOptionId: ukuranSablonOptions[0].id }] : []),
                  ...(desainAttr ? [{ attributeId: desainAttr.id, customValue: 'https://drive.google.com/file/d/tasbundle1' }] : [])
                ]
              }
            }
          ]
        }
      }
    })

    // Order 3: 2026-06-03 (Customer 1, Admin, 1 item)
    await prisma.order.create({
      data: {
        invoiceNumber: 'INV-20260603-003',
        recordedByUserId: admin.id,
        customerId: customer1.id,
        totalAmount: 85000.00,
        orderDate: new Date('2026-06-03'),
        orderItems: {
          create: [
            {
              productId: product1.id,
              quantity: 1,
              priceAtPurchase: 85000.00,
              orderItemDetails: {
                create: [
                  ...(warnaKainAttr && warnaKainOptions[2] ? [{ attributeId: warnaKainAttr.id, selectedOptionId: warnaKainOptions[2].id }] : []),
                  ...(ukuranSablonAttr && ukuranSablonOptions[1] ? [{ attributeId: ukuranSablonAttr.id, selectedOptionId: ukuranSablonOptions[1].id }] : [])
                ]
              }
            }
          ]
        }
      }
    })

    // Order 4: 2026-06-04 (Customer 2, Operator, 2 items)
    await prisma.order.create({
      data: {
        invoiceNumber: 'INV-20260604-004',
        recordedByUserId: operator.id,
        customerId: customer2.id,
        totalAmount: 160000.00,
        orderDate: new Date('2026-06-04'),
        orderItems: {
          create: [
            {
              productId: product2.id,
              quantity: 1,
              priceAtPurchase: 45000.00,
              orderItemDetails: {
                create: [
                  ...(desainAttr ? [{ attributeId: desainAttr.id, customValue: 'https://drive.google.com/file/d/tas2' }] : [])
                ]
              }
            },
            {
              bundleId: bundle.id,
              quantity: 1,
              priceAtPurchase: 115000.00,
              orderItemDetails: {
                create: [
                  ...(warnaKainAttr && warnaKainOptions[0] ? [{ attributeId: warnaKainAttr.id, selectedOptionId: warnaKainOptions[0].id }] : []),
                  ...(ukuranSablonAttr && ukuranSablonOptions[1] ? [{ attributeId: ukuranSablonAttr.id, selectedOptionId: ukuranSablonOptions[1].id }] : []),
                  ...(desainAttr ? [{ attributeId: desainAttr.id, customValue: 'https://drive.google.com/file/d/tasbundle2' }] : [])
                ]
              }
            }
          ]
        }
      }
    })

    // Order 5: 2026-06-05 (Customer 1, Admin, 1 item)
    await prisma.order.create({
      data: {
        invoiceNumber: 'INV-20260605-005',
        recordedByUserId: admin.id,
        customerId: customer1.id,
        totalAmount: 45000.00,
        orderDate: new Date('2026-06-05'),
        orderItems: {
          create: [
            {
              productId: product2.id,
              quantity: 1,
              priceAtPurchase: 45000.00,
              orderItemDetails: {
                create: [
                  ...(desainAttr ? [{ attributeId: desainAttr.id, customValue: 'https://drive.google.com/file/d/tas3' }] : [])
                ]
              }
            }
          ]
        }
      }
    })

    // Order 6: 2026-06-06 (Customer 2, Operator, 1 item)
    await prisma.order.create({
      data: {
        invoiceNumber: 'INV-20260606-006',
        recordedByUserId: operator.id,
        customerId: customer2.id,
        totalAmount: 85000.00,
        orderDate: new Date('2026-06-06'),
        orderItems: {
          create: [
            {
              productId: product1.id,
              quantity: 1,
              priceAtPurchase: 85000.00,
              orderItemDetails: {
                create: [
                  ...(warnaKainAttr && warnaKainOptions[1] ? [{ attributeId: warnaKainAttr.id, selectedOptionId: warnaKainOptions[1].id }] : []),
                  ...(ukuranSablonAttr && ukuranSablonOptions[0] ? [{ attributeId: ukuranSablonAttr.id, selectedOptionId: ukuranSablonOptions[0].id }] : [])
                ]
              }
            }
          ]
        }
      }
    })

    // Order 7: 2026-06-07 (Customer 1, Admin, 2 items)
    await prisma.order.create({
      data: {
        invoiceNumber: 'INV-20260607-007',
        recordedByUserId: admin.id,
        customerId: customer1.id,
        totalAmount: 130000.00,
        orderDate: new Date('2026-06-07'),
        orderItems: {
          create: [
            {
              productId: product1.id,
              quantity: 1,
              priceAtPurchase: 85000.00,
              orderItemDetails: {
                create: [
                  ...(warnaKainAttr && warnaKainOptions[2] ? [{ attributeId: warnaKainAttr.id, selectedOptionId: warnaKainOptions[2].id }] : []),
                  ...(ukuranSablonAttr && ukuranSablonOptions[1] ? [{ attributeId: ukuranSablonAttr.id, selectedOptionId: ukuranSablonOptions[1].id }] : [])
                ]
              }
            },
            {
              productId: product2.id,
              quantity: 1,
              priceAtPurchase: 45000.00,
              orderItemDetails: {
                create: [
                  ...(desainAttr ? [{ attributeId: desainAttr.id, customValue: 'https://drive.google.com/file/d/tas4' }] : [])
                ]
              }
            }
          ]
        }
      }
    })

    // Order 8: 2026-06-08 (Customer 2, Operator, 1 item)
    await prisma.order.create({
      data: {
        invoiceNumber: 'INV-20260608-008',
        recordedByUserId: operator.id,
        customerId: customer2.id,
        totalAmount: 115000.00,
        orderDate: new Date('2026-06-08'),
        orderItems: {
          create: [
            {
              bundleId: bundle.id,
              quantity: 1,
              priceAtPurchase: 115000.00,
              orderItemDetails: {
                create: [
                  ...(warnaKainAttr && warnaKainOptions[0] ? [{ attributeId: warnaKainAttr.id, selectedOptionId: warnaKainOptions[0].id }] : []),
                  ...(ukuranSablonAttr && ukuranSablonOptions[0] ? [{ attributeId: ukuranSablonAttr.id, selectedOptionId: ukuranSablonOptions[0].id }] : []),
                  ...(desainAttr ? [{ attributeId: desainAttr.id, customValue: 'https://drive.google.com/file/d/tasbundle3' }] : [])
                ]
              }
            }
          ]
        }
      }
    })

    // Order 9: 2026-06-09 (Customer 1, Admin, 1 item)
    await prisma.order.create({
      data: {
        invoiceNumber: 'INV-20260609-009',
        recordedByUserId: admin.id,
        customerId: customer1.id,
        totalAmount: 85000.00,
        orderDate: new Date('2026-06-09'),
        orderItems: {
          create: [
            {
              productId: product1.id,
              quantity: 1,
              priceAtPurchase: 85000.00,
              orderItemDetails: {
                create: [
                  ...(warnaKainAttr && warnaKainOptions[1] ? [{ attributeId: warnaKainAttr.id, selectedOptionId: warnaKainOptions[1].id }] : []),
                  ...(ukuranSablonAttr && ukuranSablonOptions[1] ? [{ attributeId: ukuranSablonAttr.id, selectedOptionId: ukuranSablonOptions[1].id }] : [])
                ]
              }
            }
          ]
        }
      }
    })

    // Order 10: 2026-06-10 (Customer 2, Operator, 2 items)
    await prisma.order.create({
      data: {
        invoiceNumber: 'INV-20260610-010',
        recordedByUserId: operator.id,
        customerId: customer2.id,
        totalAmount: 160000.00,
        orderDate: new Date('2026-06-10'),
        orderItems: {
          create: [
            {
              productId: product2.id,
              quantity: 1,
              priceAtPurchase: 45000.00,
              orderItemDetails: {
                create: [
                  ...(desainAttr ? [{ attributeId: desainAttr.id, customValue: 'https://drive.google.com/file/d/tas5' }] : [])
                ]
              }
            },
            {
              bundleId: bundle.id,
              quantity: 1,
              priceAtPurchase: 115000.00,
              orderItemDetails: {
                create: [
                  ...(warnaKainAttr && warnaKainOptions[2] ? [{ attributeId: warnaKainAttr.id, selectedOptionId: warnaKainOptions[2].id }] : []),
                  ...(ukuranSablonAttr && ukuranSablonOptions[0] ? [{ attributeId: ukuranSablonAttr.id, selectedOptionId: ukuranSablonOptions[0].id }] : []),
                  ...(desainAttr ? [{ attributeId: desainAttr.id, customValue: 'https://drive.google.com/file/d/tasbundle4' }] : [])
                ]
              }
            }
          ]
        }
      }
    })

    // Order 11: 2026-06-11 (Customer 1, Admin, 1 item)
    await prisma.order.create({
      data: {
        invoiceNumber: 'INV-20260611-011',
        recordedByUserId: admin.id,
        customerId: customer1.id,
        totalAmount: 45000.00,
        orderDate: new Date('2026-06-11'),
        orderItems: {
          create: [
            {
              productId: product2.id,
              quantity: 1,
              priceAtPurchase: 45000.00,
              orderItemDetails: {
                create: [
                  ...(desainAttr ? [{ attributeId: desainAttr.id, customValue: 'https://drive.google.com/file/d/tas6' }] : [])
                ]
              }
            }
          ]
        }
      }
    })

    // Order 12: 2026-06-12 (Customer 2, Operator, 1 item)
    await prisma.order.create({
      data: {
        invoiceNumber: 'INV-20260612-012',
        recordedByUserId: operator.id,
        customerId: customer2.id,
        totalAmount: 85000.00,
        orderDate: new Date('2026-06-12'),
        orderItems: {
          create: [
            {
              productId: product1.id,
              quantity: 1,
              priceAtPurchase: 85000.00,
              orderItemDetails: {
                create: [
                  ...(warnaKainAttr && warnaKainOptions[0] ? [{ attributeId: warnaKainAttr.id, selectedOptionId: warnaKainOptions[0].id }] : []),
                  ...(ukuranSablonAttr && ukuranSablonOptions[1] ? [{ attributeId: ukuranSablonAttr.id, selectedOptionId: ukuranSablonOptions[1].id }] : [])
                ]
              }
            }
          ]
        }
      }
    })
    console.log('   - 12 Orders seeded successfully!')
  } else {
    console.log('   - Orders already exist, skipping order seeding.')
  }

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