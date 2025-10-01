"use client"

import { useSimpleChat } from "@/hooks/useSimpleChat"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useCallback, useState, useEffect, useRef, useMemo, useLayoutEffect} from "react"
import { User, Bot, Send, Image, Paperclip, MessageCircle, Zap } from 'lucide-react'
import { ScrollToBottomButton } from '@/components/ui/scroll-to-bottom-button'

interface ChatInterfaceProps {
  onScriptGenerated: (script: string) => void
  currentScript: string
}

interface ChatMessage {
  id: string
  role: string
  content: string
}

// API mode types
type ApiMode = "freeform" | "advanced"

export function ChatInterface({ onScriptGenerated, currentScript }: ChatInterfaceProps) {  // State for API mode toggle
  const [apiMode, setApiMode] = useState<ApiMode>("freeform")
  
  // Persist API mode preference in localStorage
  useEffect(() => {
    // Load saved preference on initial mount
    const savedMode = localStorage.getItem('modelMind.apiMode') as ApiMode | null;
    if (savedMode) {
      setApiMode(savedMode);
    }
  }, []);
  
  // Save preference when it changes
  useEffect(() => {
    localStorage.setItem('modelMind.apiMode', apiMode);
  }, [apiMode]);

  // Messages state - must be declared before useSimpleChat hook
  const [messages, setMessages] = useState<ChatMessage[]>([])

  // Initialize the chat hook with dynamic API endpoint
  const { input, handleInputChange, handleSubmit, isLoading } = useSimpleChat({
    api: apiMode === "freeform" ? "/api/chatopenai" : "/api/pipeline",
    body: {
      messages,
      currentScript,
    },
    onResponse: async (response) => {
      try {
        const text = await response.text()
        const responseData = JSON.parse(text)

        // Handle different response formats based on the API mode
        if (apiMode === "freeform") {
          // Handle chatopenai format
          const { mandatory, optional } = responseData

          if (mandatory.type === "message") {
            setMessages((prevMessages) => [
              ...prevMessages,
              { id: Date.now().toString(), role: "assistant", content: mandatory.content },
            ])
          }

          if (optional && optional.type === "script" && optional.content !== "") {
            onScriptGenerated(optional.content)
          }

          return mandatory.content        } else {
          // Handle pipeline format - normalize casing from ResponseType enum
          const responseType = responseData.type?.toLowerCase();

          if (responseType === "script") {
            setMessages((prevMessages) => [
              ...prevMessages,
              { id: Date.now().toString(), role: "assistant", content: responseData.explanation || responseData.content },
            ])

            onScriptGenerated(responseData.content)
          } else if (responseType === "message" || responseType === "error") {
            setMessages((prevMessages) => [
              ...prevMessages,
              { id: Date.now().toString(), role: "assistant", content: responseData.content },
            ])
          }

          return responseData.content
        }
      } catch (error) {
        console.error("Failed to parse response:", error)
        return response.statusText
      }
    },
  })
  const [textareaHeight, setTextareaHeight] = useState<number>(72) // Reduced default height
  const [showCommands, setShowCommands] = useState(false)
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState({
    isNearBottom: true,
    showScrollButton: false
  })
  
  // Get the actual scrolling viewport element
  const getScrollViewport = useCallback(() => {
    return scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
  }, [])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const commandsRef = useRef<HTMLDivElement>(null)
  
  const MIN_TEXTAREA_HEIGHT = 56 // Reduced minimum height
  const MAX_TEXTAREA_HEIGHT = 180 // Reduced maximum height

  // Command processors wrapped in useMemo to avoid recreating on every render
  const commands = useMemo(() => ({
    "@clear": () => {
      setMessages([])
      handleInputChange({ target: { value: "" } } as React.ChangeEvent<HTMLTextAreaElement>)
    },
    "@reset": () => {
      onScriptGenerated("")
      handleInputChange({ target: { value: "" } } as React.ChangeEvent<HTMLTextAreaElement>)
    },
  }), [setMessages, handleInputChange, onScriptGenerated]);

  const commandList = useMemo(() => Object.keys(commands), [commands]);

  // Simple, working auto-scroll
  const scrollToBottom = useCallback((force = false) => {
    const viewport = getScrollViewport()
    if (!viewport) return
    
    if (force) {
      // Always scroll for user messages or forced scroll
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: 'smooth'
      })
    } else {
      // Check if user is near bottom before auto-scrolling
      const isNearBottom = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop < 100
      if (isNearBottom) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: 'smooth'
        })
      }
    }
  }, [getScrollViewport])

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length === 0) return
    
    const lastMessage = messages[messages.length - 1]
    
    // Always scroll for user messages, conditionally for AI responses
    scrollToBottom(lastMessage.role === 'user')
  }, [messages, scrollToBottom])

  // Auto-scroll when loading state changes
  useEffect(() => {
    if (isLoading) {
      scrollToBottom(false) // Gentle scroll for loading
    }
  }, [isLoading, scrollToBottom])
  
  // Update scroll state for button visibility
  useEffect(() => {
    const viewport = getScrollViewport()
    if (!viewport) return
    
    const handleScroll = () => {
      const isNearBottom = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop < 100
      setScrollState({
        isNearBottom,
        showScrollButton: !isNearBottom && viewport.scrollHeight > viewport.clientHeight
      })
    }
    
    viewport.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial check
    
    return () => viewport.removeEventListener('scroll', handleScroll)
  }, [getScrollViewport])

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const userMessage = input.trim()
      if (userMessage) {
        const command = commandList.find((cmd) => userMessage.includes(cmd))
        if (command && commands[command]) {
          commands[command]()
        } else {
          setMessages((prevMessages) => [
            ...prevMessages,
            { id: Date.now().toString(), role: "user", content: userMessage },
          ])
          handleInputChange({ target: { value: "" } } as React.ChangeEvent<HTMLTextAreaElement>)
          handleSubmit(e)
        }
      }
      setShowCommands(false)
    },
    [input, handleSubmit, commandList, commands, setMessages, handleInputChange],
  )

  // Dynamically adjust textarea height
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      // Reset height to auto to calculate actual content height
      textareaRef.current.style.height = 'auto'
      
      // Calculate new height, constrained between min and max
      const newHeight = Math.min(
        Math.max(textareaRef.current.scrollHeight, MIN_TEXTAREA_HEIGHT),
        MAX_TEXTAREA_HEIGHT
      )
      
      // Set the new height
      textareaRef.current.style.height = `${newHeight}px`
      setTextareaHeight(newHeight)
    }
  }, [MIN_TEXTAREA_HEIGHT, MAX_TEXTAREA_HEIGHT])

  // Adjust height whenever input changes
  useEffect(() => {
    adjustTextareaHeight()
  }, [input, adjustTextareaHeight])

  // Initial adjustment after render
  useLayoutEffect(() => {
    adjustTextareaHeight()
  }, [adjustTextareaHeight])

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e);
    adjustTextareaHeight();
    
    const value = e.target.value
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = value.slice(0, cursorPos)
    const currentWord = textBeforeCursor.split(/\s+/).pop() || ""
    
    setShowCommands(currentWord.startsWith("@"))
    setSelectedCommandIndex(0)
  }

  const handleTextareaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const overlayDiv = e.currentTarget.previousSibling as HTMLDivElement
    if (overlayDiv) {
      overlayDiv.scrollTop = e.currentTarget.scrollTop
    }
  }

  const filteredCommands = useMemo(() => input 
    ? commandList.filter((cmd) => cmd.startsWith(input.split(/\s+/).pop() || "")) 
    : [], [input, commandList]);

  const insertCommand = useCallback((cmd: string) => {
    if (textareaRef.current) {
      const cursorPosition = textareaRef.current.selectionStart
      const textBeforeCursor = input.slice(0, cursorPosition)
      const textAfterCursor = input.slice(cursorPosition)
      const lastSpaceIndex = textBeforeCursor.lastIndexOf(" ")
      const newValue = textBeforeCursor.slice(0, lastSpaceIndex + 1) + cmd + " " + textAfterCursor
      
      handleInputChange({ target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>)
      setShowCommands(false)
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          const newPos = lastSpaceIndex + 1 + cmd.length + 1
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newPos
        }
      }, 0)
    }
  }, [input, handleInputChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommands && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedCommandIndex((prevIndex) => (prevIndex < filteredCommands.length - 1 ? prevIndex + 1 : prevIndex))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedCommandIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : prevIndex))
      } else if (e.key === "Enter" && !e.shiftKey) {
        if (filteredCommands[selectedCommandIndex]?.startsWith("@")) {
          // Insert the command instead of submitting
          e.preventDefault()
          insertCommand(filteredCommands[selectedCommandIndex])
          return
        }
        e.preventDefault()
        onSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
      } else if (e.key === "Escape") {
        setShowCommands(false)
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
    }
  }, [showCommands, filteredCommands, selectedCommandIndex, insertCommand, onSubmit]);

  // Highlight commands in text
  const highlightText = useCallback((text: string) => {
    return text.split(/(@\w+)/).map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <span key={index} className="bg-blue-700/30 text-blue-300 rounded py-0.5 px-1">
            {part}
          </span>
        )
      } else {
        return <span key={index} className="text-gray-100">{part}</span>
      }
    })
  }, []);

  // Shared styles so both the overlay and textarea align
  const sharedStyle: React.CSSProperties = {
    fontSize: "0.9rem", // Smaller font
    lineHeight: "1.4", // Tighter line spacing
    padding: "6px", // Reduced padding
    fontFamily: "inherit", 
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    wordBreak: "break-word",
    boxSizing: "border-box",
    transition: "all 0.2s ease-in-out",
  }

  return (
    <div className="flex flex-col h-full relative">
      <ScrollArea 
        ref={scrollAreaRef} 
        className="flex-1 pr-2 pl-2 py-4 overflow-y-auto"
      >
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`${message.role === "user" ? "message-user" : "message-assistant"} mb-2 p-2 flex flex-col`}
          >
            <div className="flex items-center mb-1">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full ${message.role === "user" ? "bg-[#2E3B5E]" : "bg-[#2A3046]"}`}>
                {message.role === "user" ? (
                  <User size={12} className="text-[#96ADFF]" />
                ) : (
                  <Bot size={12} className="text-[#79DBC7]" />
                )}
              </div>
              <div className="ml-1 text-xs font-semibold">
                {message.role === "user" ? (
                  <span className="text-[#96ADFF]">You</span>
                ) : (
                  <span className="text-[#79DBC7]">Assistant</span>
                )}
              </div>
            </div>
            <div className="ml-7 flex-1 min-w-0">
              <p className={`whitespace-pre-wrap text-sm leading-tight break-words ${
                message.role === "user" ? "text-[#F1F3FF]" : "text-[#E8FFF8]"
              }`}>
                {message.content.split(/(@\w+)/).map((part, index) =>
                  part.startsWith("@") ? (
                    <Badge key={index} variant="secondary" className="mr-1 bg-blue-700/30 text-blue-300 text-xs">
                      {part}
                    </Badge>
                  ) : (
                    part
                  ),
                )}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message-assistant mb-3 p-3 flex flex-col"> 
            <div className="flex items-center mb-1">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#2A3046]">
                <Bot size={12} className="text-[#79DBC7]" />
              </div>
              <div className="ml-1 text-xs font-semibold">
                <span className="text-[#79DBC7]">Assistant</span>
              </div>
            </div>
            <div className="ml-7 flex-1 min-w-0">
              <p className="whitespace-pre-wrap text-sm leading-tight break-words text-[#E8FFF8] opacity-80">
                Thinking...
              </p>
            </div>
          </div>
        )}
      </ScrollArea>
      
      {/* Scroll to bottom button */}
      <ScrollToBottomButton
        visible={scrollState.showScrollButton}
        onClick={() => scrollToBottom(true)}
        subtle={false}
      />
      
      <form onSubmit={onSubmit} className="mt-2 mb-2 px-2">
        <div className="chat-input-wrapper relative">
          <div className="chat-input-container rounded-md">
            {/* Overlay that displays highlighted commands */}
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden z-0 rounded-md px-3 py-2"
              style={{
                ...sharedStyle,
                height: `${textareaHeight}px`,
                paddingBottom: "40px", // Add extra padding at the bottom for the toolbar
                overflowY: textareaHeight >= MAX_TEXTAREA_HEIGHT ? "scroll" : "hidden",
              }}
            >
              {highlightText(input)}
            </div>
            
            {/* The real Textarea which remains fully functional */}
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onScroll={handleTextareaScroll}
              placeholder="Ask about PlantUML diagrams..."
              className="relative caret-white bg-transparent resize-none border-none transition-all duration-200 ease-in-out z-1"
              style={{
                ...sharedStyle,
                minHeight: `${MIN_TEXTAREA_HEIGHT}px`,
                maxHeight: `${MAX_TEXTAREA_HEIGHT}px`,
                height: `${textareaHeight}px`,
                paddingBottom: "40px", // Add extra padding at the bottom for the toolbar
                overflowY: textareaHeight >= MAX_TEXTAREA_HEIGHT ? "scroll" : "hidden", 
                caretColor: "white", 
                color: "transparent", 
              }}
            />
              {/* New bottom toolbar area for action buttons */}
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-[#1C2032] border-t border-[#384364] rounded-b-md flex items-center justify-between px-3">
              {/* Left side - only image and attachment icons */}
              <div className="flex items-center space-x-2 text-gray-400">
                <button type="button" className="hover:text-gray-200 transition-colors" aria-label="Insert image">
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image size={16} />
                </button>
                <button type="button" className="hover:text-gray-200 transition-colors" aria-label="Add attachment">
                  <Paperclip size={16} />
                </button>
                  {/* API Mode Toggle - Responsive */}
                <div className="flex items-center space-x-1 ml-2 border-l border-[#384364] pl-2">
                  <button 
                    type="button" 
                    onClick={() => setApiMode("freeform")}
                    className={`px-2 py-0.5 rounded text-xs flex items-center transition-all ${
                      apiMode === "freeform" 
                        ? "bg-blue-600 text-white" 
                        : "bg-transparent text-gray-400 hover:text-gray-200"
                    }`}
                    aria-label="Free form mode"
                    title="Free form conversation mode"
                  >
                    <MessageCircle size={12} className="mr-1" />
                    <span className="hidden sm:inline lg:hidden">Free</span>
                    <span className="hidden lg:inline">Free form</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setApiMode("advanced")}
                    className={`px-2 py-0.5 rounded text-xs flex items-center transition-all ${
                      apiMode === "advanced" 
                        ? "bg-indigo-600 text-white" 
                        : "bg-transparent text-gray-400 hover:text-gray-200"
                    }`}
                    aria-label="Advanced AI mode"
                    title="Advanced AI pipeline with specialized diagram generation"
                  >
                    <Zap size={12} className="mr-1" />
                    <span className="hidden sm:inline lg:hidden">Adv</span>
                    <span className="hidden lg:inline">Advanced</span>
                  </button>
                </div>
              </div>
              
              {/* Right side - send button */}
              <button 
                type="submit" 
                className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-700 transition-colors"
                aria-label="Send message"
              >
                <Send size={16} className="text-white" />
              </button>
            </div>
          </div>
          
          {/* Command suggestions popup */}
          {showCommands && filteredCommands.length > 0 && (
            <div
              ref={commandsRef}
              className="absolute bottom-full left-0 w-full bg-[#1A203A] border border-[#384364] rounded-md shadow-lg z-10 mb-1"
            >
              <ul className="py-1">
                {filteredCommands.map((cmd, index) => (
                  <li
                    key={cmd}
                    className={`px-4 py-1.5 cursor-pointer text-sm ${
                      index === selectedCommandIndex ? "bg-blue-900/50" : "hover:bg-slate-700"
                    }`}
                    onClick={() => insertCommand(cmd)}
                  >
                    <Badge variant="secondary" className="bg-blue-700/30 text-blue-300">
                      {cmd}
                    </Badge>
                    <span className="ml-2 text-xs text-gray-300">
                      {cmd === "@clear" ? "Clear chat history" : "Reset diagram"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}