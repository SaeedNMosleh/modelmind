This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

## Additional Info

# Directory Structure
```
.gitignore
app/api/chat/route.ts
app/api/chatopenai/route.ts
app/globals.css
app/layout.tsx
app/page.tsx
components.json
components/chat-interface/chat-interface.tsx
components/code-editor/code-editor.tsx
components/preview/preview.tsx
components/ui/accordion.tsx
components/ui/badge.tsx
components/ui/button.tsx
components/ui/card.tsx
components/ui/collapsible-panel.tsx
components/ui/input.tsx
components/ui/popover.tsx
components/ui/scroll-area.tsx
components/ui/tabs.tsx
components/ui/textarea.tsx
eslint.config.mjs
lib/ai-pipeline/baseChain.ts
lib/ai-pipeline/contextManager.ts
lib/ai-pipeline/inputProcessor.ts
lib/ai-pipeline/taskRouter.ts
lib/utils.ts
lib/utils/openAIStreaming.ts
lib/utils/plantuml.ts
LICENSE.md
next.config.ts
package.json
postcss.config.mjs
public/file.svg
public/globe.svg
public/next.svg
public/vercel.svg
public/window.svg
README.md
tailwind.config.ts
tsconfig.json
vscode-style-terminal-tabs-plantuml.svg
```

# Files

## File: components/ui/collapsible-panel.tsx
````typescript
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
````

## File: components/ui/tabs.tsx
````typescript
"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-slate-800 p-1 text-slate-400",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-blue-700 data-[state=active]:text-white data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
````

## File: .gitignore
````
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
````

## File: app/api/chat/route.ts
````typescript
import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file using

export async function POST(req: Request) {
  const { messages, currentScript } = await req.json()

  const lastMessage = messages[messages.length - 1]
  const response = streamText({
    model: openai("gpt-4-turbo"),
    messages: [
      {
        role: "system",
        content: `You are a PlantUML expert assistant. 
        When providing PlantUML scripts, return a JSON object with the following structure:
        {
          "type": "script",
          "content": "your PlantUML script here"
        }
        
        When providing explanations or discussions, return a JSON object with:
        {
          "type": "message",
          "content": "your explanation here"
        }
        
        Current script in editor: ${currentScript}`,
      },
      ...messages.slice(0, -1),
      {
        role: lastMessage.role,
        content: `${lastMessage.content}\n\nRespond in the specified JSON format.`,
      },
    ],
  })

  return response.toDataStreamResponse()
}
````

## File: app/api/chatopenai/route.ts
````typescript
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import dotenv from "dotenv";

dotenv.config(); 

const openai = new OpenAI();

const openAIModels = [
    "gpt-4o-2024-08-06",
    "gpt-4o-mini-2024-07-18",
    "o3-mini-2025-01-31"];

const ResponseObjectSchema = z.object({
  type: z.string(),
  content: z.string(),
});

const ResponseSchema = z.object({
  mandatory: ResponseObjectSchema,
  optional: ResponseObjectSchema.optional(),
});

export async function POST(req: Request) {
  const { messages, currentScript } = await req.json();

  const lastMessage = messages[messages.length - 1];
  

  const completion = await openai.beta.chat.completions.parse({
    model : openAIModels[0],
    messages: [
      {
        role: "system",
        content: `You are an assistant integrated into an app for creating and modifying PlantUML diagrams based on user input. Your response must follow these guidelines:

1. **Explanation Response (Always Required):**  
   Always provide an explanation, acknowledgment, or clarification of the user’s input in the "message" object.  
   This should be informative and help the user understand the state or action related to their request.  
   The response should always be structured as:
   {
     "type": "message",
     "content": "explanation here"
   }

2. **Diagram Response (Optional and Conditional):**  
   Only provide the \`script\` object when:
   - The user explicitly asks to **modify** the diagram (e.g., "Add an attribute to this class").
   - The user **requests a completely new diagram**.
   
   **Do not provide the \`script\` object** in the following cases:
   - The user asks for information about the diagram (e.g., "How many attributes does this class have?").
   - The user asks for analysis of the diagram or a property of the diagram (e.g., "What relationships exist in this diagram?").
   - If no change is needed or requested, simply provide the explanation without returning the same diagram.
   
   If the \`script\` object is provided, structure it as follows:
   {
     "type": "script",
     "content": "PlantUML script here"
   }

3. **Context Awareness:**  
   Always consider the current content of the diagram in the editor (provided with the user input) and the user’s request when crafting your response. Ignore the current diagram if the user requests a completely new diagram. If no modifications are necessary or no new diagram is requested, do not return a new diagram.

4. **Ambiguity Handling:**  
   If the user’s request is unclear, ask clarifying questions in the "message" object. If no modification or creation of a diagram is necessary, do not include the \`script\` object.`,
      },
      //...messages.slice(0, -1), //Keep all messages except the last one as history
      {
        role: lastMessage.role,
        content: `${lastMessage.content}\n\nCurrent script in editor: ${currentScript}`,
      },
    ],
    response_format: zodResponseFormat(ResponseSchema, "response"),
  });

  const parsedResponse = completion.choices[0].message.parsed;
  return new Response(JSON.stringify(parsedResponse), {
    headers: { "Content-Type": "application/json" },
  });
}
````

## File: components.json
````json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
````

## File: components/chat-interface/chat-interface.tsx
````typescript
"use client"

// Imports are kept as they are since they're needed
import { useChat } from "ai/react"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useCallback, useState, useEffect, useRef, useMemo } from "react"
import { useIsomorphicLayoutEffect } from 'react-use'
import { User, Bot, Send } from 'lucide-react'

interface ChatInterfaceProps {
  onScriptGenerated: (script: string) => void
  currentScript: string
}

interface ChatMessage {
  id: string
  role: string
  content: string
}

