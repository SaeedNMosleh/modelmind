"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ResponseType } from "@/lib/ai-pipeline/responseFormatter"

interface ChatInterfaceProps {
  onScriptGenerated: (script: string) => void
  currentScript: string
}

export function ChatInterface({ onScriptGenerated, currentScript }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<{ id: string; role: string; content: string }[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [rows, setRows] = useState(3)
  const [showCommands, setShowCommands] = useState(false)
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)

  const lineHeight = 24 // adjust as needed
  const minRows = 3 // minimum number of rows
  const maxRows = 10 // maximum number of rows

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const commandsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages]) 

  const commandHandlers = useMemo(() => ({
    "@clear": () => {
      setMessages([])
      setInput("")
      return true
    },
    "@reset": () => {
      onScriptGenerated("")
      setInput("")
      return true
    },
  }), [setMessages, setInput, onScriptGenerated]);

  const commandList = useMemo(() => Object.keys(commandHandlers), [commandHandlers]);

  // Check if input is a command and handle it
  const handleCommand = useCallback((userMessage: string) => {
    for (const cmd of commandList) {
      if (userMessage.trim() === cmd) {
        return commandHandlers[cmd]();
      }
    }
    return false;
  }, [commandList, commandHandlers]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const userMessage = input.trim()
      
      if (!userMessage) return
      
      // Check if this is a command before proceeding
      if (handleCommand(userMessage)) {
        return;
      }
      
      // Add user message to UI
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: Date.now().toString(), role: "user", content: userMessage },
      ])
      
      // Clear input and hide commands
      setInput("")
      setShowCommands(false)
      setIsLoading(true)
      
      try {
        // Send request to pipeline API
        const response = await fetch("/api/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              ...messages,
              { role: "user", content: userMessage }
            ],
            currentScript
          })
        })
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        
        const data = await response.json()
        
        // Process the response based on type
        if (data.type === ResponseType.SCRIPT) {
          // Update diagram in the editor
          onScriptGenerated(data.content)
          
          // Add explanation to chat
          setMessages((prevMessages) => [
            ...prevMessages,
            { 
              id: Date.now().toString(), 
              role: "assistant", 
              content: data.explanation || "I've updated the diagram." 
            },
          ])
        } else if (data.type === ResponseType.MESSAGE) {
          // Add message to chat
          setMessages((prevMessages) => [
            ...prevMessages,
            { 
              id: Date.now().toString(), 
              role: "assistant", 
              content: data.content 
            },
          ])
        } else if (data.type === ResponseType.ERROR) {
          // Handle error
          setMessages((prevMessages) => [
            ...prevMessages,
            { 
              id: Date.now().toString(), 
              role: "assistant", 
              content: `Error: ${data.content}` 
            },
          ])
        }
      } catch (error) {
        console.error("Failed to send message:", error)
        setMessages((prevMessages) => [
          ...prevMessages,
          { 
            id: Date.now().toString(), 
            role: "assistant", 
            content: "Sorry, I encountered an error processing your request." 
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [input, messages, currentScript, handleCommand, onScriptGenerated]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const value = e.target.value
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = value.slice(0, cursorPos)
    const currentWord = textBeforeCursor.split(/\s+/).pop() || ""
    setShowCommands(currentWord.startsWith("@"))
    setSelectedCommandIndex(0)

    // Reset the height to auto and set a specific width to get the correct scrollHeight
    e.target.style.height = "auto"
    e.target.style.width = `${e.target.offsetWidth}px` // Set a specific width

    // Calculate the new number of rows
    const newRows = Math.min(Math.max(Math.ceil((e.target.scrollHeight - 10) / lineHeight), minRows), maxRows)

    // Set the new height
    e.target.style.height = `${newRows * lineHeight}px`

    setRows(newRows)

    // Sync overlay scroll position with textarea
    const overlayDiv = e.target.previousSibling as HTMLDivElement
    if (overlayDiv) {
      overlayDiv.scrollTop = e.target.scrollTop
    }
  }

  const handleTextareaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const overlayDiv = e.currentTarget.previousSibling as HTMLDivElement
    if (overlayDiv) {
      overlayDiv.scrollTop = e.currentTarget.scrollTop
    }
  }

  const filteredCommands = input ? commandList.filter((cmd) => cmd.startsWith(input.split(/\s+/).pop() || "")) : []

  const insertCommand = (cmd: string) => {
    if (textareaRef.current) {
      const cursorPosition = textareaRef.current.selectionStart
      const textBeforeCursor = input.slice(0, cursorPosition)
      const textAfterCursor = input.slice(cursorPosition)
      const lastSpaceIndex = textBeforeCursor.lastIndexOf(" ")
      const newValue = textBeforeCursor.slice(0, lastSpaceIndex + 1) + cmd + " " + textAfterCursor
      setInput(newValue)
      setShowCommands(false)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          const newPos = lastSpaceIndex + 1 + cmd.length + 1
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newPos
        }
      }, 0)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
      } else if (e.key === "Escape") {
        setShowCommands(false)
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
    }
  }

  const highlightText = (text: string) => {
    return text.split(/(@\w+)/).map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <span key={index} className="bg-blue-100 text-blue-800 rounded py-0.5">
            {part}
          </span>
        )
      } else {
        return <span key={index} className="text-white">{part}</span>
      }
    })
  }

  // Shared styles so both the overlay and textarea align
  const sharedStyle: React.CSSProperties = {
    fontSize: "1rem",
    lineHeight: "1.5", // Matches lineHeight of 24px (1.5 * 16px base)
    padding: "8px", // Explicit pixels for consistency (0.5rem = 8px typically)
    fontFamily: "inherit", // Ensures same font as textarea
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    wordBreak: "break-word",
    boxSizing: "border-box", // Ensures padding doesn't offset alignment
    transition: "all 0.2s ease-in-out",
  }

  return (
    <Card className="flex flex-col h-full bg-slate-600">
      <CardContent className="flex-1 p-4">
        <ScrollArea ref={scrollAreaRef} className="h-[500px] pr-4 pl-4 overflow-y-auto bg-slate-900 rounded-lg">
          {messages.map((message) => (
            <div key={message.id} className={`mb-4 ${message.role === "user" ? "text-rose-400" : "text-green-600"}`}>
              <p className="whitespace-pre-wrap">
                {message.content.split(/(@\w+)/).map((part, index) =>
                  part.startsWith("@") ? (
                    <Badge key={index} variant="secondary" className="mr-1 bg-blue-100 text-blue-800">
                      {part}
                    </Badge>
                  ) : (
                    part
                  ),
                )}
              </p>
            </div>
          ))}
          {isLoading && (
            <div className="text-green-600 animate-pulse">
              <p>Thinking...</p>
            </div>
          )}
        </ScrollArea>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
          <div className="relative">
            {/* Overlay that displays highlighted commands */}
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden bg-slate-900 z-0 "
              style={{
                ...sharedStyle,
                height: `${Math.min(rows, maxRows) * lineHeight}px`,
                overflowY: rows > maxRows ? "scroll" : "hidden",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {highlightText(input)}
            </div>
            {/* The real Textarea which remains fully functional */}
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onScroll={handleTextareaScroll}
              placeholder="Ask about PlantUML diagrams..."
              className="relative caret-white bg-transparent resize-none pr-10 transition-all duration-200 ease-in-out z-1"
              style={{
                ...sharedStyle,
                minHeight: `${minRows * lineHeight}px`,
                maxHeight: `${maxRows * lineHeight}px`,
                height: `${Math.min(rows, maxRows) * lineHeight}px`,
                overflowY: rows > maxRows ? "scroll" : "hidden", 
                caretColor: "white", 
                color: "transparent", 
                position: "relative", 
              }}
              disabled={isLoading}
            />
            {showCommands && filteredCommands.length > 0 && (
              <div
                ref={commandsRef}
                className="absolute bottom-full left-0 w-full bg-white border border-gray-200 rounded-md shadow-lg z-10"
              >
                <ul className="py-1">
                  {filteredCommands.map((cmd, index) => (
                    <li
                      key={cmd}
                      className={`px-4 py-2 cursor-pointer ${
                        index === selectedCommandIndex ? "bg-blue-100" : "hover:bg-gray-100"
                      }`}
                      onClick={() => insertCommand(cmd)}
                    >
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {cmd}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <Button type="submit" className="self-end" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}