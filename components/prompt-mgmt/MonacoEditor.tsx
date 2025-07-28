'use client';

import React, { useRef, useEffect } from 'react';
import { Editor, Monaco } from '@monaco-editor/react';
import { TemplateValidationResult } from '@/lib/prompt-mgmt/types';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  validationResult?: TemplateValidationResult | null;
  height?: string;
  language?: string;
  theme?: string;
  options?: any;
  readOnly?: boolean;
}

export function MonacoEditor({
  value,
  onChange,
  validationResult,
  height = '300px',
  language = 'text',
  theme = 'vs',
  options = {},
  readOnly = false
}: MonacoEditorProps) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  
  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Register a custom language for prompt templates
    monaco.languages.register({ id: 'prompt-template' });
    
    // Define syntax highlighting for prompt templates
    monaco.languages.setMonarchTokensProvider('prompt-template', {
      tokenizer: {
        root: [
          // Variable syntax highlighting
          [/\{[^}]+\}/, 'variable'],
          // Comments (if using #)
          [/#.*$/, 'comment'],
          // Strings in quotes
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string_double'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/'/, 'string', '@string_single'],
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
    
    // Define theme colors
    monaco.editor.defineTheme('prompt-template-theme', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'variable', foreground: '0066cc', fontStyle: 'bold' },
        { token: 'comment', foreground: '008000', fontStyle: 'italic' },
        { token: 'string', foreground: 'a31515' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#000000',
        'editorLineNumber.foreground': '#999999',
        'editor.selectionBackground': '#add6ff',
        'editor.inactiveSelectionBackground': '#e5ebf1'
      }
    });
    
    // Set the theme and language for prompt templates
    if (language === 'text') {
      monaco.editor.setModelLanguage(editor.getModel()!, 'prompt-template');
      monaco.editor.setTheme('prompt-template-theme');
    }
    
    // Configure auto-completion for common prompt patterns
    monaco.languages.registerCompletionItemProvider('prompt-template', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };
        
        return {
          suggestions: [
            {
              label: 'variable',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '{${1:variableName}}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Insert a template variable',
              range
            },
            {
              label: 'instruction',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'You are a ${1:role}. ${2:instruction}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Basic instruction template',
              range
            },
            {
              label: 'context',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'Context: {context}\n\nTask: ${1:task}\n\nRequirements:\n- ${2:requirement}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Context and task template',
              range
            },
            {
              label: 'plantuml',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'Generate a PlantUML {diagramType} diagram for:\n{description}\n\nRequirements:\n- Use proper PlantUML syntax\n- Include relevant details\n- Follow best practices for {diagramType} diagrams',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'PlantUML diagram generation template',
              range
            }
          ]
        };
      }
    });
    
    // Configure hover information for variables
    monaco.languages.registerHoverProvider('prompt-template', {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position);
        if (word && validationResult) {
          const variable = validationResult.variables.find(v => v.name === word.word);
          if (variable) {
            return {
              range: new monaco.Range(
                position.lineNumber,
                word.startColumn,
                position.lineNumber,
                word.endColumn
              ),
              contents: [
                { value: `**${variable.name}** (${variable.type})` },
                { value: variable.description || 'Template variable' },
                { value: variable.required ? '*Required*' : '*Optional*' }
              ]
            };
          }
        }
        return null;
      }
    });
  };
  
  // Update markers when validation results change
  useEffect(() => {
    if (editorRef.current && monacoRef.current && validationResult) {
      const model = editorRef.current.getModel();
      if (model) {
        const markers = [
          ...validationResult.errors.map(error => ({
            startLineNumber: error.line,
            startColumn: error.column,
            endLineNumber: error.line,
            endColumn: error.column + 10, // Approximate length
            message: error.message,
            severity: monacoRef.current!.MarkerSeverity.Error
          })),
          ...validationResult.warnings.map(warning => ({
            startLineNumber: warning.line,
            startColumn: warning.column,
            endLineNumber: warning.line,
            endColumn: warning.column + 10,
            message: warning.message,
            severity: monacoRef.current!.MarkerSeverity.Warning
          }))
        ];
        
        monacoRef.current.editor.setModelMarkers(model, 'template-validation', markers);
      }
    }
  }, [validationResult]);
  
  const handleChange = (value: string | undefined) => {
    onChange(value || '');
  };
  
  const defaultOptions = {
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly,
    cursorStyle: 'line',
    automaticLayout: true,
    wordWrap: 'on',
    wrappingIndent: 'indent',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineHeight: 20,
    tabSize: 2,
    insertSpaces: true,
    detectIndentation: false,
    folding: true,
    foldingHighlight: true,
    bracketMatching: 'always',
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    autoSurround: 'languageDefined',
    contextmenu: true,
    quickSuggestions: {
      other: true,
      comments: false,
      strings: false
    },
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnCommitCharacter: true,
    acceptSuggestionOnEnter: 'on',
    accessibilitySupport: 'auto',
    ...options
  };
  
  return (
    <div className="border border-gray-200 rounded-md overflow-hidden">
      <Editor
        height={height}
        language={language}
        theme={theme}
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={defaultOptions}
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading editor...</div>
          </div>
        }
      />
    </div>
  );
}