export function ChatInterface({ onScriptGenerated, currentScript }: ChatInterfaceProps) {
  // Initialize the chat hook
  const { input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chatopenai",
    body: {
      currentScript,
    },
    onResponse: async (response) => {
      try {
        const text = await response.text()
        const { mandatory, optional } = JSON.parse(text)

        if (mandatory.type === "message") {
          setMessages((prevMessages) => [
            ...prevMessages,
            { id: Date.now().toString(), role: "assistant", content: mandatory.content },
          ])
        }

        if (optional && optional.type === "script" && optional.content !== "") {
          onScriptGenerated(optional.content)
        }

        return mandatory.content
      } catch (error) {
        console.error("Failed to parse response:", error)
        return response.statusText
      }
    },
  })

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [textareaHeight, setTextareaHeight] = useState<number>(72) // Reduced default height
  const [showCommands, setShowCommands] = useState(false)
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)

  const messageContainerRef = useRef<HTMLDivElement>(null)
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

  // Auto-scroll when new messages are added - improved implementation
  useEffect(() => {
    if (messageContainerRef.current) {
      const container = messageContainerRef.current;
      // Smooth scroll to bottom
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

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
          handleSubmit(e)
        }
      }
      setShowCommands(false)
    },
    [input, handleSubmit, commandList, commands, setMessages],
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
  useIsomorphicLayoutEffect(() => {
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
    <div className="flex flex-col h-full">
      <ScrollArea 
        ref={messageContainerRef} 
        className="flex-1 pr-2 pl-2 py-4 overflow-y-auto"
      >
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`${message.role === "user" ? "message-user" : "message-assistant"} mb-2 p-2`} // Reduced margins and padding
          >
            <div className="flex items-center mb-1"> {/* Reduced margin */}
              <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                message.role === "user" ? "bg-[#2E3B5E]" : "bg-[#2A3046]"
              }`}>
                {message.role === "user" ? (
                  <User size={12} className="text-[#96ADFF]" /> // Smaller icon
                ) : (
                  <Bot size={12} className="text-[#79DBC7]" /> // Smaller icon
                )}
              </div>
              <div className="ml-1 text-xs font-semibold"> {/* Smaller text and margin */}
                {message.role === "user" ? (
                  <span className="text-[#96ADFF]">You</span>
                ) : (
                  <span className="text-[#79DBC7]">Assistant</span>
                )}
              </div>
            </div>
            <p className={`whitespace-pre-wrap text-sm leading-tight ml-7 ${
              message.role === "user" ? "text-[#E8EAFF]" : "text-[#DFFFF6]"
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
        ))}
      </ScrollArea>
      
      <form onSubmit={onSubmit} className="mt-2 mb-2 px-2">
        <div className="chat-input-wrapper relative">
          <div className="chat-input-container rounded-md">
            {/* Overlay that displays highlighted commands */}
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden z-0 rounded-md px-3 py-2"
              style={{
                ...sharedStyle,
                height: `${textareaHeight}px`,
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
              className="relative caret-white bg-transparent resize-none pr-10 border-none transition-all duration-200 ease-in-out z-1"
              style={{
                ...sharedStyle,
                minHeight: `${MIN_TEXTAREA_HEIGHT}px`,
                maxHeight: `${MAX_TEXTAREA_HEIGHT}px`,
                height: `${textareaHeight}px`,
                overflowY: textareaHeight >= MAX_TEXTAREA_HEIGHT ? "scroll" : "hidden", 
                caretColor: "white", 
                color: "transparent", 
              }}
            />
            
            {/* Send button positioned properly within the input container */}
            <button 
              type="submit" 
              className="absolute right-2 bottom-2 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center"
              aria-label="Send message"
            >
              <Send size={16} className="text-white" />
            </button>
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
                    }`} // Smaller text and reduced padding
                    onClick={() => insertCommand(cmd)}
                  >
                    <Badge variant="secondary" className="bg-blue-700/30 text-blue-300">
                      {cmd}
                    </Badge>
                    <span className="ml-2 text-xs text-gray-300"> {/* Smaller text */}
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
````

## File: components/code-editor/code-editor.tsx
````typescript
"use client"

import { useEffect, useRef } from "react"
import { Editor, useMonaco } from "@monaco-editor/react"
import { Card, CardContent } from "@/components/ui/card"
import { isValidPlantUML } from "@/lib/utils/plantuml"
import type { editor } from 'monaco-editor'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
}

export function CodeEditor({ value, onChange }: CodeEditorProps) {
  const monaco = useMonaco()
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  
  // Initialize Monaco with PlantUML syntax highlighting using VS Code-like colors
  useEffect(() => {
    if (monaco) {
      // Register PlantUML language if it doesn't exist
      if (!monaco.languages.getLanguages().some(lang => lang.id === 'plantuml')) {
        monaco.languages.register({ id: 'plantuml' })
        
        // Define VS Code-like syntax highlighting rules for PlantUML
        monaco.languages.setMonarchTokensProvider('plantuml', {
          defaultToken: 'invalid',
          tokenizer: {
            root: [
              // Keywords - improved regex pattern
              [/@(start|end)(uml|mindmap|wbs|salt|sequence|activity|class|object|component)/, 'keyword'],
              
              // Other PlantUML keywords - expanded list with VS Code style patterns
              [/\b(actor|participant|database|boundary|control|entity|collections|queue|usecase|class|interface|enum|annotation|abstract|package|namespace|state|object|artifact|folder|rectangle|card|cloud|file|node|frame|storage|agent|stack|together|as|left|right|of|on|link|note|ref|autonumber|title|end title|end note|legend|end legend|skinparam|scale|top|bottom|across|ref|over|activate|deactivate|destroy|create|alt|else|opt|loop|par|break|critical|group)\b/, 'keyword'],
              
              // Preprocessor directives
              [/!include|!pragma|!define/, 'preprocessor'],
              
              // Comments
              [/'.*$/, 'comment'],
              [/\/\/.*$/, 'comment'],
              [/\/\*/, { token: 'comment.block', next: '@comment' }],
              
              // Strings
              [/"([^"\\]|\\.)*$/, 'string.invalid'],
              [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
              
              // Numbers
              [/\d+/, 'number'],
              
              // Arrows with better pattern matching
              [/-+(>|>>|\/|\\\\|\\|\|)?-*/, 'operator'],
              [/<-+(>|\/|\\\\|\\|\|)?-*/, 'operator'],
              [/<->|<-->>?/, 'operator'],
              
              // Tags/Color Codes
              [/<[^>]+>/, 'tag'],
              [/#[0-9a-fA-F]{6}/, 'constant'],
              
              // Symbols
              [/[\[\]{}():]/, 'delimiter'],
            ],
            
            comment: [
              [/[^\/*]+/, 'comment'],
              [/\/\*/, 'comment', '@push'],
              [/\*\//, 'comment', '@pop'],
              [/[\/*]/, 'comment']
            ],
            
            string: [
              [/[^\\"]+/, 'string'],
              [/\\./, 'string.escape'],
              [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
            ]
          }
        });
        
        // Set editor theme to match VS Code dark theme
        monaco.editor.defineTheme('vscodeTheme', {
          base: 'vs-dark',
          inherit: true,
          rules: [
            // VS Code-like syntax highlighting colors
            { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },    // blue
            { token: 'comment', foreground: '6A9955' },                       // green
            { token: 'string', foreground: 'CE9178' },                        // orange/brown
            { token: 'tag', foreground: '4EC9B0' },                           // teal
            { token: 'operator', foreground: 'D4D4D4' },                      // light gray
            { token: 'constant', foreground: '4FC1FF' },                      // light blue
            { token: 'number', foreground: 'B5CEA8' },                        // light green
            { token: 'preprocessor', foreground: 'C586C0' },                  // purple
            { token: 'delimiter', foreground: 'D4D4D4' },                     // light gray
            { token: 'comment.block', foreground: '6A9955' },                 // green
            { token: 'string.escape', foreground: 'D7BA7D' },                 // gold
            { token: 'string.invalid', foreground: 'F14C4C' },                // red
          ],
          colors: {
            // VS Code dark theme colors
            'editor.background': '#1E1E1E',                                   // dark gray
            'editor.foreground': '#D4D4D4',                                   // light gray
            'editorLineNumber.foreground': '#858585',                         // medium gray
            'editorLineNumber.activeForeground': '#C6C6C6',                   // lighter gray
            'editor.selectionBackground': '#264F78',                          // blue
            'editor.inactiveSelectionBackground': '#3A3D41',                  // gray
            'editor.lineHighlightBackground': '#2D2D30',                      // slightly lighter than background
            'editor.lineHighlightBorder': '#282828',                          // border for current line
            'editorCursor.foreground': '#AEAFAD',                             // cursor color
            'editorWhitespace.foreground': '#3B3B3B',                         // whitespace symbols
            'editor.findMatchBackground': '#515C6A',                          // search match
            'editor.findMatchHighlightBackground': '#42403B',                 // other matches
          }
        });
      }
    }
  }, [monaco]);

  // Handle editor mounting with proper type
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    // Set editor options
    editor.updateOptions({
      padding: {
        top: 16,
        bottom: 16
      },
      // Add VS Code-like font ligatures for coding fonts
      fontLigatures: true
    });
    
    // Add keyboard shortcut for diagram refresh (Ctrl+Enter)
    editor.addCommand(monaco?.KeyMod.CtrlCmd | monaco?.KeyCode.Enter, () => {
      // Trigger a change event to update the preview
      onChange(editor.getValue());
    });
  };
  
  // Validate PlantUML on change
  const handleEditorChange = (value: string | undefined) => {
    const newValue = value || "";
    onChange(newValue);
    
    // Check if valid PlantUML
    const isValid = isValidPlantUML(newValue);
    
    // Set validation decorations if needed
    if (editorRef.current && !isValid && newValue.length > 0 && monaco) {
      // Add a subtle indicator if missing tags
      if (!newValue.includes('@startuml')) {
        // Create a proper Range instance
        const range = new monaco.Range(1, 1, 1, 1);
        
        editorRef.current.deltaDecorations([], [{
          range: range,
          options: {
            isWholeLine: true,
            className: 'errorDecoration',
            glyphMarginClassName: 'errorGlyphMargin',
            hoverMessage: { value: 'Missing @startuml tag' }
          }
        }]);
      }
    }
  };

  return (
    <Card className="flex flex-col h-full bg-[#1E1E1E] border-[#2D3656]">
      <CardContent className="p-0 flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="plantuml"
          language="plantuml"
          value={value}
          onChange={handleEditorChange}
          theme="vscodeTheme"
          options={{
            fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
            fontSize: 14,
            lineNumbers: "on",
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
            automaticLayout: true,
            folding: true,
            matchBrackets: "always",
            renderLineHighlight: "all",
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            scrollbar: {
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
              verticalSliderSize: 10,
              horizontalSliderSize: 10,
              alwaysConsumeMouseWheel: false,
            }
          }}
          onMount={handleEditorDidMount}
        />
      </CardContent>
    </Card>
  )
}
````

## File: components/preview/preview.tsx
````typescript
"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { getPlantUMLPreviewURL } from "@/lib/utils/plantuml"
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch"
import { FileDown, ZoomIn, ZoomOut, RotateCcw, Copy, Check } from "lucide-react"
import { saveAs } from "file-saver"

interface PreviewProps {
  content: string
  expandedView?: boolean
}

export function Preview({ content, expandedView = false }: PreviewProps) {
  const [format, setFormat] = useState<"svg" | "png">("png")
  const [copySuccess, setCopySuccess] = useState<boolean>(false)
  const [scale, setScale] = useState<number>(1)
  const containerRef = useRef<HTMLDivElement>(null)
  const transformComponentRef = useRef(null)
  
  const previewUrl = getPlantUMLPreviewURL(content, format)
  
  // Handle expanded view mode by recalculating container dimensions
  useEffect(() => {
    if (containerRef.current) {
      // Use a conservative scale for both views
      const fitScale = expandedView ? 0.9 : 0.8
      setScale(fitScale)
    }
  }, [expandedView])
  
  const handleDownload = useCallback(() => {
    // Create a filename based on the current date/time or use a default name
    const filename = `diagram-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.${format}`
    
    // Use file-saver to download the image
    if (previewUrl) {
      fetch(previewUrl)
        .then(response => response.blob())
        .then(blob => {
          saveAs(blob, filename)
        })
        .catch(error => {
          console.error("Error downloading the diagram:", error)
        })
    }
  }, [previewUrl, format])

  const handleCopy = useCallback(async () => {
    if (previewUrl) {
      try {
        const response = await fetch(previewUrl)
        const blob = await response.blob()
        
        // Create a ClipboardItem and copy it
        if (navigator.clipboard && navigator.clipboard.write) {
          const item = new ClipboardItem({ [blob.type]: blob })
          await navigator.clipboard.write([item])
          
          // Show success indicator briefly
          setCopySuccess(true)
          setTimeout(() => setCopySuccess(false), 2000)
        } else {
          console.error("Clipboard API not supported in this browser")
        }
      } catch (error) {
        console.error("Error copying the diagram:", error)
      }
    }
  }, [previewUrl])

  // Custom reset transform handler that respects the current view mode
  const handleResetTransform = useCallback((resetTransform) => {
    return () => {
      // Reset to a conservative scale that works for both views
      resetTransform(expandedView ? 0.9 : 0.8);
    };
  }, [expandedView]);

  return (
    <div className="flex flex-col h-full">
      {/* Controls Header */}
      <div className="p-3 flex items-center justify-between mb-2 bg-[#252C40] border-b border-[#2D3656]">
        {/* Format Toggle */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-300">Format:</span>
          <div className="flex rounded-md overflow-hidden border border-[#384364]">
            <button
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                format === "svg" 
                  ? "bg-[#6F87FF] text-white" 
                  : "bg-[#1C2032] text-gray-400 hover:bg-[#2D3656]"
              }`}
              onClick={() => setFormat("svg")}
            >
              SVG
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                format === "png" 
                  ? "bg-[#6F87FF] text-white" 
                  : "bg-[#1C2032] text-gray-400 hover:bg-[#2D3656]"
              }`}
              onClick={() => setFormat("png")}
            >
              PNG
            </button>
          </div>
        </div>
        
        {/* Download Button */}
        <button 
          onClick={handleDownload}
          className="flex items-center justify-center px-3 py-1.5 rounded-md bg-[#384364] border border-[#495685] text-gray-200 hover:bg-[#2D3656] transition-colors"
          disabled={!previewUrl}
        >
          <FileDown className="h-4 w-4 mr-1" />
          Download
        </button>
      </div>

      {/* Diagram Preview Container - This is the main container */}
      <div 
        ref={containerRef}
        className="flex-1 relative bg-[#1A203A] rounded-md overflow-hidden border border-[#2D3656] mx-3 mb-3"
        style={{ 
          // Ensure the container takes up all available space
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%'
        }}
      >
        {/* Transform Wrapper - The zoom/pan functionality */}
        <div className="flex-1 w-full h-full">
          <TransformWrapper
          initialScale={scale}
          minScale={0.2}
          maxScale={5}
          limitToBounds={false}
          centerOnInit={true}
          doubleClick={{ disabled: true }}
          wheel={{ step: 0.1 }}
          ref={transformComponentRef}
          panning={{ velocityDisabled: true }}
          alignmentAnimation={{ disabled: true }}
          // The wrapper takes up the full container already with the CSS class
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Zoom Controls */}
              <div className="absolute top-2 right-2 flex flex-col space-y-1 z-10">
                <button 
                  onClick={() => zoomIn()}
                  className="w-8 h-8 rounded-md bg-[#252C40]/80 border border-[#384364] text-gray-300 hover:bg-[#2D3656] transition-colors"
                >
                  <ZoomIn className="h-4 w-4 mx-auto" />
                </button>
                <button 
                  onClick={() => zoomOut()}
                  className="w-8 h-8 rounded-md bg-[#252C40]/80 border border-[#384364] text-gray-300 hover:bg-[#2D3656] transition-colors"
                >
                  <ZoomOut className="h-4 w-4 mx-auto" />
                </button>
                <button 
                  onClick={handleResetTransform(resetTransform)}
                  className="w-8 h-8 rounded-md bg-[#252C40]/80 border border-[#384364] text-gray-300 hover:bg-[#2D3656] transition-colors"
                >
                  <RotateCcw className="h-4 w-4 mx-auto" />
                </button>
              </div>
              
              {/* Transform Component - This renders the transformed content */}
              <TransformComponent
                // Use the full space available
                wrapperStyle={{ 
                  width: '100%', 
                  height: '100%'
                }}
                contentStyle={{
                  display: 'flex',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%'
                }}
              >
                {/* Background with checkerboard pattern - This creates the interactive area */}
                <div 
                  className="bg-checker flex items-center justify-center"
                  style={{
                    // Make the background large enough for panning, but not excessively large
                    width: '100%',
                    height: '100%',
                    background: 'repeating-conic-gradient(#1C2240 0% 25%, #1F2546 0% 50%) 50% / 20px 20px',
                  }}
                >
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="PlantUML Diagram" 
                      className="rounded"
                      style={{
                        display: 'block',
                        // Set max dimensions to ensure the image is fully visible initially
                        maxWidth: '90%',
                        maxHeight: '90%',
                        width: 'auto',
                        height: 'auto'
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center text-gray-400 text-xl">
                      No diagram to preview
                    </div>
                  )}
                </div>
              </TransformComponent>
            </>
          )}
          </TransformWrapper>
        </div>
        
        {/* Pan/Copy Controls overlay at bottom */}
        {previewUrl && (
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-[#252C40]/70 backdrop-blur-sm">
            <div className="flex justify-between items-center px-3">
              <span className="text-xs text-gray-300">
                {expandedView ? 'Expanded view' : 'Drag to pan, scroll to zoom'}
              </span>
              <button
                onClick={handleCopy}
                className={`rounded-md px-3 py-1.5 text-sm font-medium flex items-center transition-colors ${
                  copySuccess 
                    ? "bg-green-600/80 text-white" 
                    : "bg-[#384364] text-gray-200 hover:bg-[#2D3656]"
                }`}
              >
                {copySuccess ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
````

## File: components/ui/accordion.tsx
````typescript
"use client"

import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b", className)}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline text-left [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
````

## File: components/ui/badge.tsx
````typescript
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
````

## File: components/ui/button.tsx
````typescript
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
````

## File: components/ui/card.tsx
````typescript
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
````

## File: components/ui/input.tsx
````typescript
import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
````

## File: components/ui/popover.tsx
````typescript
"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
````

## File: components/ui/scroll-area.tsx
````typescript
"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
````

## File: components/ui/textarea.tsx
````typescript
import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
````

## File: eslint.config.mjs
````
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
````

## File: lib/ai-pipeline/baseChain.ts
````typescript
import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

dotenv.config();

// Define the type for the model configuration
const model: ChatOpenAI = new ChatOpenAI({ model: "gpt-4o-2024-08-06" });

// Base system prompt that all chains will extend
const baseSystemPrompt: string = `You are an AI assistant specialized in PlantUML diagrams.`;

// Create base templates for different operations
const baseGenerateTemplate: PromptTemplate = PromptTemplate.fromTemplate(`
    ${baseSystemPrompt}
    Generate a PlantUML diagram based on the following requirements:
    {requirements}
    `);

const baseModifyTemplate: PromptTemplate = PromptTemplate.fromTemplate(`
    ${baseSystemPrompt}
    Modify the following PlantUML diagram according to these instructions:
    Current diagram:
    {currentDiagram}
    
    Modification instructions:
    {instructions}
    `);

const baseAnalyzeTemplate: PromptTemplate = PromptTemplate.fromTemplate(`
    ${baseSystemPrompt}
    Analyze the following PlantUML diagram:
    {diagram}
    
    Focus on:
    {analysisType}
    `);

// Define the type for the function parameter and return value
const createBaseChain = (promptTemplate: PromptTemplate): RunnableSequence => {
    return RunnableSequence.from([
        promptTemplate,
        model,
        new StringOutputParser(),
    ]);
};

export {
    model,
    baseSystemPrompt,
    baseGenerateTemplate,
    baseModifyTemplate,
    baseAnalyzeTemplate,
    createBaseChain,
};
````

## File: lib/ai-pipeline/contextManager.ts
````typescript
import { BufferMemory } from "langchain/memory";
import { DiagramIntent } from "./inputProcessor";
import winston from "winston";

// Setup logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

/**
 * Interface defining a message in the conversation history
 */
export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

/**
 * Interface defining the diagram metadata
 */
export interface DiagramMetadata {
  id?: string;
  type?: string;
  lastModified: Date;
  createdAt: Date;
  version: number;
  history: string[];
}

/**
 * Class for managing context in the AI pipeline
 * Maintains diagram state, conversation history, and session metadata
 */
export class ContextManager {
  private currentDiagram: string;
  private diagramMetadata: DiagramMetadata;
  private memory: BufferMemory;
  private sessionId: string;
  private messages: Message[];
  private lastIntent: DiagramIntent;

  /**
   * Constructor for the ContextManager
   * @param sessionId - Unique identifier for the current session
   * @param initialDiagram - Initial diagram code (if any)
   */
  constructor(sessionId: string = "", initialDiagram: string = "") {
    this.sessionId = sessionId || `session_${Date.now()}`;
    this.currentDiagram = initialDiagram;
    this.messages = [];
    this.lastIntent = DiagramIntent.UNKNOWN;
    
    // Initialize LangChain memory
    this.memory = new BufferMemory({
      returnMessages: true,
      memoryKey: "conversation_history"
    });
    
    // Initialize diagram metadata
    const now = new Date();
    this.diagramMetadata = {
      lastModified: now,
      createdAt: now,
      version: 1,
      history: initialDiagram ? [initialDiagram] : []
    };
    
    logger.info("Context manager initialized", { sessionId: this.sessionId });
  }

  /**
   * Updates the current diagram and its metadata
   * @param newDiagram - The new diagram code
   * @param intent - The intent that caused this update
   */
  public updateDiagram(newDiagram: string, intent: DiagramIntent = DiagramIntent.MODIFY): void {
    // Don't update if diagram hasn't changed
    if (this.currentDiagram === newDiagram) {
      return;
    }
    
    this.currentDiagram = newDiagram;
    
    // Update metadata
    this.diagramMetadata.lastModified = new Date();
    this.diagramMetadata.version += 1;
    this.diagramMetadata.history.push(newDiagram);
    
    // Limit history size
    if (this.diagramMetadata.history.length > 10) {
      this.diagramMetadata.history = this.diagramMetadata.history.slice(-10);
    }
    
    // If this is a new generation, reset creation time
    if (intent === DiagramIntent.GENERATE) {
      this.diagramMetadata.createdAt = new Date();
      this.diagramMetadata.version = 1;
    }
    
    logger.info("Diagram updated", { 
      version: this.diagramMetadata.version,
      intent: intent
    });
  }

  /**
   * Adds a message to the conversation history
   * @param role - Role of the message sender (user or assistant)
   * @param content - Content of the message
   */
  public async addMessage(role: "user" | "assistant", content: string): Promise<void> {
    const message: Message = {
      role,
      content,
      timestamp: new Date()
    };
    
    this.messages.push(message);
    
    // Add to LangChain memory
    if (role === "user") {
      await this.memory.saveContext({ input: content }, { output: "" });
    } else if (role === "assistant") {
      // Update the last output
      const memoryVariables = await this.memory.loadMemoryVariables({});
      const chatHistory = memoryVariables.conversation_history || [];
      
      if (chatHistory.length > 0) {
        await this.memory.saveContext(
          { input: chatHistory[chatHistory.length - 1].content }, 
          { output: content }
        );
      }
    }
    
    logger.info("Message added to context", { role });
  }

  /**
   * Sets the last detected intent
   * @param intent - The intent to set
   */
  public setLastIntent(intent: DiagramIntent): void {
    this.lastIntent = intent;
    logger.info("Intent updated", { intent });
  }

  /**
   * Gets the current diagram
   * @returns The current diagram code
   */
  public getCurrentDiagram(): string {
    return this.currentDiagram;
  }

  /**
   * Gets the diagram metadata
   * @returns The current diagram metadata
   */
  public getDiagramMetadata(): DiagramMetadata {
    return { ...this.diagramMetadata };
  }

  /**
   * Gets the conversation history
   * @param limit - Optional limit on the number of messages to return
   * @returns An array of messages
   */
  public getConversationHistory(limit?: number): Message[] {
    if (limit && limit > 0) {
      return [...this.messages].slice(-limit);
    }
    return [...this.messages];
  }

  /**
   * Gets the last detected intent
   * @returns The last intent
   */
  public getLastIntent(): DiagramIntent {
    return this.lastIntent;
  }

  /**
   * Gets the conversation history in a format suitable for LLM context
   * @param limit - Optional limit on the number of messages to return
   * @returns Formatted conversation history string
   */
  public async getFormattedConversationHistory(limit?: number): Promise<string> {
    const memoryVariables = await this.memory.loadMemoryVariables({});
    const history = memoryVariables.conversation_history || [];
    
    // Format the history
    return history
      .slice(limit ? -limit : 0)
      .map((msg: { type: string; content: string }) => `${msg.type}: ${msg.content}`)
      .join('\n');
  }

  /**
   * Gets the complete context for agent operations
   * @returns An object containing all relevant context for agents
   */
  public async getCompleteContext(): Promise<Record<string, unknown>> {
    return {
      currentDiagram: this.currentDiagram,
      diagramMetadata: this.diagramMetadata,
      lastIntent: this.lastIntent,
      sessionId: this.sessionId,
      conversationHistory: await this.getFormattedConversationHistory()
    };
  }

  /**
   * Gets context specifically tailored for diagram generation
   * @returns Context for the generator agent
   */
  public async getGeneratorContext(): Promise<Record<string, unknown>> {
    return {
      conversationHistory: await this.getFormattedConversationHistory(5),
      lastIntent: this.lastIntent,
      sessionId: this.sessionId
    };
  }

  /**
   * Gets context specifically tailored for diagram modification
   * @returns Context for the modifier agent
   */
  public async getModifierContext(): Promise<Record<string, unknown>> {
    return {
      currentDiagram: this.currentDiagram,
      diagramMetadata: {
        version: this.diagramMetadata.version,
        lastModified: this.diagramMetadata.lastModified
      },
      conversationHistory: await this.getFormattedConversationHistory(3),
      lastIntent: this.lastIntent
    };
  }

  /**
   * Gets context specifically tailored for diagram analysis
   * @returns Context for the analyzer agent
   */
  public async getAnalyzerContext(): Promise<Record<string, unknown>> {
    return {
      currentDiagram: this.currentDiagram,
      diagramMetadata: {
        version: this.diagramMetadata.version,
        type: this.diagramMetadata.type
      },
      lastIntent: this.lastIntent
    };
  }

  /**
   * Resets the current diagram state
   */
  public resetDiagram(): void {
    this.currentDiagram = "";
    const now = new Date();
    this.diagramMetadata = {
      lastModified: now,
      createdAt: now,
      version: 0,
      history: []
    };
    logger.info("Diagram state reset");
  }

  /**
   * Clears the conversation history
   */
  public async clearConversation(): Promise<void> {
    this.messages = [];
    this.memory = new BufferMemory({
      returnMessages: true,
      memoryKey: "conversation_history"
    });
    logger.info("Conversation history cleared");
  }
}

// Export an instance for singleton usage across the application
export const contextManager = new ContextManager();
````

## File: lib/ai-pipeline/inputProcessor.ts
````typescript
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { model, baseSystemPrompt } from "./baseChain";
import winston from "winston";

// Setup logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

/**
 * Enum defining the possible user intents for diagram operations
 */
export enum DiagramIntent {
  GENERATE = "GENERATE", // User wants to create a new diagram
  MODIFY = "MODIFY",     // User wants to change an existing diagram
  ANALYZE = "ANALYZE",   // User wants to analyze or get information about a diagram
  UNKNOWN = "UNKNOWN"    // Intent couldn't be determined
}

/**
 * Schema for validating input parameters
 */
const inputParamsSchema = z.object({
  userInput: z.string().min(1, "User input is required"),
  currentDiagram: z.string().optional(),
  conversation: z.array(z.string()).optional()
});

/**
 * Type definition for input parameters
 */
export type InputProcessorParams = z.infer<typeof inputParamsSchema>;

/**
 * Schema defining the structure of the intent classification output
 */
const intentOutputSchema = z.object({
  intent: z.nativeEnum(DiagramIntent),
  confidence: z.number().min(0).max(1),
  extractedParameters: z.object({
    diagramType: z.string().optional(),
    analysisType: z.string().optional(),
    modificationDescription: z.string().optional(),
    generationRequirements: z.string().optional()
  })
});

/**
 * Type definition for the intent classification result
 */
export type IntentClassification = z.infer<typeof intentOutputSchema>;

/**
 * Classifies user intent regarding PlantUML diagrams.
 * 
 * This function analyzes a user's message to determine if they want to 
 * generate a new diagram, modify an existing one, or analyze a diagram.
 * 
 * @param params - The input parameters containing the user message and context
 * @returns A promise resolving to an intent classification object
 */
export async function classifyIntent(params: InputProcessorParams): Promise<IntentClassification> {
  try {
    // Validate input parameters
    const validatedParams = inputParamsSchema.parse(params);
    
    // Precompute template values for better readability
    const { userInput, currentDiagram = "", conversation = [] } = validatedParams;
    const currentDiagramStatus = currentDiagram ? "YES" : "NO";
    const conversationHistory = conversation.length > 0 ? `Previous conversation:\n${conversation.join('\n')}` : '';
    
    // Create intent classifier prompt with precomputed values
    const intentClassifierPrompt = PromptTemplate.fromTemplate(`
      ${baseSystemPrompt}
      
      Your task is to classify the user's intent regarding PlantUML diagrams.
      
      Current diagram present: ${currentDiagramStatus}
      
      User request: ${userInput}
      
      ${conversationHistory}
      
      Classify the intent as one of: GENERATE (for creating a new diagram), MODIFY (for changing an existing diagram), ANALYZE (for examining a diagram), or UNKNOWN (if unclear).
      
      Analyze the confidence of your classification on a scale from 0 to 1.
      
      Extract relevant parameters related to the user's request.
      
      ${StructuredOutputParser.fromZodSchema(intentOutputSchema).getFormatInstructions()}
    `);
    
    // Create a parser for structured output
    const parser = StructuredOutputParser.fromZodSchema(intentOutputSchema);

    // Create the intent classification chain
    const intentClassificationChain = RunnableSequence.from([
      intentClassifierPrompt,
      model,
      parser
    ]);

    // Execute the chain with the input
    const result = await intentClassificationChain.invoke({});
    logger.info("Intent classification completed", { intent: result.intent, confidence: result.confidence });
    
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("Input validation error:", { errors: error.errors });
      // Return a validation error classification
      return {
        intent: DiagramIntent.UNKNOWN,
        confidence: 0,
        extractedParameters: {
          generationRequirements: "Invalid input parameters provided"
        }
      };
    } else if (error instanceof Error) {
      logger.error("Error classifying intent:", { message: error.message, stack: error.stack });
    } else {
      logger.error("Unknown error during intent classification:", { error });
    }
    
    // Return a fallback classification on error
    return {
      intent: DiagramIntent.UNKNOWN,
      confidence: 0,
      extractedParameters: {}
    };
  }
}
````

## File: lib/ai-pipeline/taskRouter.ts
````typescript
import { RunnableSequence } from "@langchain/core/runnables";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { model } from "./baseChain";
import { DiagramIntent } from "./inputProcessor";
import { contextManager } from "./contextManager";
import winston from "winston";

// Setup logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Agent placeholders - to be implemented
const diagramGenerator = { invoke: async () => ({ type: "message", content: "Generator placeholder" }) };
const diagramModifier = { invoke: async () => ({ type: "message", content: "Modifier placeholder" }) };
const diagramAnalyzer = { invoke: async () => ({ type: "message", content: "Analyzer placeholder" }) };

// Define the task router prompt template
const routerPromptTemplate = PromptTemplate.fromTemplate(`
You are a task router for a PlantUML diagram assistant.
Based on the user's message and the current state of the diagram, determine which specialized agent
should handle this request.

