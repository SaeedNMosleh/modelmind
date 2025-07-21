"use client"

import { useEffect, useRef } from "react"
import { Editor, useMonaco, loader } from "@monaco-editor/react"
import { Card, CardContent } from "@/components/ui/card"
// import { isValidPlantUML } from "@/lib/utils/plantuml" // Removed as not used
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
          // PlantUML specific syntax highlighting - VSCode style
          { token: 'keyword.control', foreground: 'C586C0', fontStyle: 'bold' },     // Purple for control flow
          { token: 'keyword.directive', foreground: 'C586C0', fontStyle: 'italic' }, // Purple for preprocessor
          { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },             // Blue for keywords
          { token: 'keyword.operator', foreground: 'D4D4D4', fontStyle: 'bold' },    // White for arrows/operators
          { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },           // Green for comments
          { token: 'comment.block', foreground: '6A9955', fontStyle: 'italic' },     // Green for block comments
          { token: 'string', foreground: 'CE9178' },                                 // Orange for strings
          { token: 'string.other', foreground: '4EC9B0' },                           // Teal for HTML-like tags
          { token: 'string.invalid', foreground: 'F44747' },                         // Red for invalid strings
          { token: 'tag', foreground: '4EC9B0', fontStyle: 'bold' },                 // Teal for tags
          { token: 'type', foreground: '4EC9B0' },                                   // Teal for stereotypes
          { token: 'constant.numeric', foreground: '4FC1FF' },                       // Light blue for colors
          { token: 'number', foreground: 'B5CEA8' },                                 // Light green for numbers
          { token: 'identifier', foreground: '9CDCFE' },                             // Light blue for identifiers
          { token: 'delimiter', foreground: 'D4D4D4' },                              // Light gray for delimiters
          { token: 'operator', foreground: 'D4D4D4' },                               // Light gray for operators
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
        
        // Set language configuration for proper bracket matching, auto-closing, etc.
        monaco.languages.setLanguageConfiguration('plantuml', {
          comments: {
            lineComment: "//",
            blockComment: ["/*", "*/"]
          },
          brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['<<', '>>']
          ],
          autoClosingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
            { open: "'", close: "'" },
            { open: '<<', close: '>>' },
            { open: '<', close: '>' }
          ],
          surroundingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
            { open: "'", close: "'" },
            { open: '<', close: '>' }
          ],
          folding: {
            markers: {
              start: /@start(uml|mindmap|wbs|salt|sequence|activity|class|object|component|state|deployment|timing|network|yaml|json|gantt)/,
              end: /@end(uml|mindmap|wbs|salt|sequence|activity|class|object|component|state|deployment|timing|network|yaml|json|gantt)/
            }
          },
          indentationRules: {
            increaseIndentPattern: /^.*(\{|\(|\[|<<|note\s+(left|right|top|bottom)|alt|else|opt|loop|par|break|critical|group).*$/,
            decreaseIndentPattern: /^.*(\}|\)|\]|>>|end\s+(note|alt|else|opt|loop|par|break|critical|group)).*$/
          }
        })
        
        // Add basic completion provider for PlantUML keywords
        monaco.languages.registerCompletionItemProvider('plantuml', {
          provideCompletionItems: () => {
            const word = { startColumn: 1, endColumn: 1, startLineNumber: 1, endLineNumber: 1 }
            const suggestions = [
              // Diagram start/end
              { label: '@startuml', kind: monaco.languages.CompletionItemKind.Keyword, insertText: '@startuml\n\n@enduml', detail: 'Start UML diagram', range: word },
              { label: '@enduml', kind: monaco.languages.CompletionItemKind.Keyword, insertText: '@enduml', detail: 'End UML diagram', range: word },
              
              // Common entities
              { label: 'actor', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'actor ${1:name}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: word },
              { label: 'participant', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'participant ${1:name}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: word },
              { label: 'database', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'database ${1:name}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: word },
              { label: 'class', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'class ${1:Name} {\n\t${2}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: word },
              
              // Arrows
              { label: '-->', kind: monaco.languages.CompletionItemKind.Operator, insertText: '-->', detail: 'Solid arrow', range: word },
              { label: '->>', kind: monaco.languages.CompletionItemKind.Operator, insertText: '->>', detail: 'Async message', range: word },
              { label: '<--', kind: monaco.languages.CompletionItemKind.Operator, insertText: '<--', detail: 'Return message', range: word },
              
              // Control structures
              { label: 'alt', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'alt ${1:condition}\n\t${2}\nelse\n\t${3}\nend', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: word },
              { label: 'loop', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'loop ${1:condition}\n\t${2}\nend', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: word },
              { label: 'note', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'note ${1|left,right,over|} : ${2:note text}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: word },
              
              // Common modifiers
              { label: 'activate', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'activate ${1:participant}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: word },
              { label: 'deactivate', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'deactivate ${1:participant}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: word }
            ]
            
            return { suggestions }
          }
        })
        
        // Define VS Code-like syntax highlighting rules for PlantUML
        monaco.languages.setMonarchTokensProvider('plantuml', {
          defaultToken: '',
          ignoreCase: true,
          tokenizer: {
            root: [
              // Start/End tags
              [/@(start|end)(uml|mindmap|wbs|salt|sequence|activity|class|object|component|state|deployment|timing|network|yaml|json|gantt)\b/, 'keyword.control'],
              
              // PlantUML specific keywords
              [/\b(actor|participant|database|boundary|control|entity|collections|queue|usecase|class|interface|enum|annotation|abstract|package|namespace|state|object|artifact|folder|rectangle|card|cloud|file|node|frame|storage|agent|stack)\b/, 'keyword'],
              
              // Control flow and modifiers
              [/\b(together|as|left|right|of|on|link|note|ref|autonumber|title|end\s+title|end\s+note|legend|end\s+legend|skinparam|scale|top|bottom|across|over|activate|deactivate|destroy|create|hide|show|remove)\b/, 'keyword'],
              
              // Sequence diagram specific
              [/\b(alt|else|opt|loop|par|break|critical|group|end|return)\b/, 'keyword.control'],
              
              // Colors and styling
              [/\b(color|back|line)\b/, 'keyword'],
              
              // Preprocessor directives
              [/!(include|pragma|define|undef|ifdef|ifndef|endif)\b/, 'keyword.directive'],
              
              // Comments
              [/\'.*$/, 'comment'],
              [/\/\/.*$/, 'comment'],
              [/\/\*/, 'comment.block', '@comment'],
              
              // Strings
              [/"([^"\\]|\\.)*$/, 'string.invalid'],
              [/"/, 'string', '@string_double'],
              [/'([^'\\]|\\.)*$/, 'string.invalid'],
              [/'/, 'string', '@string_single'],
              
              // Numbers
              [/\b\d+(\.\d+)?\b/, 'number'],
              
              // Arrows and relationships - comprehensive patterns
              [/(-+>|<-+|<->|<<-+|>>-+|-+>>|-+<<|\|>|<\||\*-+|-+\*|o-+|-+o|\.-+|-+\.|=+>|<=+|<=>|#-+|-+#)/, 'keyword.operator'],
              [/(\.+>|<\.+|\.+\||\.+\.|::|:>|<:|\|\||--|==|##)/, 'keyword.operator'],
              
              // Color codes
              [/#[0-9a-fA-F]{3,8}\b/, 'constant.numeric'],
              
              // Tags and styling
              [/<(color|size|b|i|u|s|back|img)([^>]*)>/, 'tag'],
              [/<\/?(color|size|b|i|u|s|back|img)>/, 'tag'],
              [/<[^>]+>/, 'string.other'],
              
              // Stereotypes
              [/<<[^>]+>>/, 'type'],
              
              // Identifiers with special characters
              [/\w+/, 'identifier'],
              
              // Delimiters
              [/[\[\]{}():;,]/, 'delimiter'],
              
              // Operators
              [/[=+\-*\/]/, 'operator'],
            ],
            
            comment: [
              [/[^\/*]+/, 'comment'],
              [/\/\*/, 'comment', '@push'],
              [/\*\//, 'comment', '@pop'],
              [/[\/*]/, 'comment']
            ],
            
            string_double: [
              [/[^\\"]+/, 'string'],
              [/\\./, 'string.escape.invalid'],
              [/"/, 'string', '@pop']
            ],
            
            string_single: [
              [/[^\\']+/, 'string'],
              [/\\./, 'string.escape.invalid'],
              [/'/, 'string', '@pop']
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
  
  // Track decoration IDs to properly manage them
  const decorationIdsRef = useRef<string[]>([])
  
  // Handle editor change without problematic validation decorations
  const handleEditorChange = (value: string | undefined) => {
    const newValue = value || "";
    onChange(newValue);
    
    // Clear any existing decorations that might be causing issues
    if (editorRef.current && monaco && decorationIdsRef.current.length > 0) {
      editorRef.current.deltaDecorations(decorationIdsRef.current, []);
      decorationIdsRef.current = [];
    }
    
    // Optional: You can add subtle validation indicators here if needed
    // For now, we'll rely on the preview panel to show validation errors
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
            // Font settings to match VSCode
            fontFamily: "'Cascadia Code', 'Consolas', 'Courier New', monospace",
            fontSize: 14,
            fontWeight: "400",
            lineHeight: 1.4,
            fontLigatures: true,
            
            // Line settings
            lineNumbers: "on",
            lineNumbersMinChars: 3,
            renderLineHighlight: "all",
            
            // Editor behavior
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            wordWrapColumn: 120,
            tabSize: 2,
            insertSpaces: true,
            automaticLayout: true,
            
            // Code folding (now with proper language configuration)
            folding: true,
            foldingHighlight: true,
            showFoldingControls: 'mouseover',
            
            // Bracket matching
            matchBrackets: "always",
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoSurround: "languageDefined",
            
            // Cursor and selection
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            cursorStyle: "line",
            cursorWidth: 2,
            
            // Scrolling
            smoothScrolling: true,
            mouseWheelScrollSensitivity: 1,
            
            // IntelliSense and suggestions
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnCommitCharacter: true,
            acceptSuggestionOnEnter: "on",
            
            // Indentation guides
            renderIndentGuides: true,
            highlightActiveIndentGuide: true,
            
            // Whitespace
            renderWhitespace: "selection",
            
            // Scrollbar
            scrollbar: {
              verticalScrollbarSize: 12,
              horizontalScrollbarSize: 12,
              verticalSliderSize: 12,
              horizontalSliderSize: 12,
              alwaysConsumeMouseWheel: false,
            },
            
            // Selection
            selectionHighlight: true,
            occurrencesHighlight: "off",
            codeLens: false,
            
            // Accessibility
            accessibilitySupport: "auto",
            
            // Performance
            disableMonospaceOptimizations: false,
            
            // Validation
            parameterHints: {
              enabled: true,
              cycle: false
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