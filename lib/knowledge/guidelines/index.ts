import fs from 'fs';
import path from 'path';
import { Document } from 'langchain/document';
import { TextLoader } from 'langchain/document_loaders/fs/text';


// Define diagram types
export type DiagramType = 'sequence' | 'class' | 'activity' | 'state' | 'component' | 'use-case' | 'entity-relationship' | 'deployment';

/**
 * Reads the specified guideline file for a diagram type.
 * @param diagramType The type of diagram to get guidelines for
 * @returns The guideline content as a string
 */
export async function readGuidelines(diagramType: DiagramType): Promise<string> {
  try {
    const filePath = path.join(process.cwd(), `lib/knowledge/guidelines/${diagramType}.md`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`No guidelines file found for diagram type: ${diagramType}`);
      return `No specific guidelines available for ${diagramType} diagrams.`;
    }
    
    // Use TextLoader from LangChain to load the markdown file
    const loader = new TextLoader(filePath);
    const docs = await loader.load();
    
    // If there's content, return it
    if (docs.length > 0) {
      return docs[0].pageContent;
    }
    
    return `No specific guidelines available for ${diagramType} diagrams.`;
  } catch (error) {
    console.error(`Error reading guidelines for ${diagramType}:`, error);
    return `Error loading guidelines for ${diagramType} diagrams.`;
  }
}

/**
 * Gets all available guidelines as documents that can be used for retrieval.
 * Useful for RAG (Retrieval Augmented Generation) approaches.
 */
export async function getAllGuidelinesAsDocuments(): Promise<Document[]> {
  const guidelineFiles = [
    'sequence.md',
    'class.md',
    'activity.md',
    'state.md',
    'component.md',
    'use-case.md',
    'entity-relationship.md',
    'deployment.md'
  ];
  
  const documents: Document[] = [];
  
  for (const file of guidelineFiles) {
    try {
      const filePath = path.join(process.cwd(), `lib/knowledge/guidelines/${file}`);
      
      if (fs.existsSync(filePath)) {
        const loader = new TextLoader(filePath);
        const docs = await loader.load();
        documents.push(...docs);
      }
    } catch (error) {
      console.error(`Error loading ${file}:`, error);
    }
  }
  
  return documents;
}

/**
 * Gets guidelines for a specific aspect of a diagram type
 * @param diagramType The type of diagram
 * @param aspect The specific aspect to get guidelines for (e.g., 'styling', 'best-practices')
 * @returns The guidelines for the specified aspect
 */
export async function getGuidelinesForAspect(
  diagramType: DiagramType,
  aspect: string
): Promise<string> {
  const fullGuidelines = await readGuidelines(diagramType);
  
  // Simple regex-based section extraction
  // This could be enhanced with more sophisticated parsing
  const sectionRegex = new RegExp(`## ${aspect}\\s*([\\s\\S]*?)(?=##|$)`, 'i');
  const match = fullGuidelines.match(sectionRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  return `No specific guidelines for ${aspect} in ${diagramType} diagrams.`;
}

