'use client'

import { type ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  variant?: 'default' | 'accent' | 'danger' | 'success'
}

export function StatCard({ title, value, subtitle, icon: Icon, variant = 'default' }: StatCardProps) {
  const colorClasses = {
    default: 'text-foreground',
    accent: 'text-accent',
    danger: 'text-red-600 dark:text-red-400',
    success: 'text-green-600 dark:text-green-400',
  }

  const bgClasses = {
    default: 'bg-muted text-muted-foreground',
    accent: 'bg-accent/10 text-accent',
    danger: 'bg-red-500/10 text-red-600 dark:text-red-400',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
              {title}
            </p>
            <p className={`text-2xl font-bold ${colorClasses[variant]}`}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-lg shrink-0 ${bgClasses[variant]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
