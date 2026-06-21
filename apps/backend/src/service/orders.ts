import { OpenAPIHono } from '@hono/zod-openapi'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, UserSession } from '../middlewares/auth.js'
import {
  createOrderRoute,
  listOrdersRoute,
  getOrderDetailRoute,
  updateOrderStatusRoute,
  deleteOrderRoute,
  updateOrderRoute
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
    paymentStatus: order.paymentStatus,
    pickupStatus: order.pickupStatus,
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
      })) : [],
      variantSelections: item.orderBundleVariantSelections ? item.orderBundleVariantSelections.map((v: any) => ({
        id: v.id.toString(),
        variantGroupId: v.variantGroupId.toString(),
        selectedProductId: v.selectedProductId.toString(),
        variantGroupName: v.variantGroup?.name || '',
        selectedProductName: v.selectedProduct?.name || ''
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
      variantSelections?: Array<{ variantGroupId: bigint; selectedProductId: bigint }>
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
            bundleProducts: {
              include: {
                product: true,
                variantGroup: true
              }
            }
          }
        })
        if (!bundle) {
          return c.json({ error: `Paket bundling dengan ID ${item.bundleId} tidak ditemukan atau tidak aktif` }, 400)
        }
        price = parseFloat(bundle.bundlePrice.toString())

        // Validate bundle product attribute details if provided
        if (item.details) {
          // Identify valid product IDs for this bundle
          // A product ID is valid if it's a direct product inside the bundle,
          // OR if it's a product that belongs to one of the variantGroups inside the bundle.
          const directProductIds = bundle.bundleProducts.filter(bp => bp.productId !== null).map(bp => bp.productId!)
          const variantGroupIds = bundle.bundleProducts.filter(bp => bp.variantGroupId !== null).map(bp => bp.variantGroupId!)

          for (const det of item.details) {
            const attr = await prisma.productAttribute.findUnique({
              where: { id: BigInt(det.attributeId) }
            })
            if (!attr) {
              return c.json({ error: `Atribut kustomisasi (ID: ${det.attributeId}) tidak valid` }, 400)
            }

            let isAttrValid = directProductIds.includes(attr.productId)
            if (!isAttrValid && variantGroupIds.length > 0) {
              const attrProduct = await prisma.product.findUnique({
                where: { id: attr.productId }
              })
              if (attrProduct && attrProduct.variantGroupId && variantGroupIds.includes(attrProduct.variantGroupId)) {
                isAttrValid = true
              }
            }

            if (!isAttrValid) {
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

        // Validate variant selections if the bundle requires any
        const variantBundleProducts = bundle.bundleProducts.filter((bp) => bp.variantGroupId !== null)

        const selectionsToCreate: Array<{ variantGroupId: bigint; selectedProductId: bigint }> = []

        if (variantBundleProducts.length > 0) {
          const clientSelections = [...(item.variantSelections || [])]
          
          for (const bp of variantBundleProducts) {
            const vgId = bp.variantGroupId!
            const qtyNeeded = bp.quantity
            
            for (let k = 0; k < qtyNeeded; k++) {
              // Find selection from client payload and consume it
              const selectionIndex = clientSelections.findIndex((s: any) => BigInt(s.variantGroupId) === vgId)
              if (selectionIndex === -1) {
                return c.json({ error: `Pilihan varian wajib diisi sebanyak ${qtyNeeded} kali untuk kelompok varian dengan ID ${vgId} di bundle ${bundle.name}` }, 400)
              }
              const selection = clientSelections[selectionIndex]
              clientSelections.splice(selectionIndex, 1) // consume this selection

              const selectedProdId = BigInt(selection.selectedProductId)
              // Verify selected product is active and belongs to this variant group
              const selectedProduct = await prisma.product.findUnique({
                where: { id: selectedProdId, isActive: true }
              })
              if (!selectedProduct || selectedProduct.variantGroupId !== vgId) {
                return c.json({ error: `Produk pilihan (ID: ${selection.selectedProductId}) tidak valid atau bukan merupakan bagian dari kelompok varian (ID: ${vgId})` }, 400)
              }
              selectionsToCreate.push({
                variantGroupId: vgId,
                selectedProductId: selectedProdId
              })
            }
          }
        }

        orderItemsToCreate.push({
          productId: null,
          bundleId: BigInt(item.bundleId),
          quantity: item.quantity,
          priceAtPurchase: price,
          details: item.details || [],
          variantSelections: selectionsToCreate
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
          orderDate: new Date(body['order-date']),
          paymentStatus: body.paymentStatus,
          pickupStatus: body.pickupStatus
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

        if (item.variantSelections && item.variantSelections.length > 0) {
          await tx.orderBundleVariantSelection.createMany({
            data: item.variantSelections.map((v: any) => ({
              orderItemId: orderItem.id,
              variantGroupId: v.variantGroupId,
              selectedProductId: v.selectedProductId
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
              orderBundleVariantSelections: {
                include: {
                  variantGroup: true,
                  selectedProduct: true
                }
              },
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
            orderBundleVariantSelections: {
              include: {
                variantGroup: true,
                selectedProduct: true
              }
            },
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
            orderBundleVariantSelections: {
              include: {
                variantGroup: true,
                selectedProduct: true
              }
            },
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

// 4. PATCH /:id - Update Order Status (Admin & Operator)
orders.openapi(updateOrderStatusRoute, async (c) => {
  try {
    const prisma = c.get('prisma')
    const user = c.get('user') as UserSession | undefined
    if (!user) {
      return c.json({ error: 'Unauthorized: Sesi tidak ditemukan' }, 401)
    }

    const { id } = c.req.valid('param')
    const body = c.req.valid('json')

    // Find the order first
    const order = await prisma.order.findUnique({
      where: { id: BigInt(id) }
    })
    if (!order) {
      return c.json({ error: 'Nota pesanan tidak ditemukan' }, 404)
    }

    // Update status in DB
    const updated = await prisma.order.update({
      where: { id: BigInt(id) },
      data: {
        paymentStatus: body.paymentStatus,
        pickupStatus: body.pickupStatus
      },
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
            orderBundleVariantSelections: {
              include: {
                variantGroup: true,
                selectedProduct: true
              }
            },
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

    return c.json(serializeOrder(updated), 200)

  } catch (error: any) {
    console.error('Update order status error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

// 5. DELETE /:id - Delete Order (Admin & Operator)
orders.openapi(deleteOrderRoute, async (c) => {
  try {
    const prisma = c.get('prisma')
    const user = c.get('user') as UserSession | undefined
    if (!user) {
      return c.json({ error: 'Unauthorized: Sesi tidak ditemukan' }, 401)
    }

    const { id } = c.req.valid('param')

    const order = await prisma.order.findUnique({
      where: { id: BigInt(id) }
    })
    if (!order) {
      return c.json({ error: 'Nota pesanan tidak ditemukan' }, 404)
    }

    if (order.pickupStatus === 'sudah_diambil') {
      return c.json({ error: 'Nota pesanan yang sudah diambil tidak dapat dihapus' }, 400)
    }

    // Cascade deletes OrderItems, details, and variant selections in DB/Prisma
    await prisma.order.delete({
      where: { id: BigInt(id) }
    })

    return c.json({ success: true, message: 'Nota pesanan berhasil dihapus' }, 200)

  } catch (error: any) {
    console.error('Delete order error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

// 6. PUT /:id - Update Order (Admin & Operator)
orders.openapi(updateOrderRoute, async (c) => {
  try {
    const prisma = c.get('prisma')
    const user = c.get('user') as UserSession | undefined
    if (!user) {
      return c.json({ error: 'Unauthorized: Sesi tidak ditemukan' }, 401)
    }

    const { id } = c.req.valid('param')
    const body = c.req.valid('json')

    // Find the order first
    const existingOrder = await prisma.order.findUnique({
      where: { id: BigInt(id) }
    })
    if (!existingOrder) {
      return c.json({ error: 'Nota pesanan tidak ditemukan' }, 404)
    }

    if (existingOrder.pickupStatus === 'sudah_diambil') {
      return c.json({ error: 'Nota pesanan yang sudah diambil tidak dapat diubah' }, 400)
    }

    // Verify invoice number uniqueness if changed
    if (body.invoiceNumber !== existingOrder.invoiceNumber) {
      const duplicateInvoice = await prisma.order.findUnique({
        where: { invoiceNumber: body.invoiceNumber }
      })
      if (duplicateInvoice) {
        return c.json({ error: 'Nomor invoice sudah terdaftar di sistem' }, 400)
      }
    }

    // Validate items and lock prices
    let calculatedTotal = 0
    const orderItemsToCreate: Array<{
      productId: bigint | null
      bundleId: bigint | null
      quantity: number
      priceAtPurchase: number
      details: Array<{ attributeId: string; selectedOptionId?: string | null; customValue?: string | null }>
      variantSelections?: Array<{ variantGroupId: bigint; selectedProductId: bigint }>
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
            bundleProducts: {
              include: {
                product: true,
                variantGroup: true
              }
            }
          }
        })
        if (!bundle) {
          return c.json({ error: `Paket bundling dengan ID ${item.bundleId} tidak ditemukan atau tidak aktif` }, 400)
        }
        price = parseFloat(bundle.bundlePrice.toString())

        // Validate bundle product attribute details if provided
        if (item.details) {
          const directProductIds = bundle.bundleProducts.filter(bp => bp.productId !== null).map(bp => bp.productId!)
          const variantGroupIds = bundle.bundleProducts.filter(bp => bp.variantGroupId !== null).map(bp => bp.variantGroupId!)

          for (const det of item.details) {
            const attr = await prisma.productAttribute.findUnique({
              where: { id: BigInt(det.attributeId) }
            })
            if (!attr) {
              return c.json({ error: `Atribut kustomisasi (ID: ${det.attributeId}) tidak valid` }, 400)
            }

            let isAttrValid = directProductIds.includes(attr.productId)
            if (!isAttrValid && variantGroupIds.length > 0) {
              const attrProduct = await prisma.product.findUnique({
                where: { id: attr.productId }
              })
              if (attrProduct && attrProduct.variantGroupId && variantGroupIds.includes(attrProduct.variantGroupId)) {
                isAttrValid = true
              }
            }

            if (!isAttrValid) {
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

        // Validate variant selections if the bundle requires any
        const variantBundleProducts = bundle.bundleProducts.filter((bp) => bp.variantGroupId !== null)

        const selectionsToCreate: Array<{ variantGroupId: bigint; selectedProductId: bigint }> = []

        if (variantBundleProducts.length > 0) {
          const clientSelections = [...(item.variantSelections || [])]
          
          for (const bp of variantBundleProducts) {
            const vgId = bp.variantGroupId!
            const qtyNeeded = bp.quantity
            
            for (let k = 0; k < qtyNeeded; k++) {
              const selectionIndex = clientSelections.findIndex((s: any) => BigInt(s.variantGroupId) === vgId)
              if (selectionIndex === -1) {
                return c.json({ error: `Pilihan varian wajib diisi sebanyak ${qtyNeeded} kali untuk kelompok varian dengan ID ${vgId} di bundle ${bundle.name}` }, 400)
              }
              const selection = clientSelections[selectionIndex]
              clientSelections.splice(selectionIndex, 1)

              const selectedProdId = BigInt(selection.selectedProductId)
              const selectedProduct = await prisma.product.findUnique({
                where: { id: selectedProdId, isActive: true }
              })
              if (!selectedProduct || selectedProduct.variantGroupId !== vgId) {
                return c.json({ error: `Produk pilihan (ID: ${selection.selectedProductId}) tidak valid atau bukan merupakan bagian dari kelompok varian (ID: ${vgId})` }, 400)
              }
              selectionsToCreate.push({
                variantGroupId: vgId,
                selectedProductId: selectedProdId
              })
            }
          }
        }

        orderItemsToCreate.push({
          productId: null,
          bundleId: BigInt(item.bundleId),
          quantity: item.quantity,
          priceAtPurchase: price,
          details: item.details || [],
          variantSelections: selectionsToCreate
        })

      } else {
        return c.json({ error: 'Setiap item wajib memiliki tepat satu productId atau bundleId' }, 400)
      }

      calculatedTotal += price * item.quantity
    }

    // Write updates inside transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
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

      // Update Order basic details
      const order = await tx.order.update({
        where: { id: BigInt(id) },
        data: {
          invoiceNumber: body.invoiceNumber,
          customerId: customer.id,
          totalAmount: calculatedTotal,
          orderDate: new Date(body['order-date']),
          paymentStatus: body.paymentStatus,
          pickupStatus: body.pickupStatus
        }
      })

      // Delete old order items
      await tx.orderItem.deleteMany({
        where: { orderId: order.id }
      })

      // Create new order items
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

        if (item.variantSelections && item.variantSelections.length > 0) {
          await tx.orderBundleVariantSelection.createMany({
            data: item.variantSelections.map((v: any) => ({
              orderItemId: orderItem.id,
              variantGroupId: v.variantGroupId,
              selectedProductId: v.selectedProductId
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
              orderBundleVariantSelections: {
                include: {
                  variantGroup: true,
                  selectedProduct: true
                }
              },
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

    return c.json(serializeOrder(updatedOrder), 200)

  } catch (error: any) {
    console.error('Update order error:', error)
    return c.json({ error: 'Internal server error', detail: error.message }, 500)
  }
})

export default orders
