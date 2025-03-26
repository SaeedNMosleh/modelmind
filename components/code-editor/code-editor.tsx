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

