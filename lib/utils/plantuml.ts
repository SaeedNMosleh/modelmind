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