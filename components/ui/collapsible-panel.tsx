"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsiblePanelProps {
  title: string
  icon?: React.ReactNode
  defaultExpanded?: boolean
  className?: string
  headerClassName?: string
  contentClassName?: string
  children: React.ReactNode
  onToggle?: (expanded: boolean) => void
  id?: string
}

export function CollapsiblePanel({
  title,
  icon,
  defaultExpanded = true,
  className,
  headerClassName,
  contentClassName,
  children,
  onToggle,
  id,
}: CollapsiblePanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  // Notify parent component when expanded state changes
  useEffect(() => {
    if (onToggle) {
      onToggle(expanded)
    }
  }, [expanded, onToggle])

  const toggleExpanded = () => {
    setExpanded(!expanded)
  }

  return (
    <div 
      id={id}
      className={cn(
        "flex flex-col h-full bg-[#1E2433] border border-[#2D3656] rounded-md transition-all duration-300",
        expanded ? "w-full" : "w-auto",
        className
      )}
    >
      <div 
        className={cn(
          "flex items-center justify-between p-3 bg-[#252C40] border-b border-[#2D3656] cursor-pointer",
          expanded ? "rounded-t-md" : "rounded-md",
          headerClassName
        )}
        onClick={toggleExpanded}
      >
        <div className="flex items-center">
          {icon && (
            <div className="mr-2">
              {icon}
            </div>
          )}
          {expanded && (
            <h3 className="font-semibold text-white">{title}</h3>
          )}
        </div>
        <button 
          className="flex items-center justify-center w-8 h-8 rounded-md bg-[#384364] border border-[#495685] text-gray-200 hover:bg-[#2D3656]"
          onClick={(e) => {
            e.stopPropagation()
            toggleExpanded()
          }}
        >
          {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
      {expanded && (
        <div 
          className={cn(
            "flex-1 overflow-hidden",
            contentClassName
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}