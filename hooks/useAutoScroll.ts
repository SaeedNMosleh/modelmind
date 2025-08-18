import { useCallback, useEffect, useRef, useState } from 'react'

interface UseAutoScrollOptions {
  /**
   * Distance from bottom (in pixels) to consider user "near bottom"
   * @default 100
   */
  threshold?: number
  /**
   * Whether to use smooth scrolling behavior
   * @default true
   */
  smooth?: boolean
  /**
   * Whether auto-scroll is enabled
   * @default true
   */
  enabled?: boolean
}

interface ScrollState {
  isNearBottom: boolean
  isAtBottom: boolean
  showScrollButton: boolean
}

export function useAutoScroll(options: UseAutoScrollOptions = {}) {
  const { threshold = 100, smooth = true, enabled = true } = options
  
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState<ScrollState>({
    isNearBottom: true,
    isAtBottom: true,
    showScrollButton: false
  })

  // Calculate scroll position and update state
  const updateScrollState = useCallback(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const { scrollTop, scrollHeight, clientHeight } = container
    
    const distanceFromBottom = scrollHeight - clientHeight - scrollTop
    const isNearBottom = distanceFromBottom <= threshold
    const isAtBottom = distanceFromBottom <= 5 // Small buffer for exact bottom detection
    
    setScrollState({
      isNearBottom,
      isAtBottom,
      showScrollButton: !isNearBottom && scrollHeight > clientHeight
    })
  }, [threshold])

  // Scroll to bottom function
  const scrollToBottom = useCallback((force = false, useSmooth = smooth) => {
    if (!containerRef.current || (!enabled && !force)) return

    const container = containerRef.current
    
    if (useSmooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      })
    } else {
      container.scrollTop = container.scrollHeight
    }
  }, [enabled, smooth])

  // Auto-scroll with intelligent triggers
  const autoScroll = useCallback((trigger: 'user_message' | 'ai_response' | 'loading' | 'force' = 'ai_response') => {
    if (!enabled && trigger !== 'force') return

    switch (trigger) {
      case 'user_message':
        // Always scroll when user sends a message - they expect to see their message
        scrollToBottom(true, true)
        break
        
      case 'ai_response':
        // Only scroll if user was near bottom - don't interrupt reading older messages
        if (scrollState.isNearBottom) {
          scrollToBottom(true, true)
        }
        break
        
      case 'loading':
        // Gentle scroll for loading state - only if user was near bottom
        if (scrollState.isNearBottom) {
          scrollToBottom(false, true)
        }
        break
        
      case 'force':
        // Force scroll regardless of position - used by scroll-to-bottom button
        scrollToBottom(true, true)
        break
    }

  }, [enabled, scrollToBottom, scrollState.isNearBottom])

  // Handle scroll events to update state
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      updateScrollState()
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    
    // Initial state calculation
    updateScrollState()

    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [updateScrollState])

  // Observe content changes for auto-scroll triggers
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new MutationObserver(() => {
      // Slight delay to ensure DOM updates are complete
      requestAnimationFrame(() => {
        updateScrollState()
      })
    })

    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true
    })

    return () => {
      observer.disconnect()
    }
  }, [updateScrollState])

  return {
    containerRef,
    scrollState,
    scrollToBottom,
    autoScroll,
    updateScrollState
  }
}