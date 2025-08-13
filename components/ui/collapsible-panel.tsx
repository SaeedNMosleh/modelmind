"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { cn } from "@/lib/utils"

type PanelState = boolean | "collapsed" | "normal" | "expanded"

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
  enableTripleState?: boolean
  tripleState?: "collapsed" | "normal" | "expanded"
  onTripleStateChange?: (state: "collapsed" | "normal" | "expanded") => void
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
  enableTripleState = false,
  tripleState = "normal",
  onTripleStateChange,
}: CollapsiblePanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  // Notify parent component when expanded state changes
  useEffect(() => {
    if (onToggle && !enableTripleState) {
      onToggle(expanded)
    }
  }, [expanded, onToggle, enableTripleState])

  const handleStateChange = (newState: "collapsed" | "normal" | "expanded") => {
    if (enableTripleState && onTripleStateChange) {
      onTripleStateChange(newState)
    } else {
      setExpanded(!expanded)
    }
  }

  // Determine if content should be shown
  const isContentVisible = enableTripleState 
    ? tripleState !== "collapsed"
    : expanded

  return (
    <div 
      id={id}
      className={cn(
        "flex flex-col h-full bg-[#1E2433] border-[0.5px] border-[#2D3656] rounded-md transition-all duration-300",
        expanded ? "w-full" : "w-auto",
        className
      )}
    >
      <div 
        className={cn(
          "flex items-center justify-between p-2 bg-[#252C40] border-b-[0.5px] border-[#2D3656] cursor-pointer",
          isContentVisible ? "rounded-t-md" : "rounded-md",
          headerClassName
        )}
        onClick={() => !enableTripleState && handleStateChange("normal")}
      >
        <div className="flex items-center">
          {icon && (
            <div className="mr-2">
              {icon}
            </div>
          )}
          {isContentVisible && (
            <h3 className="font-semibold text-white">{title}</h3>
          )}
        </div>
{enableTripleState ? (
          // Triple state mode - different button layouts based on current state
          tripleState === "normal" ? (
            // Normal mode: Show two buttons (collapse and expand)
            <div className="flex gap-0">
              <button 
                className="flex items-center justify-center w-6 h-6 rounded-md bg-[#384364] border border-[#495685] text-gray-200 hover:bg-[#2D3656]"
                onClick={(e) => {
                  e.stopPropagation()
                  handleStateChange("collapsed")
                }}
                title="Collapse panel"
              >
                <ChevronLeft size={12} />
              </button>
              <button 
                className="flex items-center justify-center w-6 h-6 rounded-md bg-[#384364] border border-[#495685] text-gray-200 hover:bg-[#2D3656]"
                onClick={(e) => {
                  e.stopPropagation()
                  handleStateChange("expanded")
                }}
                title="Expand panel"
              >
                <ChevronsRight size={12} />
              </button>
            </div>
          ) : (
            // Collapsed or Expanded mode: Show single button
            <button 
              className="flex items-center justify-center w-6 h-6 rounded-md bg-[#384364] border border-[#495685] text-gray-200 hover:bg-[#2D3656]"
              onClick={(e) => {
                e.stopPropagation()
                handleStateChange("normal")
              }}
              title={tripleState === "collapsed" ? "Show panel" : "Return to normal size"}
            >
              {tripleState === "collapsed" ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          )
        ) : (
          // Regular two-state mode
          <button 
            className="flex items-center justify-center w-8 h-8 rounded-md bg-[#384364] border border-[#495685] text-gray-200 hover:bg-[#2D3656]"
            onClick={(e) => {
              e.stopPropagation()
              handleStateChange("normal")
            }}
          >
            {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
      </div>
      <div 
        className={cn(
          "flex-1 overflow-hidden",
          isContentVisible ? "block" : "hidden",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}