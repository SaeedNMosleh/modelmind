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
            className={`transition-all duration-300 ${chatExpanded ? 'w-1/5 min-w-[250px]' : 'w-auto min-w-[50px]'}`}
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
              (!chatExpanded || !editorExpanded) ? 'w-3/5' :
              // Default state - increased from w-1/3 to w-2/5
              'w-2/5 min-w-[300px]'
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