User message: {userInput}

Current diagram: {currentDiagram}

Previous messages: {messageHistory}

Classify the request into exactly one of the following categories:
- GENERATE: Create a new diagram or a completely different one
- MODIFY: Make changes to an existing diagram
- ANALYZE: Explain, interpret, or provide feedback on the diagram

Return only the category name (GENERATE, MODIFY, or ANALYZE) with no additional text.
`);

// Create the task router chain
export const taskRouter = RunnableSequence.from([
  routerPromptTemplate,
  model,
  new StringOutputParser(),
]);

/**
 * Routes the request to the appropriate specialized agent based on intent
 * @param params - Object containing user input, current diagram and message history
 * @returns Response from the appropriate specialized agent
 */
export async function routeRequest({ 
  userInput, 
  currentDiagram, 
  messageHistory 
}: { 
  userInput: string; 
  currentDiagram: string; 
  messageHistory: string;
}) {
  try {
    // Get the task classification
    const taskType = await taskRouter.invoke({
      userInput,
      currentDiagram,
      messageHistory,
    });

    // Update context with intent
    let intent: DiagramIntent;
    
    // Route to the appropriate agent based on the task type
    switch (taskType.trim().toUpperCase()) {
      case "GENERATE":
        intent = DiagramIntent.GENERATE;
        contextManager.setLastIntent(intent);
        logger.info("Routing to generator agent", { userInput });
        return await diagramGenerator.invoke({ 
          userInput, 
          currentDiagram, 
          messageHistory,
          context: await contextManager.getGeneratorContext()
        });
        
      case "MODIFY":
        intent = DiagramIntent.MODIFY;
        contextManager.setLastIntent(intent);
        logger.info("Routing to modifier agent", { userInput });
        return await diagramModifier.invoke({ 
          userInput, 
          currentDiagram, 
          messageHistory,
          context: await contextManager.getModifierContext()
        });
        
      case "ANALYZE":
        intent = DiagramIntent.ANALYZE;
        contextManager.setLastIntent(intent);
        logger.info("Routing to analyzer agent", { userInput });
        return await diagramAnalyzer.invoke({ 
          userInput, 
          currentDiagram, 
          messageHistory,
          context: await contextManager.getAnalyzerContext()
        });
        
      default:
        // Fallback if classification is unclear
        intent = DiagramIntent.UNKNOWN;
        contextManager.setLastIntent(intent);
        logger.warn(`Unknown task type: ${taskType}. Defaulting to ANALYZE.`);
        return await diagramAnalyzer.invoke({ 
          userInput, 
          currentDiagram, 
          messageHistory,
          context: await contextManager.getAnalyzerContext()
        });
    }
  } catch (error) {
    logger.error("Error in task router:", error);
    return {
      type: "error",
      content: "I encountered an error determining how to process your request. Please try again.",
    };
  }
}

// Export the router object
const router = {
  routeRequest,
  taskRouter,
};

export default router;
````

## File: lib/utils.ts
````typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
````

## File: lib/utils/openAIStreaming.ts
````typescript
/* import OpenAI from "openai";
import { zodResponseFormat} from "openai/helpers/zod";
import {z} from "zod";
export const openai = new OpenAI();

const responseSchema = z.object({
    type: z.string(),
    content: z.string(),
});

export const streaming = openai.beta.chat.completions.stream(
  {
    model:'gpt-4-turbo',
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant."
      },
        {
            role: "user",
            content: "What is the purpose of life?"
        }
    ]
  }  
); */
````

## File: lib/utils/plantuml.ts
````typescript
import { encode } from "plantuml-encoder"

export const PLANTUML_SERVER = "https://www.plantuml.com/plantuml"

export type PlantUMLFormat = "svg" | "png"

/**
 * Generates a URL for rendering a PlantUML diagram
 * @param content - The PlantUML script content
 * @param format - The output format (svg or png)
 * @returns The URL to the rendered diagram
 */
export function getPlantUMLPreviewURL(content: string, format: PlantUMLFormat = "svg"): string {
  if (!content) return ""
  
  try {
    const encoded = encode(content)
    return `${PLANTUML_SERVER}/${format}/${encoded}`
  } catch (error) {
    console.error("Error encoding PlantUML content:", error)
    return ""
  }
}

/**
 * Checks if the PlantUML content is valid
 * @param content - The PlantUML script to validate
 * @returns Boolean indicating if content is valid
 */
export function isValidPlantUML(content: string): boolean {
  // Basic validation - check for balanced @startuml/@enduml tags
  const hasStart = content.includes('@startuml')
  const hasEnd = content.includes('@enduml')
  
  return hasStart && hasEnd
}

export const DEFAULT_PLANTUML = `@startuml
actor User
participant "Frontend" as FE
participant "Backend" as BE
database "Database" as DB

