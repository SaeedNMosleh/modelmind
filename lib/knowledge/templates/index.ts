import fs from 'fs';
import path from 'path';

// Define diagram types
export type DiagramType = 'sequence' | 'class' | 'activity' | 'state' | 'component' | 'use-case' | 'entity-relationship' | 'deployment';

/**
 * Gets the template content for a specific diagram type
 * @param diagramType The type of diagram to get the template for
 * @returns The content of the template file, or empty string if not found
 */
export async function getTemplate(diagramType: DiagramType): Promise<string> {
  try {
    const filePath = path.join(
      process.cwd(), 
      `lib/knowledge/templates/${diagramType}.puml`
    );
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`Template not found for diagram type: ${diagramType}`);
      return '';
    }
    
    // Read the template file
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`Error reading template for ${diagramType}:`, error);
    return '';
  }
}