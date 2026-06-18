'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { BadgeCheck, Bell, CreditCard, LogOut } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { getInitials } from '@/lib/utils'
import { useSession } from '@/components/providers/session-provider'
import { logoutAction } from '@/server/auth-actions'

export function AccountSwitcher() {
  const session = useSession()
  const router = useRouter()

  const user = {
    name: session?.name || 'Guest User',
    role: session?.role || 'operator',
    email: session?.role ? `Role: ${session.role.toUpperCase()}` : 'Guest Account',
    avatar: ''
  }

  const handleLogout = async () => {
    try {
      const res = await logoutAction()
      if (res.success) {
        toast.success('Logout berhasil')
        router.push('/auth/v2/login')
        router.refresh()
      } else {
        toast.error('Logout gagal', { description: res.error })
      }
    } catch (err) {
      toast.error('Terjadi kesalahan saat logout')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-8 rounded-lg cursor-pointer hover:opacity-85 transition-opacity">
          <AvatarImage src={user.avatar || undefined} alt={user.name} />
          <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 space-y-1 rounded-lg" side="bottom" align="end" sideOffset={4}>
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="size-9 rounded-lg">
              <AvatarImage src={user.avatar || undefined} alt={user.name} />
              <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground capitalize">{user.role}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer">
            <BadgeCheck className="mr-2 h-4 w-4" />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <CreditCard className="mr-2 h-4 w-4" />
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