User -> FE: Access Application
FE -> BE: Request Data
BE -> DB: Query Data
DB --> BE: Return Results
BE --> FE: Send Response
FE --> User: Display Data
@enduml`
````

## File: LICENSE.md
````markdown
MIT License

Copyright (c) 2025 Saeed NajafiMosleh

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
````

## File: postcss.config.mjs
````
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
  },
};

export default config;
````

## File: public/file.svg
````
<svg fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M14.5 13.5V5.41a1 1 0 0 0-.3-.7L9.8.29A1 1 0 0 0 9.08 0H1.5v13.5A2.5 2.5 0 0 0 4 16h8a2.5 2.5 0 0 0 2.5-2.5m-1.5 0v-7H8v-5H3v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1M9.5 5V2.12L12.38 5zM5.13 5h-.62v1.25h2.12V5zm-.62 3h7.12v1.25H4.5zm.62 3h-.62v1.25h7.12V11z" clip-rule="evenodd" fill="#666" fill-rule="evenodd"/></svg>
````

## File: public/globe.svg
````
<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g clip-path="url(#a)"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.27 14.1a6.5 6.5 0 0 0 3.67-3.45q-1.24.21-2.7.34-.31 1.83-.97 3.1M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.48-1.52a7 7 0 0 1-.96 0H7.5a4 4 0 0 1-.84-1.32q-.38-.89-.63-2.08a40 40 0 0 0 3.92 0q-.25 1.2-.63 2.08a4 4 0 0 1-.84 1.31zm2.94-4.76q1.66-.15 2.95-.43a7 7 0 0 0 0-2.58q-1.3-.27-2.95-.43a18 18 0 0 1 0 3.44m-1.27-3.54a17 17 0 0 1 0 3.64 39 39 0 0 1-4.3 0 17 17 0 0 1 0-3.64 39 39 0 0 1 4.3 0m1.1-1.17q1.45.13 2.69.34a6.5 6.5 0 0 0-3.67-3.44q.65 1.26.98 3.1M8.48 1.5l.01.02q.41.37.84 1.31.38.89.63 2.08a40 40 0 0 0-3.92 0q.25-1.2.63-2.08a4 4 0 0 1 .85-1.32 7 7 0 0 1 .96 0m-2.75.4a6.5 6.5 0 0 0-3.67 3.44 29 29 0 0 1 2.7-.34q.31-1.83.97-3.1M4.58 6.28q-1.66.16-2.95.43a7 7 0 0 0 0 2.58q1.3.27 2.95.43a18 18 0 0 1 0-3.44m.17 4.71q-1.45-.12-2.69-.34a6.5 6.5 0 0 0 3.67 3.44q-.65-1.27-.98-3.1" fill="#666"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h16v16H0z"/></clipPath></defs></svg>
````

## File: public/next.svg
````
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 394 80"><path fill="#000" d="M262 0h68.5v12.7h-27.2v66.6h-13.6V12.7H262V0ZM149 0v12.7H94v20.4h44.3v12.6H94v21h55v12.6H80.5V0h68.7zm34.3 0h-17.8l63.8 79.4h17.9l-32-39.7 32-39.6h-17.9l-23 28.6-23-28.6zm18.3 56.7-9-11-27.1 33.7h17.8l18.3-22.7z"/><path fill="#000" d="M81 79.3 17 0H0v79.3h13.6V17l50.2 62.3H81Zm252.6-.4c-1 0-1.8-.4-2.5-1s-1.1-1.6-1.1-2.6.3-1.8 1-2.5 1.6-1 2.6-1 1.8.3 2.5 1a3.4 3.4 0 0 1 .6 4.3 3.7 3.7 0 0 1-3 1.8zm23.2-33.5h6v23.3c0 2.1-.4 4-1.3 5.5a9.1 9.1 0 0 1-3.8 3.5c-1.6.8-3.5 1.3-5.7 1.3-2 0-3.7-.4-5.3-1s-2.8-1.8-3.7-3.2c-.9-1.3-1.4-3-1.4-5h6c.1.8.3 1.6.7 2.2s1 1.2 1.6 1.5c.7.4 1.5.5 2.4.5 1 0 1.8-.2 2.4-.6a4 4 0 0 0 1.6-1.8c.3-.8.5-1.8.5-3V45.5zm30.9 9.1a4.4 4.4 0 0 0-2-3.3 7.5 7.5 0 0 0-4.3-1.1c-1.3 0-2.4.2-3.3.5-.9.4-1.6 1-2 1.6a3.5 3.5 0 0 0-.3 4c.3.5.7.9 1.3 1.2l1.8 1 2 .5 3.2.8c1.3.3 2.5.7 3.7 1.2a13 13 0 0 1 3.2 1.8 8.1 8.1 0 0 1 3 6.5c0 2-.5 3.7-1.5 5.1a10 10 0 0 1-4.4 3.5c-1.8.8-4.1 1.2-6.8 1.2-2.6 0-4.9-.4-6.8-1.2-2-.8-3.4-2-4.5-3.5a10 10 0 0 1-1.7-5.6h6a5 5 0 0 0 3.5 4.6c1 .4 2.2.6 3.4.6 1.3 0 2.5-.2 3.5-.6 1-.4 1.8-1 2.4-1.7a4 4 0 0 0 .8-2.4c0-.9-.2-1.6-.7-2.2a11 11 0 0 0-2.1-1.4l-3.2-1-3.8-1c-2.8-.7-5-1.7-6.6-3.2a7.2 7.2 0 0 1-2.4-5.7 8 8 0 0 1 1.7-5 10 10 0 0 1 4.3-3.5c2-.8 4-1.2 6.4-1.2 2.3 0 4.4.4 6.2 1.2 1.8.8 3.2 2 4.3 3.4 1 1.4 1.5 3 1.5 5h-5.8z"/></svg>
````

## File: public/vercel.svg
````
<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1155 1000"><path d="m577.3 0 577.4 1000H0z" fill="#fff"/></svg>
````

## File: public/window.svg
````
<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill-rule="evenodd" clip-rule="evenodd" d="M1.5 2.5h13v10a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1zM0 1h16v11.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 0 12.5zm3.75 4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5M7 4.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0m1.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5" fill="#666"/></svg>
````

## File: vscode-style-terminal-tabs-plantuml.svg
````
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700">
  <!-- Background -->
  <rect width="1000" height="700" fill="#1e1e1e"/>
  
  <!-- Header/Title bar -->
  <rect x="0" y="0" width="1000" height="30" fill="#323233"/>
  <text x="20" y="20" font-family="Arial" font-size="14" fill="#ffffff">PlantUML Editor</text>
  <circle cx="980" cy="15" r="6" fill="#ff5f57"/>
  <circle cx="960" cy="15" r="6" fill="#febc2e"/>
  <circle cx="940" cy="15" r="6" fill="#28c840"/>
  
  <!-- Activity Bar (leftmost) -->
  <rect x="0" y="30" width="50" height="670" fill="#333333"/>
  <rect x="0" y="40" width="50" height="40" fill="#505050"/>
  <text x="25" y="65" font-family="Arial" font-size="18" fill="#ffffff" text-anchor="middle">📁</text>
  <text x="25" y="115" font-family="Arial" font-size="18" fill="#ffffff" text-anchor="middle">🔄</text>
  <text x="25" y="165" font-family="Arial" font-size="18" fill="#ffffff" text-anchor="middle">📋</text>
  <text x="25" y="215" font-family="Arial" font-size="18" fill="#ffffff" text-anchor="middle">🔍</text>
  <text x="25" y="665" font-family="Arial" font-size="18" fill="#ffffff" text-anchor="middle">⚙️</text>
  
  <!-- Left Sidebar - File Explorer, Templates, Version Control -->
  <rect x="50" y="30" width="200" height="670" fill="#252526"/>
  
  <!-- File Explorer Section -->
  <rect x="50" y="30" width="200" height="30" fill="#2d2d2d"/>
  <text x="65" y="50" font-family="Arial" font-size="14" fill="#ffffff">EXPLORER</text>
  <text x="232" y="50" font-family="Arial" font-size="14" fill="#ffffff" text-anchor="middle">...</text>
  
  <!-- File Tree -->
  <rect x="50" y="60" width="200" height="200" fill="#252526"/>
  <text x="70" y="80" font-family="Arial" font-size="12" fill="#ffffff">📁 PROJECT</text>
  <text x="90" y="100" font-family="Arial" font-size="12" fill="#cccccc">📄 sequence.puml</text>
  <text x="90" y="120" font-family="Arial" font-size="12" fill="#cccccc">📄 class.puml</text>
  <text x="90" y="140" font-family="Arial" font-size="12" fill="#cccccc">📄 activity.puml</text>
  <text x="70" y="160" font-family="Arial" font-size="12" fill="#ffffff">📁 EXAMPLES</text>
  <text x="90" y="180" font-family="Arial" font-size="12" fill="#cccccc">📄 authentication.puml</text>
  <text x="90" y="200" font-family="Arial" font-size="12" fill="#cccccc">📄 microservice.puml</text>

  <!-- Templates Section -->
  <rect x="50" y="260" width="200" height="30" fill="#2d2d2d"/>
  <text x="65" y="280" font-family="Arial" font-size="14" fill="#ffffff">TEMPLATES</text>
  <text x="232" y="280" font-family="Arial" font-size="14" fill="#ffffff" text-anchor="middle">...</text>
  
  <!-- Templates List -->
  <rect x="50" y="290" width="200" height="150" fill="#252526"/>
  <text x="70" y="310" font-family="Arial" font-size="12" fill="#cccccc">📊 Sequence Diagram</text>
  <text x="70" y="330" font-family="Arial" font-size="12" fill="#cccccc">📊 Class Diagram</text>
  <text x="70" y="350" font-family="Arial" font-size="12" fill="#cccccc">📊 Use Case Diagram</text>
  <text x="70" y="370" font-family="Arial" font-size="12" fill="#cccccc">📊 Activity Diagram</text>
  <text x="70" y="390" font-family="Arial" font-size="12" fill="#cccccc">📊 State Diagram</text>
  <text x="70" y="410" font-family="Arial" font-size="12" fill="#cccccc">📊 Component Diagram</text>
  
  <!-- Version Control Section -->
  <rect x="50" y="440" width="200" height="30" fill="#2d2d2d"/>
  <text x="65" y="460" font-family="Arial" font-size="14" fill="#ffffff">GIT</text>
  <text x="232" y="460" font-family="Arial" font-size="14" fill="#ffffff" text-anchor="middle">...</text>
  
  <!-- Git Status -->
  <rect x="50" y="470" width="200" height="100" fill="#252526"/>
  <text x="70" y="490" font-family="Arial" font-size="12" fill="#cccccc">Changes (2)</text>
  <text x="90" y="510" font-family="Arial" font-size="12" fill="#cccccc">M sequence.puml</text>
  <text x="90" y="530" font-family="Arial" font-size="12" fill="#cccccc">+ new_diagram.puml</text>
  <text x="70" y="550" font-family="Arial" font-size="12" fill="#cccccc">Branch: main</text>
  
  <!-- Main Editor Area -->
  <rect x="250" y="30" width="500" height="470" fill="#1e1e1e"/>
  
  <!-- Editor Tabs -->
  <rect x="250" y="30" width="500" height="30" fill="#2d2d2d"/>
  <rect x="250" y="30" width="150" height="30" fill="#094771"/>
  <text x="325" y="50" font-family="Arial" font-size="12" fill="#ffffff" text-anchor="middle">sequence.puml</text>
  <text x="415" y="50" font-family="Arial" font-size="12" fill="#888888" text-anchor="middle">class.puml</text>
  
  <!-- Editor Controls -->
  <rect x="630" y="35" width="50" height="20" rx="3" fill="#4285f4"/>
  <text x="655" y="50" font-family="Arial" font-size="12" fill="white" text-anchor="middle">Run</text>
  <rect x="690" y="35" width="50" height="20" rx="3" fill="#333333"/>
  <text x="715" y="50" font-family="Arial" font-size="12" fill="white" text-anchor="middle">Save</text>
  
  <!-- Monaco Editor Content -->
  <rect x="250" y="60" width="500" height="440" rx="0" fill="#1e1e1e"/>
  <rect x="250" y="60" width="30" height="440" fill="#252526"/>
  <text x="265" y="80" font-family="Consolas, monospace" font-size="12" fill="#858585">1</text>
  <text x="265" y="100" font-family="Consolas, monospace" font-size="12" fill="#858585">2</text>
  <text x="265" y="120" font-family="Consolas, monospace" font-size="12" fill="#858585">3</text>
  <text x="265" y="140" font-family="Consolas, monospace" font-size="12" fill="#858585">4</text>
  <text x="265" y="160" font-family="Consolas, monospace" font-size="12" fill="#858585">5</text>
  <text x="265" y="180" font-family="Consolas, monospace" font-size="12" fill="#858585">6</text>
  <text x="265" y="200" font-family="Consolas, monospace" font-size="12" fill="#858585">7</text>
  <text x="265" y="220" font-family="Consolas, monospace" font-size="12" fill="#858585">8</text>
  <text x="265" y="240" font-family="Consolas, monospace" font-size="12" fill="#858585">9</text>
  <text x="265" y="260" font-family="Consolas, monospace" font-size="12" fill="#858585">10</text>
  <text x="265" y="280" font-family="Consolas, monospace" font-size="12" fill="#858585">11</text>
  <text x="265" y="300" font-family="Consolas, monospace" font-size="12" fill="#858585">12</text>
  <text x="265" y="320" font-family="Consolas, monospace" font-size="12" fill="#858585">13</text>
  
  <text x="290" y="80" font-family="Consolas, monospace" font-size="12" fill="#569cd6">@startuml</text>
  <text x="290" y="100" font-family="Consolas, monospace" font-size="12" fill="#569cd6">title</text>
  <text x="290" y="120" font-family="Consolas, monospace" font-size="12" fill="#ce9178">Login Sequence</text>
  <text x="290" y="140" font-family="Consolas, monospace" font-size="12" fill="#569cd6">end title</text>
  <text x="290" y="160" font-family="Consolas, monospace" font-size="12" fill="#569cd6">actor</text>
  <text x="290" y="180" font-family="Consolas, monospace" font-size="12" fill="#ce9178">User</text>
  <text x="290" y="200" font-family="Consolas, monospace" font-size="12" fill="#569cd6">participant</text>
  <text x="290" y="220" font-family="Consolas, monospace" font-size="12" fill="#ce9178">"Server"</text>
  <text x="290" y="240" font-family="Consolas, monospace" font-size="12" fill="#569cd6">User -></text>
  <text x="290" y="260" font-family="Consolas, monospace" font-size="12" fill="#ce9178">"Server": Login Request</text>
  <text x="290" y="280" font-family="Consolas, monospace" font-size="12" fill="#569cd6">Server --></text>
  <text x="290" y="300" font-family="Consolas, monospace" font-size="12" fill="#ce9178">User: Authentication Response</text>
  <text x="290" y="320" font-family="Consolas, monospace" font-size="12" fill="#569cd6">@enduml</text>
  
  <!-- Terminal/Chat Area -->
  <rect x="250" y="500" width="500" height="200" fill="#1e1e1e"/>
  <rect x="250" y="500" width="500" height="30" fill="#2d2d2d"/>
  <text x="270" y="520" font-family="Arial" font-size="12" fill="#ffffff">TERMINAL / CHAT</text>
  
  <!-- Terminal Tabs -->
  <rect x="390" y="505" width="80" height="20" fill="#094771"/>
  <text x="430" y="520" font-family="Arial" font-size="12" fill="#ffffff" text-anchor="middle">COPILOT</text>
  <text x="500" y="520" font-family="Arial" font-size="12" fill="#888888" text-anchor="middle">TERMINAL</text>
  <text x="570" y="520" font-family="Arial" font-size="12" fill="#888888" text-anchor="middle">PROBLEMS</text>
  <text x="640" y="520" font-family="Arial" font-size="12" fill="#888888" text-anchor="middle">OUTPUT</text>
  
  <!-- Chat Content -->
  <rect x="250" y="530" width="500" height="140" fill="#1e1e1e"/>
  <rect x="260" y="540" width="480" height="40" rx="5" fill="#333333"/>
  <text x="270" y="560" font-family="Arial" font-size="12" fill="#cccccc">How can I create a sequence diagram for user authentication?</text>
  
  <rect x="260" y="590" width="480" height="60" rx="5" fill="#063561"/>
  <text x="270" y="610" font-family="Arial" font-size="12" fill="#cccccc">I've added a basic authentication sequence. You can see the preview on the right.</text>
  <text x="270" y="630" font-family="Arial" font-size="12" fill="#cccccc">Would you like to add more steps or participants?</text>
  
  <!-- Chat Input -->
  <rect x="260" y="660" width="480" height="30" rx="5" fill="#3c3c3c"/>
  <text x="270" y="680" font-family="Arial" font-size="12" fill="#999999">Ask about PlantUML or request a diagram change...</text>
  
  <!-- Right Panel - Preview -->
  <rect x="750" y="30" width="250" height="670" fill="#252526"/>
  <rect x="750" y="30" width="250" height="30" fill="#2d2d2d"/>
  <text x="770" y="50" font-family="Arial" font-size="14" fill="#ffffff">PREVIEW</text>
  
  <!-- Preview Controls -->
  <rect x="890" y="35" width="50" height="20" rx="3" fill="#333333"/>
  <text x="915" y="50" font-family="Arial" font-size="12" fill="white" text-anchor="middle">Export</text>
  <rect x="830" y="35" width="50" height="20" rx="3" fill="#333333"/>
  <text x="855" y="50" font-family="Arial" font-size="12" fill="white" text-anchor="middle">Share</text>
  
  <!-- PlantUML Preview -->
  <rect x="760" y="70" width="230" height="350" fill="#1e1e1e" stroke="#444444"/>
  
  <!-- Diagram Title -->
  <rect x="770" y="80" width="210" height="25" fill="#1e1e1e"/>
  <text x="875" y="97" font-family="Arial" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">Login Sequence</text>
  
  <!-- Simple diagram visualization -->
  <!-- Actor and participant -->
  <circle cx="800" cy="150" r="15" fill="none" stroke="#cccccc"/> 
  </svg>
````

## File: app/globals.css
````css
/* Keep existing imports */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Enhance font rendering */
body {
  font-family: 'Segoe UI', Arial, sans-serif;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

@layer base {
  /* Keep existing CSS variables but add a few new ones */
  :root {
    /* Background gradients */
    --header-gradient: linear-gradient(90deg, #1A1E2D 0%, #2D293B 100%);
    --main-bg-gradient: linear-gradient(135deg, #171923 0%, #1A1A2E 100%);
    --chat-panel-gradient: linear-gradient(180deg, #232838 0%, #1E2230 100%);
    --editor-panel-gradient: linear-gradient(180deg, #1E2433 0%, #1A1F2B 100%);
    --preview-panel-gradient: linear-gradient(180deg, #252C40 0%, #1F2335 100%);
    --user-msg-gradient: linear-gradient(90deg, #2E3B5E 0%, #364878 100%);
    --ai-msg-gradient: linear-gradient(90deg, #2A3046 0%, #2C384F 100%);
    --btn-primary-gradient: linear-gradient(180deg, #6F87FF 0%, #5E6FE6 100%);
    --btn-secondary-gradient: linear-gradient(180deg, #3A4055 0%, #2F3447 100%);
    --tab-active-gradient: linear-gradient(180deg, #384364 0%, #2F3A59 100%);
    --logo-gradient: linear-gradient(135deg, #7F87FF 0%, #6F66E2 100%);
    
    /* Base colors */
    --background: 222 47% 11%;
    --foreground: 210 40% 98%;
    --card: 217 33% 17%;
    --card-foreground: 210 40% 98%;
    --popover: 222 47% 11%;
    --popover-foreground: 210 40% 98%;
    --primary: 221 83% 53%;
    --primary-foreground: 210 40% 98%;
    --secondary: 217 33% 17%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217 33% 17%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217 33% 17%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 217 33% 25%;
    --input: 217 33% 22%;
    --ring: 224 76% 48%;
    
    /* UI Element Colors */
    --panel-bg: #151824;
    --panel-border: #252A3A;
    --header-bg: #252C40;
    --chat-bg: #1C2032;
    --editor-bg: #1A1F2B;
    --preview-bg: #1A203A;
    --input-bg: #1C2032;
    --input-border: #384364;
    --active-line: #2D3656;
    --scrollbar-bg: #17192A;
    --scrollbar-thumb: #384364;
    --user-text: #E8EAFF;
    --ai-text: #DFFFF6;
    --muted-text: #8990B0;
    
    --radius: 0.5rem;
  }

  /* Always use dark mode */
  :root {
    color-scheme: dark;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    background: var(--main-bg-gradient);
  }
  .diagram-content {
    @apply transition-all duration-300 ease-in-out;
  }
  .diagram-content img {
    @apply max-w-full max-h-full;
  }
}

/* Custom scrollbar for dark theme */
::-webkit-scrollbar {
  width: 8px; /* Smaller scrollbar */
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--scrollbar-bg);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: hsl(217 33% 35%);
}

/* Animation for auto-expanding textarea */
.textarea-resize-animation {
  transition: height 0.15s ease-out;
}

/* Custom Monaco Editor Styling */
.monaco-editor .margin {
  background-color: var(--scrollbar-bg) !important;
}

.monaco-editor .monaco-scrollable-element .scrollbar.vertical .slider {
  background-color: var(--scrollbar-thumb) !important;
}

/* Custom components */
@layer components {
  .main-container {
    @apply container mx-auto px-2 py-2 flex flex-col h-[calc(100vh-80px)];
  }
  
  .panel-container {
    @apply grid gap-3 h-full overflow-hidden;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);
  }
  
  .panel {
    @apply flex-1 min-w-0 rounded-lg overflow-hidden flex flex-col;
    box-shadow: 0px 3px 6px rgba(0, 0, 0, 0.2);
  }
  
  .panel-header {
    @apply p-2 flex items-center justify-between;
    background-color: var(--header-bg);
    border-bottom: 1px solid var(--panel-border);
  }
  
  .panel-title {
    @apply text-base font-semibold text-white flex items-center gap-2;
  }
  
  .panel-title-icon {
    @apply w-4 h-4 rounded;
  }
  
  .panel-content {
    @apply flex-1 overflow-hidden;
  }
  
  .message-user {
    @apply rounded-lg;
    background: var(--user-msg-gradient);
    border: 1px solid rgba(111, 135, 255, 0.3);
  }
  
  .message-assistant {
    @apply rounded-lg;
    background: var(--ai-msg-gradient);
    border: 1px solid rgba(78, 201, 176, 0.3);
  }
  
  .button-primary {
    @apply rounded-full px-3 py-1.5 text-sm font-medium text-white;
    background: var(--btn-primary-gradient);
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  .button-secondary {
    @apply rounded-md px-2 py-1 text-sm font-medium text-gray-200;
    background: var(--btn-secondary-gradient);
    border: 1px solid var(--input-border);
  }
  
  .chat-input-container {
    @apply relative;
    background-color: var(--input-bg);
    border: 1px solid var(--input-border);
  }
  
  .format-toggle {
    @apply flex rounded-md overflow-hidden;
    border: 1px solid var(--input-border);
  }
  
  .format-option {
    @apply px-2 py-1 text-xs font-medium;
  }
  
  .format-active {
    background: #6F87FF;
    color: white;
  }
  
  .format-inactive {
    background: var(--input-bg);
    color: var(--muted-text);
  }

  /* Animation for glowing effect */
  @keyframes softGlow {
    0% { filter: drop-shadow(0 0 2px rgba(111, 135, 255, 0.3)); }
    50% { filter: drop-shadow(0 0 4px rgba(111, 135, 255, 0.5)); }
    100% { filter: drop-shadow(0 0 2px rgba(111, 135, 255, 0.3)); }
  }

  .glow-effect {
    animation: softGlow 2s infinite;
  }
}

/* App-specific styles */
.app-container {
  min-height: 100vh;
  background: var(--main-bg-gradient);
}

.app-header {
  background: var(--header-gradient);
  box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.2);
  height: 40px; /* Reduced header height */
}

.chat-panel {
  background: var(--chat-panel-gradient);
  border: 1px solid var(--panel-border);
}

.editor-panel {
  background: var(--editor-panel-gradient);
  border: 1px solid var(--panel-border);
}

.preview-panel {
  background: var(--preview-panel-gradient);
  border: 1px solid var(--panel-border);
}

.monaco-editor-container {
  overflow: hidden;
  height: 100%;
}

/* Fix the chat input styling to ensure proper send button positioning */
.chat-input-wrapper {
  position: relative;
  margin-bottom: 10px;
}

/* This file only contains the VS Code-related styling changes to match
   the requested color scheme. The full file would be much larger. */

/* VS Code syntax highlighting theme colors */
.monaco-editor .mtk1 { color: #D4D4D4; } /* Default text */
.monaco-editor .mtk2 { color: #569CD6; } /* Keywords */
.monaco-editor .mtk3 { color: #6A9955; } /* Comments */
.monaco-editor .mtk4 { color: #CE9178; } /* Strings */
.monaco-editor .mtk5 { color: #4EC9B0; } /* Types and tags */
.monaco-editor .mtk6 { color: #D4D4D4; } /* Operators */
.monaco-editor .mtk7 { color: #4FC1FF; } /* Constants */
.monaco-editor .mtk8 { color: #B5CEA8; } /* Numbers */
.monaco-editor .mtk9 { color: #C586C0; } /* Preprocessor */
.monaco-editor .mtk10 { color: #D7BA7D; } /* String escapes */
.monaco-editor .mtk11 { color: #F14C4C; } /* Invalid */

/* VS Code UI colors */
.monaco-editor .margin { background-color: #1E1E1E !important; }
.monaco-editor .line-numbers { color: #858585 !important; }
.monaco-editor .current-line { background-color: #2D2D30 !important; }
.monaco-editor .cursor { background-color: #AEAFAD !important; }

/* Line highlighting */
.monaco-editor .view-overlays .current-line { background-color: #2D2D30 !important; }
.monaco-editor .margin-view-overlays .current-line-margin { background-color: #2D2D30 !important; }

/* Selection highlighting */
.monaco-editor .selected-text { background-color: #264F78 !important; }

/* Improve VS Code-like focus styling for active line */
.monaco-editor-background {
  background-color: #1E1E1E;
}

.monaco-editor .current-line-highlight {
  background-color: #2D2D30;
  border-left: 2px solid #5E85E2;
}

/* Custom styling for error decoration */
.errorDecoration {
  background-color: rgba(255, 0, 0, 0.1);
  border-bottom: 2px dotted #F14C4C;
}

.errorGlyphMargin {
  background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><circle cx='8' cy='8' r='7' fill='%23F14C4C' /><path d='M8 4v6M8 11v1' stroke='white' stroke-width='1.5' /></svg>") no-repeat center center;
}

/* Collapsible panel animation */
.panel-collapsible {
  transition: width 0.3s ease-in-out;
}

/* Improved checkerboard pattern for transparency indication */
.transparent-bg {
  background-image: 
    repeating-conic-gradient(
      #1C2240 0% 25%, 
      #1F2546 0% 50%
    );
  background-size: 20px 20px;
}

/* Animation for chat message appearance */
@keyframes messageAppear {
  from { 
    opacity: 0;
    transform: translateY(10px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

.message-user, .message-assistant {
  animation: messageAppear 0.3s ease-out forwards;
}

/* Enhanced scrollbar styling for VS Code look */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: #1E1E1E;
}

::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #4D4D4D;
}

::-webkit-scrollbar-corner {
  background: #1E1E1E;
}
````

## File: app/layout.tsx
````typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ModelMind - AI-Powered Diagram Assistant",
  description: "Create, modify, and analyze PlantUML diagrams with AI assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased app-container`}>        
        <header className="app-header px-4 flex items-center">
          <div className="flex items-center">
            <div className="relative mr-2">
              <div 
                className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[12px] border-transparent border-b-indigo-500 glow-effect"
              />
            </div>
            <h1 className="text-2xl font-bold text-white">ModelMind</h1>
          </div>         

        </header>
        
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
````

