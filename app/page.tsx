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