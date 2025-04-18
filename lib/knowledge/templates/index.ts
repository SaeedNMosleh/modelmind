import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Define diagram types
export type DiagramType = 'sequence' | 'class' | 'activity' | 'state' | 'component' | 'use-case';

/**
 * Interface representing a template metadata
 */
export interface TemplateInfo {
  name: string;
  description: string;
  tags: string[];
  filePath: string;
  diagramType: DiagramType;
}

/**
 * Gets a specific template by diagram type and template name
 * @param diagramType The type of diagram
 * @param templateName The name of the template to retrieve
 * @returns The content of the template file
 */
export async function getTemplate(diagramType: DiagramType, templateName: string): Promise<string> {
  try {
    const filePath = path.join(
      process.cwd(), 
      `lib/knowledge/templates/${diagramType}/${templateName}.puml`
    );
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`Template not found: ${templateName} for ${diagramType}`);
      return '';
    }
    
    // Read the template file
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`Error reading template ${templateName} for ${diagramType}:`, error);
    return '';
  }
}

/**
 * Lists all available templates for a specific diagram type
 * @param diagramType The type of diagram
 * @returns Array of template information objects
 */
export async function listTemplates(diagramType: DiagramType): Promise<TemplateInfo[]> {
  try {
    const templatesDir = path.join(process.cwd(), `lib/knowledge/templates/${diagramType}`);
    
    // Check if directory exists
    if (!fs.existsSync(templatesDir)) {
      return [];
    }
    
    // Find all .puml files in the directory
    const templateFiles = await glob(`${templatesDir}/*.puml`);
    
    // Process each file to extract metadata
    const templates: TemplateInfo[] = [];
    
    for (const file of templateFiles) {
      const content = await fs.promises.readFile(file, 'utf-8');
      const fileName = path.basename(file, '.puml');
      
      // Extract description and tags from comments in the template
      const descriptionMatch = content.match(/'*\s*Description:\s*(.*)/i);
      const tagsMatch = content.match(/'*\s*Tags:\s*(.*)/i);
      
      templates.push({
        name: fileName,
        description: descriptionMatch ? descriptionMatch[1].trim() : `${fileName} template`,
        tags: tagsMatch ? tagsMatch[1].split(',').map(t => t.trim()) : [],
        filePath: file,
        diagramType
      });
    }
    
    return templates;
  } catch (error) {
    console.error(`Error listing templates for ${diagramType}:`, error);
    return [];
  }
}

/**
 * Searches for templates across all diagram types based on a keyword
 * @param keyword The keyword to search for in template names, descriptions or tags
 * @returns Array of matching template information objects
 */
export async function searchTemplates(keyword: string): Promise<TemplateInfo[]> {
  const diagramTypes: DiagramType[] = ['sequence', 'class', 'activity', 'state', 'component', 'use-case'];
  const results: TemplateInfo[] = [];
  
  for (const type of diagramTypes) {
    const templates = await listTemplates(type);
    const matches = templates.filter(template => 
      template.name.toLowerCase().includes(keyword.toLowerCase()) ||
      template.description.toLowerCase().includes(keyword.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(keyword.toLowerCase()))
    );
    
    results.push(...matches);
  }
  
  return results;
}

/**
 * Gets a template by a relevant use case
 * @param useCase The use case to find templates for (e.g., "authentication", "data flow")
 * @returns The most relevant template for the use case, or empty string if none found
 */
export async function getTemplateForUseCase(useCase: string): Promise<string> {
  // Search all templates for matching use case
  const matchingTemplates = await searchTemplates(useCase);
  
  if (matchingTemplates.length > 0) {
    // Sort by relevance (here we just take the first match)
    // In a real implementation, this could be more sophisticated
    const bestMatch = matchingTemplates[0];
    return getTemplate(bestMatch.diagramType, bestMatch.name);
  }
  
  return '';
}

