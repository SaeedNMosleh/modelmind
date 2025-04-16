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