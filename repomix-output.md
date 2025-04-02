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
components/ui/input.tsx
components/ui/popover.tsx
components/ui/scroll-area.tsx
components/ui/textarea.tsx
eslint.config.mjs
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

import { useChat } from "ai/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { useCallback, useState, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"

interface ChatInterfaceProps {
  onScriptGenerated: (script: string) => void
  currentScript: string
}

export function ChatInterface({ onScriptGenerated, currentScript }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<{ id: string; role: string; content: string }[]>([])
  const [rows, setRows] = useState(3)
  const [showCommands, setShowCommands] = useState(false)
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)

  const lineHeight = 24 // adjust as needed, it's chosen arbitrarily 
  const minRows = 3 // minimum number of rows
  const maxRows = 10 // maximum number of rows

  const { input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chatopenai",
    body: {
      currentScript,
    },
    onResponse: async (response) => {
      try {
        const text = await response.text()
        console.log("Response text:", text)
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

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const commandsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [scrollAreaRef.current]) 

  const commands: { [key: string]: () => void } = {
    "@clear": () => {
      setMessages([])
      handleInputChange({ target: { value: "" } } as React.ChangeEvent<HTMLTextAreaElement>)
    },
    "@reset": () => {
      onScriptGenerated("")
      handleInputChange({ target: { value: "" } } as React.ChangeEvent<HTMLTextAreaElement>)
    },
    
  }

  const commandList = Object.keys(commands)

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
    [input, handleSubmit, commandList, commands],
  )

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e)
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
        onSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
      } else if (e.key === "Escape") {
        setShowCommands(false)
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
    }
  }

/*   // Wrap commands (words starting with "@") in styled spans
  const highlightText = (text: string) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/(@\w+)/g, '<span class="bg-blue-100 text-blue-800 rounded">$1</span>')
  }
 */

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
    boxSizing: "border-box", // Ensures padding doesn’t offset alignment
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
        </ScrollArea>
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2">
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
              onChange={handleTextareaChange}
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
          <Button type="submit" className="self-end">
            Send
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
````

## File: components/code-editor/code-editor.tsx
````typescript
"use client"

import { Editor } from "@monaco-editor/react"
import { Card } from "@/components/ui/card"

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
}

export function CodeEditor({ value, onChange }: CodeEditorProps) {
  return (
    <Card className="h-full">
      <Editor
        height="600px"
        defaultLanguage="plantuml"
        value={value}
        onChange={(value) => onChange(value || "")}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          rulers: [],
          wordWrap: "on",
          theme: "vs-dark",
        }}
      />
    </Card>
  )
}
````

## File: components/preview/preview.tsx
````typescript
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { getPlantUMLPreviewURL } from "@/lib/utils/plantuml"

interface PreviewProps {
  content: string
}

export function Preview({ content }: PreviewProps) {
  const previewUrl = getPlantUMLPreviewURL(content)

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="w-full h-[600px] overflow-auto">
          <img src={previewUrl || "/placeholder.svg"} alt="PlantUML Diagram" className="max-w-full" />
        </div>
      </CardContent>
    </Card>
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

export function getPlantUMLPreviewURL(content: string): string {
  const encoded = encode(content)
  return `${PLANTUML_SERVER}/svg/${encoded}`
}

export const DEFAULT_PLANTUML = `@startuml
Bob -> Alice : hello
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

## File: app/globals.css
````css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: Arial, Helvetica, sans-serif;
}

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
    --radius: 0.5rem;
  }
  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --card: 0 0% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 14.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 14.9%;
    --input: 0 0% 14.9%;
    --ring: 0 0% 83.1%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
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
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ backgroundImage: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
      >
        <header className= "text-white p-4 text-center text-6xl font-bold">
          Model Mind
        </header>
        {children}
      </body>
    </html>
  );
}
````

## File: app/page.tsx
````typescript
"use client"

import { useState } from "react"
import { ChatInterface } from "@/components/chat-interface/chat-interface"
import { CodeEditor } from "@/components/code-editor/code-editor"
import { Preview } from "@/components/preview/preview"
import { DEFAULT_PLANTUML } from "@/lib/utils/plantuml"

export default function Home() {
  const [script, setScript] = useState(DEFAULT_PLANTUML)

  return (
    <main className="container mx-5 py-4 flex gap-10 justify-center items-center">
      <div className="flex gap-5 justify-center w-full">
        <div className="flex-1 min-w-0">
          <h2>Chat Assistant</h2>
          <ChatInterface onScriptGenerated={setScript} currentScript={script} />
        </div>

        <div className="flex-1 min-w-0">
          <h2>Code Editor</h2>
          <CodeEditor value={script} onChange={setScript} />
        </div>

        <div className="flex-1 min-w-0">
          <h2>Preview</h2>
          <Preview content={script} />
        </div>
      </div>
    </main>
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
    "@monaco-editor/react": "^4.7.0",
    "@radix-ui/react-accordion": "^1.2.2",
    "@radix-ui/react-popover": "^1.1.6",
    "@radix-ui/react-scroll-area": "^1.2.2",
    "@radix-ui/react-slot": "^1.1.1",
    "ai": "^4.1.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "dotenv": "^16.4.7",
    "lucide-react": "^0.473.0",
    "next": "15.1.6",
    "openai": "^4.80.0",
    "plantuml-encoder": "^1.4.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
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
