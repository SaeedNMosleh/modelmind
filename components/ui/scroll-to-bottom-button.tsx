import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ScrollToBottomButtonProps {
  /**
   * Whether the button should be visible
   */
  visible: boolean
  /**
   * Callback when button is clicked
   */
  onClick: () => void
  /**
   * Additional CSS classes
   */
  className?: string
  /**
   * Whether to show with reduced opacity (less intrusive)
   */
  subtle?: boolean
}

export function ScrollToBottomButton({ 
  visible, 
  onClick, 
  className,
  subtle = false 
}: ScrollToBottomButtonProps) {
  return (
    <div
      className={cn(
        "absolute bottom-20 right-4 z-10 transition-all duration-300 ease-in-out",
        visible 
          ? "opacity-100 transform translate-y-0" 
          : "opacity-0 transform translate-y-2 pointer-events-none",
        className
      )}
    >
      <Button
        size="sm"
        variant="secondary"
        onClick={onClick}
        className={cn(
          "shadow-lg border border-[#384364] bg-[#1C2032]/90 backdrop-blur-sm",
          "hover:bg-[#2A3046] hover:border-[#4A5578] transition-all duration-200",
          "text-gray-300 hover:text-white",
          "flex items-center space-x-1 px-3 py-2 rounded-full",
          subtle && "opacity-60 hover:opacity-100"
        )}
        aria-label="Scroll to bottom"
      >
        <ChevronDown size={16} />
        <span className="text-xs font-medium hidden sm:inline">
          Scroll to bottom
        </span>
      </Button>
    </div>
  )
}