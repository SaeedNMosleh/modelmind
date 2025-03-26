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