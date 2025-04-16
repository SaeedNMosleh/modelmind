"use client"

import { useEffect, useRef } from "react"
import { Editor, useMonaco, loader } from "@monaco-editor/react"
import { Card, CardContent } from "@/components/ui/card"
import { isValidPlantUML } from "@/lib/utils/plantuml"
import type { editor } from 'monaco-editor'

// Configure Monaco loader with default dark theme
// Note: Using 'as any' to avoid TypeScript errors with the config structure
loader.config({
  'vs/nls': { availableLanguages: { '*': 'en' } },
  // Force dark theme before editor initialization  
  'vs/editor/editor.main': { theme: 'vs-dark' }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
}

export function CodeEditor({ value, onChange }: CodeEditorProps) {
  const monaco = useMonaco()
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  
  // Register PlantUML language and theme once Monaco is loaded
  useEffect(() => {
    if (monaco) {
      // Define VS Code-like theme
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
      
      // Set the theme immediately (this is important)
      monaco.editor.setTheme('vscodeTheme');
      
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
      }
    }
  }, [monaco]);

  // Handle editor mounting with proper type
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    // Force theme application again after mount
    if (monaco) {
      monaco.editor.setTheme('vscodeTheme');
    }
    
    // Set editor options
    editor.updateOptions({
      padding: {
        top: 16,
        bottom: 16
      },
      fontLigatures: true,
    });
    
    // Add keyboard shortcut for diagram refresh (Ctrl+Enter)
    if (monaco) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        // Trigger a change event to update the preview
        onChange(editor.getValue());
      });
    }
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
      <CardContent className="p-0 flex-1 overflow-hidden monaco-dark-container">
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
            minimap: { enabled: false },
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
          beforeMount={(monaco) => {
            monaco.editor.setTheme('vscodeTheme');
          }}
          onMount={handleEditorDidMount}
          loading={<div className="w-full h-full flex items-center justify-center bg-[#1E1E1E] text-gray-400">Loading editor...</div>}
          className="monaco-dark-theme"
        />
      </CardContent>
    </Card>
  )
}