## File: app/page.tsx
````typescript
"use client"

import { useState, useEffect } from "react"
import { ChatInterface } from "@/components/chat-interface/chat-interface"
import { CodeEditor } from "@/components/code-editor/code-editor"
import { Preview } from "@/components/preview/preview"
import { DEFAULT_PLANTUML } from "@/lib/utils/plantuml"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CollapsiblePanel } from "@/components/ui/collapsible-panel"
import { Code, MessageSquare, Image } from "lucide-react"

export default function Home() {
  const [script, setScript] = useState(DEFAULT_PLANTUML)
  const [activeTab, setActiveTab] = useState<string>("chat")
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  
  // Panel expanded states
  const [chatExpanded, setChatExpanded] = useState(true)
  const [editorExpanded, setEditorExpanded] = useState(true)
  const [previewExpanded, setPreviewExpanded] = useState(true)
  
  // Detect screen size for responsive layout
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 1024)
    }
    
    // Check on initial load
    checkScreenSize()
    
    // Add resize listener
    window.addEventListener('resize', checkScreenSize)
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkScreenSize)
    }
  }, [])

  return (
    <div className="main-container">
      {/* Mobile Tab Layout - Only shown on small screens */}
      {isSmallScreen ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="chat" className="text-sm">Chat</TabsTrigger>
            <TabsTrigger value="editor" className="text-sm">Editor</TabsTrigger>
            <TabsTrigger value="preview" className="text-sm">Preview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="mt-2 h-[calc(100vh-150px)]">
            <div className="panel chat-panel h-full">
              <div className="panel-header">
                <div className="panel-title">
                  <div className="panel-title-icon bg-indigo-500"></div>
                  <span>Chat Assistant</span>
                </div>
              </div>
              <div className="panel-content">
                <ChatInterface onScriptGenerated={setScript} currentScript={script} />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="editor" className="mt-2 h-[calc(100vh-150px)]">
            <div className="panel editor-panel h-full">
              <div className="panel-header">
                <div className="panel-title">
                  <div className="panel-title-icon bg-blue-600"></div>
                  <span>PlantUML Editor</span>
                </div>
              </div>
              <div className="panel-content">
                <CodeEditor value={script} onChange={setScript} />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="preview" className="mt-2 h-[calc(100vh-150px)]">
            <div className="panel preview-panel h-full">
              <div className="panel-header">
                <div className="panel-title">
                  <div className="panel-title-icon bg-purple-500"></div>
                  <span>Diagram Preview</span>
                </div>
              </div>
              <div className="panel-content">
                <Preview content={script} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        /* Desktop Layout - Using collapsible panels */
        <div className="flex h-full gap-4">
          {/* Chat Panel */}
          <CollapsiblePanel
            id="chat-panel"
            title="Chat Assistant"
            icon={<MessageSquare className="w-5 h-5 text-indigo-400" />}
            defaultExpanded={chatExpanded}
            onToggle={setChatExpanded}
            className={`transition-all duration-300 ${chatExpanded ? 'w-1/3 min-w-[300px]' : 'w-auto min-w-[50px]'}`}
          >
            <ChatInterface onScriptGenerated={setScript} currentScript={script} />
          </CollapsiblePanel>
          
          {/* Editor Panel */}
          <CollapsiblePanel
            id="editor-panel"
            title="PlantUML Editor"
            icon={<Code className="w-5 h-5 text-blue-400" />}
            defaultExpanded={editorExpanded}
            onToggle={setEditorExpanded}
            className={`transition-all duration-300 ${editorExpanded ? 'flex-1 min-w-[400px]' : 'w-auto min-w-[50px]'}`}
          >
            <CodeEditor value={script} onChange={setScript} />
          </CollapsiblePanel>
          
          {/* Preview Panel */}
          <CollapsiblePanel
            id="preview-panel"
            title="Diagram Preview"
            icon={<Image className="w-5 h-5 text-purple-400" aria-label="Diagram Preivew"/>}
            defaultExpanded={previewExpanded}
            onToggle={setPreviewExpanded}
            className={`transition-all duration-300 ${
              // Properly handle the collapsed state
              !previewExpanded ? 'w-auto min-w-[50px]' :
              // If both other panels are collapsed, take up most space
              (!chatExpanded && !editorExpanded) ? 'flex-1' :
              // If one other panel is collapsed, take up more space
              (!chatExpanded || !editorExpanded) ? 'w-2/3' :
              // Default state
              'w-1/3 min-w-[300px]'
            }`}
          >
            <Preview 
              content={script} 
              expandedView={previewExpanded && (!chatExpanded || !editorExpanded)}
            />
          </CollapsiblePanel>
        </div>
      )}
    </div>
  )
}
````

