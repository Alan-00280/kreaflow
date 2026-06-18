import * as React from "react"
import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface WhatsAppButtonProps {
  phone: string
  name: string
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  children?: React.ReactNode
  title?: string
}

export function WhatsAppButton({
  phone,
  name,
  className,
  variant = "outline",
  size = "default",
  children,
  title
}: WhatsAppButtonProps) {
  if (!phone) return null

  // Strip all non-digits
  let cleaned = phone.replace(/\D/g, '')
  // Replace leading '0' with '62'
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1)
  }

  const templateText = `Hai ${name}, Kami dari Ekonomi Kreatif`
  const href = `https://wa.me/${cleaned}?text=${encodeURIComponent(templateText)}`

  return (
    <Button
      variant={variant}
      size={size}
      title={title}
      className={cn(
        "border-emerald-200 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900 dark:hover:bg-emerald-900/40 gap-1.5",
        className
      )}
      asChild
    >
      <a href={href} target="_blank" rel="noopener noreferrer">
        <MessageSquare className="h-4 w-4" />
        {children}
      </a>
    </Button>
  )
}
