import {
  Boxes,
  LayoutDashboard,
  Package,
  PlusCircle,
  ReceiptText,
  UserCog,
  Users,
  ClipboardList,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavSubItem {
  title: string
  url: string
  icon?: LucideIcon
  comingSoon?: boolean
  newTab?: boolean
  isNew?: boolean
  roles?: string[]
}

export interface NavMainItem {
  title: string
  url: string
  icon?: LucideIcon
  subItems?: NavSubItem[]
  comingSoon?: boolean
  newTab?: boolean
  isNew?: boolean
  roles?: string[]
}

export interface NavGroup {
  id: number
  label?: string
  items: NavMainItem[]
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: 'Overview',
    items: [
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutDashboard,
        roles: ['admin', 'operator']
      }
    ]
  },
  {
    id: 2,
    label: 'Transaksi',
    items: [
      {
        title: 'Daftar Pesanan',
        url: '/dashboard/orders',
        icon: ReceiptText,
        roles: ['admin', 'operator']
      },
      {
        title: 'Catat Pesanan',
        url: '/dashboard/orders/new',
        icon: PlusCircle,
        roles: ['admin', 'operator']
      },
      {
        title: 'Ringkasan Pesanan',
        url: '/dashboard/product-order-summaries',
        icon: ClipboardList,
        roles: ['admin', 'operator']
      }
    ]
  },
  {
    id: 3,
    label: 'Katalog',
    items: [
      {
        title: 'Produk Satuan',
        url: '/dashboard/products',
        icon: Package,
        roles: ['admin', 'operator']
      },
      {
        title: 'Paket Bundling',
        url: '/dashboard/bundles',
        icon: Boxes,
        roles: ['admin', 'operator']
      }
    ]
  },
  {
    id: 4,
    label: 'Manajemen',
    items: [
      {
        title: 'Pelanggan',
        url: '/dashboard/customers',
        icon: Users,
        roles: ['admin', 'operator']
      },
      {
        title: 'Manajemen Staff',
        url: '/dashboard/users',
        icon: UserCog,
        roles: ['admin']
      }
    ]
  }
]