## File: next.config.ts
````typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  
  /* config options here */
};

export default nextConfig;
````

## File: README.md
````markdown
# Model Mind

Model Mind is a web application designed to assist users in modeling systems through an interactive chatbox. The chatbox guides users by asking questions to help them define their system. Based on the user's responses, the AI agent generates a model in PlantUML format.

Users can manually modify the generated code, view a live preview of the diagram, and continue refining the model with AI assistance.

---

## Features

- **AI-Powered Chat Assistant**: Guides users in creating and modifying PlantUML diagrams.
- **Code Editor**: Allows users to manually edit the PlantUML script with syntax highlighting.
- **Live Preview**: Displays real-time updates of the PlantUML diagram as users make changes.
- **Command Support**: Use commands like `@clear` to reset the chat or `@reset` to clear the diagram.
- **Customizable Themes**: Dark mode and TailwindCSS-based styling for a modern UI. (in progress)

---

## Getting Started

### Prerequisites

Ensure you have the following installed:

- Node.js (v18 or higher)
- npm, yarn, pnpm, or bun (for package management)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/modelmind-v1.git
   cd modelmind-v1
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. Create a `.env` file in the root directory and add your OpenAI API key:

   ```env
   OPENAI_API_KEY=your_openai_api_key
   ```

### Running the Development Server

