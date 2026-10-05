'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface TruncatedCellProps {
  text: string | null | undefined
  maxLength?: number
  className?: string
}

export function TruncatedCell({ text, maxLength = 50, className = '' }: TruncatedCellProps) {
  const str = text ?? ''
  const isLong = str.length > maxLength
  const display = isLong ? str.substring(0, maxLength) + '…' : str

  if (!isLong) {
    return <span className={className}>{display}</span>
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-help truncate block max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap ${className}`}>
            {display}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[400px] break-words whitespace-normal">
          {str}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
