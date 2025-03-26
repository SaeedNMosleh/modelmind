import { encode } from "plantuml-encoder"

export const PLANTUML_SERVER = "https://www.plantuml.com/plantuml"

export function getPlantUMLPreviewURL(content: string): string {
  const encoded = encode(content)
  return `${PLANTUML_SERVER}/svg/${encoded}`
}

export const DEFAULT_PLANTUML = `@startuml
Bob -> Alice : hello
@enduml`