Start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

---

## Usage

1. **Chat Assistant**: Use the chat interface to describe your system or request modifications to the diagram.
2. **Code Editor**: Edit the PlantUML script directly in the code editor.
3. **Live Preview**: View the updated diagram in the preview panel.

### Commands

- `@clear`: Clears the chat history.
- `@reset`: Resets the PlantUML diagram to an empty state.

---

## Project Structure

```
.
├── app/
│   ├── api/               # API routes for chat and OpenAI integration
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Main page component
├── components/
│   ├── chat-interface/    # Chat assistant components
│   ├── code-editor/       # Code editor components
│   ├── preview/           # Diagram preview components
│   └── ui/                # Reusable UI components
├── lib/
│   └── utils/             # Utility functions (e.g., PlantUML encoding)
├── public/                # Static assets
├── .env                   # Environment variables
├── package.json           # Project metadata and dependencies
└── README.md              # Project documentation
```

---

## Technologies Used

- **Frontend**: React, Next.js, TailwindCSS
- **Editor**: Monaco Editor
- **AI Integration**: OpenAI API
- **Diagram Generation**: PlantUML

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Commit your changes and push the branch.
4. Submit a pull request.

---

## License

The project is licensed under the [MIT license](./LICENSE).

---

## Acknowledgments

- [OpenAI](https://openai.com/) for the GPT models.
- [PlantUML](https://plantuml.com/) for diagram generation.
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) for the code editor.
- [TailwindCSS](https://tailwindcss.com/) for styling.
````

## File: tailwind.config.ts
````typescript
import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
````

## File: tsconfig.json
````json
{
  "compilerOptions": {
    "noImplicitAny": false,
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"],  
}
````

## File: package.json
````json
{
  "name": "modelmind-v1",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@ai-sdk/openai": "^1.1.0",
    "@langchain/core": "^0.3.43",
    "@langchain/openai": "^0.5.2",
    "@monaco-editor/react": "^4.7.0",
    "@radix-ui/react-accordion": "^1.2.2",
    "@radix-ui/react-popover": "^1.1.6",
    "@radix-ui/react-scroll-area": "^1.2.2",
    "@radix-ui/react-slot": "^1.1.1",
    "@radix-ui/react-tabs": "^1.1.4",
    "ai": "^4.1.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "dotenv": "^16.4.7",
    "file-saver": "^2.0.5",
    "langchain": "^0.3.19",
    "lucide-react": "^0.473.0",
    "next": "15.1.6",
    "openai": "^4.80.0",
    "plantuml-encoder": "^1.4.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-resizable": "^3.0.5",
    "react-use": "^17.6.0",
    "react-zoom-pan-pinch": "^3.7.0",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "winston": "^3.17.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3",
    "@types/node": "^20",
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.1",
    "eslint": "^9",
    "eslint-config-next": "15.1.6",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
````
