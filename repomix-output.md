This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

## Additional Info

# Directory Structure
```
.gitignore
app/api/chat/route.ts
app/api/chatopenai/route.ts
app/api/pipeline/route.ts
app/globals.css
app/layout.tsx
app/page.tsx
components.json
components/chat-interface/chat-interface.tsx
components/code-editor/code-editor.tsx
components/preview/preview.tsx
components/ui/accordion.tsx
components/ui/badge.tsx
components/ui/button.tsx
components/ui/card.tsx
components/ui/input.tsx
components/ui/popover.tsx
components/ui/scroll-area.tsx
components/ui/textarea.tsx
eslint.config.mjs
lib/ai-pipeline/agents/analyzer.ts
lib/ai-pipeline/agents/generator.ts
lib/ai-pipeline/agents/modifier.ts
lib/ai-pipeline/baseChain.ts
lib/ai-pipeline/contextManager.ts
lib/ai-pipeline/inputProcessor.ts
lib/ai-pipeline/responseFormatter.ts
lib/ai-pipeline/taskRouter.ts
lib/ai-pipeline/types.ts
lib/knowledge/guidelines/class.md
lib/knowledge/guidelines/index.ts
lib/knowledge/guidelines/sequence.md
lib/knowledge/index.ts
lib/knowledge/templates/class/repository-pattern.puml
lib/knowledge/templates/index.ts
lib/knowledge/templates/sequence/authnetication.puml
lib/knowledge/templates/sequence/crud.pluml
lib/utils.ts
lib/utils/openAIStreaming.ts
lib/utils/plantuml.ts
LICENSE.md
next.config.ts
package.json
postcss.config.mjs
public/file.svg
public/globe.svg
public/next.svg
public/vercel.svg
public/window.svg
README.md
tailwind.config.ts
tsconfig.json
vscode-style-terminal-tabs-plantuml.svg
```

# Files

## File: lib/knowledge/guidelines/class.md
````markdown
# Class Diagram Guidelines

## Basic Principles
- Use class diagrams to show the structure of a system
- Classes should represent distinct concepts or entities
- Relationships show how classes interact or relate
- Attributes and methods should be relevant to the domain

## Best Practices
- Keep class names singular and nouns (e.g., "Customer" not "Customers")
- Use proper visibility markers (+, -, #, ~)
- Organize classes in logical groups
- Avoid deep inheritance hierarchies (prefer composition)
- Include only essential attributes and methods

## Styling Recommendations
- Use consistent naming conventions
- Group related classes with packages
- Use colors to distinguish different types of classes
- Position associated classes near each other
````

## File: lib/knowledge/guidelines/index.ts
````typescript
import fs from 'fs';
import path from 'path';
import { Document } from 'langchain/document';
import { TextLoader } from 'langchain/document_loaders/fs/text';


// Define diagram types
export type DiagramType = 'sequence' | 'class' | 'activity' | 'state' | 'component' | 'use-case';

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
    'use-case.md'
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
````

## File: lib/knowledge/guidelines/sequence.md
````markdown
# Sequence Diagram Guidelines

## Basic Principles
- Use sequence diagrams to show interactions between objects over time
- Time flows from top to bottom
- Participants should be arranged left to right in order of first interaction
- Keep diagrams focused on a single scenario or use case

## Best Practices
- Limit diagram to 5-7 participants for readability
- Use activation bars to clearly show when participants are active
- Include return messages for clarity
- Use notes to explain complex logic or conditions
- Group related messages with boxes or alt/opt fragments

## Styling Recommendations
- Use colors consistently (actors one color, systems another)
- Add titles to clearly identify the scenario
- Consider using skinparam to customize appearance
- Use numbered messages for complex diagrams
````

## File: lib/knowledge/index.ts
````typescript
import { readGuidelines } from './guidelines';
import { getTemplate } from './templates'

export {
  readGuidelines,
  getTemplate
};
````

## File: lib/knowledge/templates/class/repository-pattern.puml
````
@startuml Repository Pattern
title Repository Pattern

interface "IRepository<T>" {
  +getById(id: string): T
  +getAll(): T[]
  +add(item: T): void
  +update(item: T): void
  +delete(id: string): void
}

class "Repository<T>" {
  -context: DbContext
  +getById(id: string): T
  +getAll(): T[]
  +add(item: T): void
  +update(item: T): void
  +delete(id: string): void
}

class "UserRepository" {
  +getUserByEmail(email: string): User
  +getUsersByRole(role: string): User[]
}

class "User" {
  -id: string
  -name: string
  -email: string
  -role: string
}

IRepository <|.. Repository
Repository <|-- UserRepository
UserRepository --> User

@enduml
````

## File: lib/knowledge/templates/index.ts
````typescript
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
````

## File: lib/knowledge/templates/sequence/authnetication.puml
````
@startuml Authentication Flow
title Authentication Sequence

actor User
participant "Client" as C
participant "API Gateway" as API
participant "Auth Service" as Auth
database "User DB" as DB

User -> C: Enter credentials
C -> API: POST /login
API -> Auth: Validate credentials
Auth -> DB: Query user
DB --> Auth: Return user data
Auth -> Auth: Generate JWT
Auth --> API: Return token
API --> C: Send token
C -> C: Store token
C --> User: Show success

@enduml
````

## File: lib/knowledge/templates/sequence/crud.pluml
````
@startuml CRUD Operations
title Basic CRUD Operations

actor User
participant "Frontend" as FE
participant "API" as API
database "Database" as DB

group Create
    User -> FE: Submit new item
    FE -> API: POST /items
    API -> DB: Insert item
    DB --> API: Confirm
    API --> FE: Success response
    FE --> User: Show confirmation
end

group Read
    User -> FE: Request items
    FE -> API: GET /items
    API -> DB: Query items
    DB --> API: Return items
    API --> FE: Items data
    FE --> User: Display items
end

group Update
    User -> FE: Modify item
    FE -> API: PUT /items/{id}
    API -> DB: Update item
    DB --> API: Confirm
    API --> FE: Success response
    FE --> User: Show confirmation
end

group Delete
    User -> FE: Delete item
    FE -> API: DELETE /items/{id}
    API -> DB: Remove item
    DB --> API: Confirm
    API --> FE: Success response
    FE --> User: Show confirmation
end

@enduml
````

## File: app/api/chat/route.ts
````typescript
import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file using

export async function POST(req: Request) {
  const { messages, currentScript } = await req.json()

  const lastMessage = messages[messages.length - 1]
  const response = streamText({
    model: openai("gpt-4-turbo"),
    messages: [
      {
        role: "system",
        content: `You are a PlantUML expert assistant. 
        When providing PlantUML scripts, return a JSON object with the following structure:
        {
          "type": "script",
          "content": "your PlantUML script here"
        }
        
        When providing explanations or discussions, return a JSON object with:
        {
          "type": "message",
          "content": "your explanation here"
        }
        
        Current script in editor: ${currentScript}`,
      },
      ...messages.slice(0, -1),
      {
        role: lastMessage.role,
        content: `${lastMessage.content}\n\nRespond in the specified JSON format.`,
      },
    ],
  })

  return response.toDataStreamResponse()
}
````

## File: app/api/chatopenai/route.ts
````typescript
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import dotenv from "dotenv";

dotenv.config(); 

const openai = new OpenAI();

const openAIModels = [
    "gpt-4o-2024-08-06",
    "gpt-4o-mini-2024-07-18",
    "o3-mini-2025-01-31"];

const ResponseObjectSchema = z.object({
  type: z.string(),
  content: z.string(),
});

const ResponseSchema = z.object({
  mandatory: ResponseObjectSchema,
  optional: ResponseObjectSchema.optional(),
});

export async function POST(req: Request) {
  const { messages, currentScript } = await req.json();

  const lastMessage = messages[messages.length - 1];
  

  const completion = await openai.beta.chat.completions.parse({
    model : openAIModels[0],
    messages: [
      {
        role: "system",
        content: `You are an assistant integrated into an app for creating and modifying PlantUML diagrams based on user input. Your response must follow these guidelines:

1. **Explanation Response (Always Required):**  
   Always provide an explanation, acknowledgment, or clarification of the user’s input in the "message" object.  
   This should be informative and help the user understand the state or action related to their request.  
   The response should always be structured as:
   {
     "type": "message",
     "content": "explanation here"
   }

2. **Diagram Response (Optional and Conditional):**  
   Only provide the \`script\` object when:
   - The user explicitly asks to **modify** the diagram (e.g., "Add an attribute to this class").
   - The user **requests a completely new diagram**.
   
   **Do not provide the \`script\` object** in the following cases:
   - The user asks for information about the diagram (e.g., "How many attributes does this class have?").
   - The user asks for analysis of the diagram or a property of the diagram (e.g., "What relationships exist in this diagram?").
   - If no change is needed or requested, simply provide the explanation without returning the same diagram.
   
   If the \`script\` object is provided, structure it as follows:
   {
     "type": "script",
     "content": "PlantUML script here"
   }

3. **Context Awareness:**  
   Always consider the current content of the diagram in the editor (provided with the user input) and the user’s request when crafting your response. Ignore the current diagram if the user requests a completely new diagram. If no modifications are necessary or no new diagram is requested, do not return a new diagram.

4. **Ambiguity Handling:**  
   If the user’s request is unclear, ask clarifying questions in the "message" object. If no modification or creation of a diagram is necessary, do not include the \`script\` object.`,
      },
      //...messages.slice(0, -1), //Keep all messages except the last one as history
      {
        role: lastMessage.role,
        content: `${lastMessage.content}\n\nCurrent script in editor: ${currentScript}`,
      },
    ],
    response_format: zodResponseFormat(ResponseSchema, "response"),
  });

  const parsedResponse = completion.choices[0].message.parsed;
  return new Response(JSON.stringify(parsedResponse), {
    headers: { "Content-Type": "application/json" },
  });
}
````

## File: app/api/pipeline/route.ts
````typescript
import { NextRequest, NextResponse } from 'next/server';
import { classifyIntent, DiagramIntent } from '@/lib/ai-pipeline/inputProcessor';
import { contextManager } from '@/lib/ai-pipeline/contextManager';
import { diagramGenerator } from '@/lib/ai-pipeline/agents/generator';
import { diagramModifier } from '@/lib/ai-pipeline/agents/modifier';
import { diagramAnalyzer } from '@/lib/ai-pipeline/agents/analyzer';
import { responseFormatter, ResponseType } from '@/lib/ai-pipeline/responseFormatter';
import { z } from 'zod';
import pino from 'pino';

// Setup logger
const logger = pino({
  browser: {
    asObject: true
  }
});

// Schema for request validation
const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ),
  currentScript: z.string().optional().default(''),
});

export async function POST(req: NextRequest) {
  try {
    // Parse and validate the request
    const body = await req.json();
    const { messages, currentScript } = requestSchema.parse(body);

    // Get the latest user message
    const lastUserMessage = messages
      .filter(msg => msg.role === 'user')
      .pop();

    if (!lastUserMessage) {
      return NextResponse.json(
        { 
          type: ResponseType.ERROR, 
          content: 'No user message found in the request' 
        },
        { status: 400 }
      );
    }

    // Extract previous conversation for context
    const conversation = messages.map(
      msg => `${msg.role}: ${msg.content}`
    );

    // Add the message to context
    await contextManager.addMessage('user', lastUserMessage.content);

    // Update the current diagram in context manager if provided
    if (currentScript && currentScript.trim() !== '') {
      contextManager.updateDiagram(currentScript);
    }

    // Log details for debugging
    logger.info("Processing request", {
      messageLength: lastUserMessage.content.length,
      conversationLength: conversation.length,
      hasDiagram: !!currentScript && currentScript.trim() !== ''
    });

    try {
      // Classify the user intent
      const intentClassification = await classifyIntent({
        userInput: lastUserMessage.content,
        currentDiagram: contextManager.getCurrentDiagram(),
        conversation: conversation.slice(-5) // Use last 5 messages for context
      });

      // Update the context with the detected intent
      contextManager.setLastIntent(intentClassification.intent);

      // Get relevant context for the agent
      const contextData = await contextManager.getCompleteContext();

      // Process the request based on intent
      let result;
      switch (intentClassification.intent) {
        case DiagramIntent.GENERATE:
          logger.info("Generating diagram", { userInput: lastUserMessage.content });
          result = await diagramGenerator.generate({
            userInput: lastUserMessage.content,
            context: contextData
          });
          
          // Update the context with the new diagram
          if (result.diagram) {
            contextManager.updateDiagram(result.diagram, DiagramIntent.GENERATE);
          }
          break;

        case DiagramIntent.MODIFY:
          logger.info("Modifying diagram", { userInput: lastUserMessage.content });
          result = await diagramModifier.modify({
            userInput: lastUserMessage.content,
            currentDiagram: contextManager.getCurrentDiagram(),
            context: contextData
          });
          
          // Update the context with the modified diagram
          if (result.diagram) {
            contextManager.updateDiagram(result.diagram, DiagramIntent.MODIFY);
          }
          break;

        case DiagramIntent.ANALYZE:
          logger.info("Analyzing diagram", { userInput: lastUserMessage.content });
          result = await diagramAnalyzer.analyze({
            userInput: lastUserMessage.content,
            diagram: contextManager.getCurrentDiagram(),
            context: contextData
          });
          break;

        default:
          // Handle unknown intent with a fallback response
          logger.warn("Unknown intent detected", { intent: intentClassification.intent });
          result = { 
            overview: "I'm not sure what you'd like me to do with the diagram. Could you please clarify if you want me to create a new diagram, modify the existing one, or analyze it?"
          };
          break;
      }

      // Format the response
      const formattedResponse = responseFormatter.formatResponse(
        intentClassification.intent,
        result
      );

      // Add the assistant response to context
      if (formattedResponse.type === ResponseType.SCRIPT) {
        await contextManager.addMessage(
          'assistant', 
          `${formattedResponse.explanation}\n\nI've updated the diagram.`
        );
      } else {
        await contextManager.addMessage('assistant', formattedResponse.content);
      }

      // Return the formatted response
      return NextResponse.json(formattedResponse);
    } catch (processingError) {
      logger.error("Error processing user request:", processingError);
      
      // Add error message to context
      await contextManager.addMessage(
        'assistant',
        "I encountered an error processing your request. Please try again."
      );
      
      // Return error response
      return NextResponse.json({
        type: ResponseType.ERROR,
        content: "I encountered an error processing your request. Please try again with more specific instructions."
      });
    }
  } catch (error) {
    console.error('Pipeline API error:', error);
    
    // Return appropriate error response
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          type: ResponseType.ERROR,
          content: 'Invalid request format',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        type: ResponseType.ERROR,
        content: 'An error occurred while processing your request',
        errorCode: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}
````

## File: components.json
````json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
````

## File: components/code-editor/code-editor.tsx
````typescript
"use client"

import { Editor } from "@monaco-editor/react"
import { Card } from "@/components/ui/card"

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
}

export function CodeEditor({ value, onChange }: CodeEditorProps) {
  return (
    <Card className="h-full">
      <Editor
        height="600px"
        defaultLanguage="plantuml"
        value={value}
        onChange={(value) => onChange(value || "")}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          rulers: [],
          wordWrap: "on",
          theme: "vs-dark",
        }}
      />
    </Card>
  )
}
````

## File: components/preview/preview.tsx
````typescript
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
````

## File: components/ui/accordion.tsx
````typescript
"use client"

import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b", className)}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline text-left [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
````

## File: components/ui/badge.tsx
````typescript
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
````

## File: components/ui/button.tsx
````typescript
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
````

## File: components/ui/card.tsx
````typescript
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
````

## File: components/ui/input.tsx
````typescript
import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
````

## File: components/ui/popover.tsx
````typescript
"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
````

## File: components/ui/scroll-area.tsx
````typescript
"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
````

## File: components/ui/textarea.tsx
````typescript
import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
````

## File: eslint.config.mjs
````
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
````

## File: lib/ai-pipeline/agents/analyzer.ts
````typescript
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StructuredOutputParser, StringOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { model, baseSystemPrompt } from "../baseChain";
// Import from the proper path - likely the guidelines module is re-exporting from the main knowledge module
import { readGuidelines } from "../../knowledge";

// Let's also define the expected DiagramType for the readGuidelines function
type GuidelinesDiagramType = 
  | 'sequence' 
  | 'class' 
  | 'activity' 
  | 'state' 
  | 'component' 
  | 'use-case' 
  | 'entity_relationship';
import pino from "pino";

// Setup logger
const logger = pino({
  browser: {
    asObject: true
  }
});

// Define diagram types as an enum rather than importing it as just a type
export enum DiagramType {
  SEQUENCE = "SEQUENCE",
  CLASS = "CLASS",
  ACTIVITY = "ACTIVITY",
  STATE = "STATE",
  COMPONENT = "COMPONENT",
  DEPLOYMENT = "DEPLOYMENT",
  USE_CASE = "USE_CASE",
  ENTITY_RELATIONSHIP = "ENTITY_RELATIONSHIP",
  UNKNOWN = "UNKNOWN"
}

/**
 * Enum defining types of analysis that can be performed
 */
export enum AnalysisType {
  GENERAL = "general",
  QUALITY = "quality",
  COMPONENTS = "components",
  RELATIONSHIPS = "relationships",
  COMPLEXITY = "complexity",
  IMPROVEMENTS = "improvements"
}

/**
 * Schema defining the structure of the diagram analysis output
 */
const analysisOutputSchema = z.object({
  diagramType: z.nativeEnum(DiagramType),
  analysisType: z.nativeEnum(AnalysisType),
  overview: z.string(),
  components: z.array(z.object({
    name: z.string(),
    type: z.string().optional(),
    description: z.string().optional()
  })).optional(),
  relationships: z.array(z.object({
    source: z.string(),
    target: z.string(),
    type: z.string().optional(),
    description: z.string().optional()
  })).optional(),
  qualityAssessment: z.object({
    score: z.number().min(1).max(10).optional(),
    strengths: z.array(z.string()).optional(),
    weaknesses: z.array(z.string()).optional(),
    bestPracticesFollowed: z.array(z.string()).optional(),
    bestPracticesViolated: z.array(z.string()).optional()
  }).optional(),
  suggestedImprovements: z.array(z.string()).optional()
});

/**
 * Type definition for the analyzer result
 */
export type AnalysisResult = z.infer<typeof analysisOutputSchema>;

/**
 * Schema for analyzer input parameters
 */
const analyzerParamsSchema = z.object({
  userInput: z.string().min(1),
  diagram: z.string().min(10),
  analysisType: z.nativeEnum(AnalysisType).optional(),
  diagramType: z.nativeEnum(DiagramType).optional(),
  context: z.record(z.unknown()).optional()
});

/**
 * Type definition for analyzer parameters
 */
export type AnalyzerParams = z.infer<typeof analyzerParamsSchema>;

/**
 * Specialized agent for analyzing PlantUML diagrams
 */
export class DiagramAnalyzer {
  private parser;

  constructor() {
    this.parser = StructuredOutputParser.fromZodSchema(analysisOutputSchema);
  }

  /**
   * Analyze a PlantUML diagram based on user requirements
   * @param params - Parameters for analysis
   * @returns A promise resolving to the analysis result
   */
  public async analyze(params: AnalyzerParams): Promise<AnalysisResult> {
    try {
      // Validate input params
      const validatedParams = analyzerParamsSchema.parse(params);
      
      // Detect diagram type if not provided
      const diagramType = validatedParams.diagramType || 
        await this.detectDiagramType(validatedParams.diagram);
      
      // Determine analysis type from user input if not provided
      const analysisType = validatedParams.analysisType || 
        await this.detectAnalysisType(validatedParams.userInput);
      
      logger.info("Analyzing diagram", { diagramType, analysisType });
      
      // Try a simple analysis approach first
      try {
        // Create a simple analysis prompt
        const simplePrompt = PromptTemplate.fromTemplate(`
          ${baseSystemPrompt}
          
          You are a specialist in analyzing PlantUML diagrams.
          
          Analyze this PlantUML diagram:
          \`\`\`plantuml
          ${validatedParams.diagram}
          \`\`\`
          
          User's analysis request: ${validatedParams.userInput}
          
          Focus on ${analysisType} analysis.
          
          Provide a comprehensive analysis that includes:
          1. An overview of what the diagram shows
          2. Key components and their relationships
          3. Strengths of the diagram
          4. Potential areas for improvement
          
          Analysis:
        `);
        
        // Run the simple analysis
        const simpleAnalysisChain = RunnableSequence.from([
          simplePrompt,
          model,
          new StringOutputParser()
        ]);
        
        const analysis = await simpleAnalysisChain.invoke({});
        
        // Return a properly formatted result
        logger.info("Diagram analysis completed (simple approach)", { 
          diagramType,
          analysisType
        });
        
        return {
          diagramType,
          analysisType,
          overview: analysis,
          qualityAssessment: {
            strengths: [],
            weaknesses: []
          },
          suggestedImprovements: []
        };
        
      } catch (simpleError) {
        // If simple approach fails, log and try structured approach
        logger.warn("Simple diagram analysis failed, trying structured approach", { error: simpleError });
        
        // Fetch relevant guidelines
        let guidelinesText = "No specific guidelines available.";
        try {
          // Convert our enum to the string type expected by readGuidelines
          let diagramTypeForGuidelines: GuidelinesDiagramType;
          
          // Map our enum values to the expected string literals
          switch(diagramType) {
            case DiagramType.SEQUENCE: 
              diagramTypeForGuidelines = 'sequence'; 
              break;
            case DiagramType.CLASS: 
              diagramTypeForGuidelines = 'class'; 
              break;
            case DiagramType.ACTIVITY: 
              diagramTypeForGuidelines = 'activity'; 
              break;
            case DiagramType.STATE: 
              diagramTypeForGuidelines = 'state'; 
              break;
            case DiagramType.COMPONENT: 
              diagramTypeForGuidelines = 'component'; 
              break;
            case DiagramType.USE_CASE: 
              diagramTypeForGuidelines = 'use-case'; 
              break;
            case DiagramType.ENTITY_RELATIONSHIP: 
              diagramTypeForGuidelines = 'entity_relationship'; 
              break;
            default:
              diagramTypeForGuidelines = 'sequence'; // Default fallback
          }
          
          // Call readGuidelines with the properly typed parameter
          const guidelines = await readGuidelines(diagramTypeForGuidelines);
          
          // Format guidelines for prompt
          if (guidelines && typeof guidelines === 'string') {
            guidelinesText = guidelines;
          }
        } catch (guidelineError) {
          logger.error("Error fetching guidelines:", guidelineError);
        }
        
        // Create the analysis prompt template
        const analysisPrompt = PromptTemplate.fromTemplate(`
          ${baseSystemPrompt}
          
          You are a specialist in analyzing PlantUML diagrams.
          
          Diagram to analyze:
          \`\`\`plantuml
          ${validatedParams.diagram}
          \`\`\`
          
          User analysis request: ${validatedParams.userInput}
          
          Analysis type: ${analysisType}
          Diagram type: ${diagramType}
          
          PlantUML Guidelines:
          ${guidelinesText}
          
          Analyze the diagram based on the analysis type and user request.
          Provide detailed and insightful analysis.
          
          ${this.parser.getFormatInstructions()}
        `);
        
        // Create the analysis chain
        const analysisChain = RunnableSequence.from([
          analysisPrompt,
          model,
          this.parser
        ]);
        
        // Execute the chain
        const result = await analysisChain.invoke({});
        
        // Ensure result has the expected type structure
        const typedResult = result as unknown as AnalysisResult;
        
        logger.info("Diagram analysis completed (structured approach)", { 
          diagramType: typedResult.diagramType,
          analysisType: typedResult.analysisType
        });
        
        return typedResult;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error("Input validation error:", { errors: error.errors });
        // Return a fallback response with a minimal analysis
        return {
          diagramType: DiagramType.UNKNOWN,
          analysisType: AnalysisType.GENERAL,
          overview: `I couldn't analyze the diagram due to invalid parameters: ${error.message}. Please try again with a different request.`
        };
      } else if (error instanceof Error) {
        logger.error("Error analyzing diagram:", { 
          message: error.message, 
          stack: error.stack
        });
        
        // Return a fallback response with a minimal analysis
        return {
          diagramType: DiagramType.UNKNOWN,
          analysisType: AnalysisType.GENERAL,
          overview: `I encountered an error while analyzing the diagram: ${error.message}. Please try again with a clearer request.`
        };
      } else {
        logger.error("Unknown error during diagram analysis:", { error });
        
        // Return a generic fallback
        return {
          diagramType: DiagramType.UNKNOWN,
          analysisType: AnalysisType.GENERAL,
          overview: "I encountered an unexpected error while analyzing the diagram. Please try again with a different request."
        };
      }
    }
  }

  /**
   * Detect the diagram type from an existing diagram
   * @param diagram - The current diagram
   * @returns Detected diagram type
   * @private
   */
  private async detectDiagramType(diagram: string): Promise<DiagramType> {
    try {
      const detectTypePrompt = PromptTemplate.fromTemplate(`
        ${baseSystemPrompt}
        
        Determine the type of the following PlantUML diagram:
        
        \`\`\`plantuml
        ${diagram}
        \`\`\`
        
        Return ONLY one of these types that best matches the diagram:
        SEQUENCE, CLASS, ACTIVITY, STATE, COMPONENT, DEPLOYMENT, USE_CASE, ENTITY_RELATIONSHIP
      `);
      
      const detectTypeChain = RunnableSequence.from([
        detectTypePrompt,
        model,
        new StringOutputParser()
      ]);
      
      const result = await detectTypeChain.invoke({});
      const detectedType = String(result).trim().toUpperCase();
      
      // Map the result to a valid DiagramType
      const diagramTypeMap: Record<string, DiagramType> = {
        "SEQUENCE": DiagramType.SEQUENCE,
        "CLASS": DiagramType.CLASS,
        "ACTIVITY": DiagramType.ACTIVITY,
        "STATE": DiagramType.STATE,
        "COMPONENT": DiagramType.COMPONENT,
        "DEPLOYMENT": DiagramType.DEPLOYMENT,
        "USE_CASE": DiagramType.USE_CASE,
        "USECASE": DiagramType.USE_CASE,
        "ENTITY_RELATIONSHIP": DiagramType.ENTITY_RELATIONSHIP,
        "ER": DiagramType.ENTITY_RELATIONSHIP
      };
      
      const finalType = diagramTypeMap[detectedType] || DiagramType.UNKNOWN;
      
      logger.info("Diagram type detected", { detectedType: finalType });
      return finalType;
    } catch (error) {
      logger.error("Error detecting diagram type:", error);
      return DiagramType.UNKNOWN;
    }
  }

  /**
   * Detect the analysis type based on user input
   * @param userInput - The user's input message
   * @returns Detected analysis type
   * @private
   */
  private async detectAnalysisType(userInput: string): Promise<AnalysisType> {
    try {
      const detectAnalysisPrompt = PromptTemplate.fromTemplate(`
        ${baseSystemPrompt}
        
        Determine the most appropriate type of analysis based on the user's request:
        
        User request: ${userInput}
        
        Select the MOST appropriate analysis type from these options:
        - GENERAL: Overall assessment of the diagram
        - QUALITY: Assessment of diagram quality and best practices
        - COMPONENTS: Inventory and explanation of diagram components
        - RELATIONSHIPS: Analysis of relationships between components
        - COMPLEXITY: Assessment of diagram complexity
        - IMPROVEMENTS: Suggestions for improving the diagram
        
        Return ONLY one of these types (just the word).
      `);
      
      const detectAnalysisChain = RunnableSequence.from([
        detectAnalysisPrompt,
        model,
        new StringOutputParser()
      ]);
      
      const result = await detectAnalysisChain.invoke({});
      const detectedType = String(result).trim().toUpperCase();
      
      // Map the result to a valid AnalysisType
      const analysisTypeMap: Record<string, AnalysisType> = {
        "GENERAL": AnalysisType.GENERAL,
        "QUALITY": AnalysisType.QUALITY,
        "COMPONENTS": AnalysisType.COMPONENTS,
        "RELATIONSHIPS": AnalysisType.RELATIONSHIPS,
        "COMPLEXITY": AnalysisType.COMPLEXITY,
        "IMPROVEMENTS": AnalysisType.IMPROVEMENTS
      };
      
      const finalType = analysisTypeMap[detectedType] || AnalysisType.GENERAL;
      
      logger.info("Analysis type detected", { detectedType: finalType });
      return finalType;
    } catch (error) {
      logger.error("Error detecting analysis type:", error);
      return AnalysisType.GENERAL;
    }
  }

  /**
   * Invoke the analyzer (convenience method for chainable API)
   * @param params - Analyzer parameters
   * @returns Analyzer result
   */
  public async invoke(params: AnalyzerParams): Promise<AnalysisResult> {
    return this.analyze(params);
  }
}

// Export singleton instance
export const diagramAnalyzer = new DiagramAnalyzer();
````

## File: lib/ai-pipeline/agents/generator.ts
````typescript
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StructuredOutputParser, StringOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { model, baseSystemPrompt } from "../baseChain";
import { DiagramType, readGuidelines } from "../../knowledge/guidelines";
import { getTemplatesForType } from "../../knowledge/templates";
import pino from "pino";

// Setup logger
const logger = pino({
  browser: {
    asObject: true
  }
});

/**
 * Schema defining the structure of the diagram generation output
 */
const generationOutputSchema = z.object({
  diagram: z.string().min(10),
  diagramType: z.nativeEnum(DiagramType),
  explanation: z.string(),
  suggestions: z.array(z.string()).optional()
});

/**
 * Type definition for the generator result
 */
export type GenerationResult = z.infer<typeof generationOutputSchema>;

/**
 * Schema for generator input parameters
 */
const generatorParamsSchema = z.object({
  userInput: z.string().min(1),
  diagramType: z.nativeEnum(DiagramType).optional(),
  context: z.record(z.unknown()).optional()
});

/**
 * Type definition for generator parameters
 */
export type GeneratorParams = z.infer<typeof generatorParamsSchema>;

/**
 * Specialized agent for generating PlantUML diagrams from user requirements
 */
export class DiagramGenerator {
  private parser;

  constructor() {
    this.parser = StructuredOutputParser.fromZodSchema(generationOutputSchema);
  }

  /**
   * Generate a new PlantUML diagram based on user requirements
   * @param params - Parameters for generation
   * @returns A promise resolving to the generation result
   */
  public async generate(params: GeneratorParams): Promise<GenerationResult> {
    try {
      // Validate input params
      const validatedParams = generatorParamsSchema.parse(params);
      
      // Determine diagram type from input or context
      const diagramType = validatedParams.diagramType || 
        await this.detectDiagramType(validatedParams.userInput);
      
      logger.info("Generating diagram with type", { diagramType });
      
      // Try a simpler generation approach first for robustness
      try {
        // Create a simple generation prompt
        const simplePrompt = PromptTemplate.fromTemplate(`
          ${baseSystemPrompt}
          
          You are a specialist in creating PlantUML diagrams based on user requirements.
          
          User requirements: ${validatedParams.userInput}
          
          Diagram type: ${diagramType}
          
          Create a PlantUML diagram that satisfies these requirements.
          The diagram should start with @startuml and end with @enduml.
          Focus on proper syntax and clarity.
          
          PlantUML Diagram:
        `);
        
        // Run the simple generation
        const simpleGenerationChain = RunnableSequence.from([
          simplePrompt,
          model,
          new StringOutputParser()
        ]);
        
        const simpleResult = await simpleGenerationChain.invoke({});
        
        // Extract the diagram from the result (it might have extra text)
        const diagramMatch = simpleResult.match(/@startuml[\s\S]*?@enduml/);
        const diagram = diagramMatch ? diagramMatch[0] : simpleResult;
        
        // Create a simple explanation
        const explainPrompt = PromptTemplate.fromTemplate(`
          ${baseSystemPrompt}
          
          You've just created this PlantUML diagram based on these requirements:
          Requirements: ${validatedParams.userInput}
          
          Diagram:
          ${diagram}
          
          Provide a short explanation of the diagram you created (about 2-3 sentences).
        `);
        
        const explainChain = RunnableSequence.from([
          explainPrompt,
          model,
          new StringOutputParser()
        ]);
        
        const explanation = await explainChain.invoke({});
        
        // Return a properly formatted result
        logger.info("Diagram generation completed (simple approach)", { 
          diagramType,
          diagramLength: diagram.length
        });
        
        return {
          diagram,
          diagramType,
          explanation,
          suggestions: []
        };
        
      } catch (simpleError) {
        // If simple approach fails, log and try advanced approach
        logger.warn("Simple diagram generation failed, trying full approach", { error: simpleError });
        
        // Fetch relevant guidelines and templates
        let guidelines, templates;
        try {
          [guidelines, templates] = await Promise.all([
            readGuidelines(diagramType, { fullContent: true }).catch(() => null),
            getTemplatesForType(diagramType).catch(() => [])
          ]);
        } catch (resourceError) {
          logger.error("Error fetching guidelines or templates:", resourceError);
          guidelines = null;
          templates = [];
        }
        
        // Format guidelines for prompt
        let guidelinesText = "No specific guidelines available.";
        if (guidelines) {
          if (Array.isArray(guidelines)) {
            guidelinesText = guidelines.map(g => `${g.title}:\n${g.content}`).join('\n\n');
          } else if (guidelines.sections) {
            guidelinesText = guidelines.sections.map(g => `${g.title}:\n${g.content}`).join('\n\n');
          }
        }
        
        // Format templates for prompt
        const templatesText = templates.length > 0
          ? templates.map(t => `${t.metadata?.name}:\n${t.content}`).join('\n\n')
          : 'No specific templates available for this diagram type.';
        
        // Create the generation prompt template
        const generationPrompt = PromptTemplate.fromTemplate(`
          ${baseSystemPrompt}
          
          You are a specialist in creating PlantUML diagrams based on user requirements.
          
          User requirements: ${validatedParams.userInput}
          
          Diagram type: ${diagramType}
          
          PlantUML Guidelines:
          ${guidelinesText}
          
          Based on the requirements, create a detailed PlantUML diagram.
          Focus on clarity, proper syntax, and following best practices.
          
          ${this.parser.getFormatInstructions()}
        `);
        
        // Create the generation chain
        const generationChain = RunnableSequence.from([
          generationPrompt,
          model,
          this.parser
        ]);
        
        // Execute the chain
        const result = await generationChain.invoke({});
        
        // Ensure result has the expected type structure
        const typedResult = result as unknown as GenerationResult;
        
        logger.info("Diagram generation completed (advanced approach)", { 
          diagramType: typedResult.diagramType,
          diagramLength: typedResult.diagram.length
        });
        
        return typedResult;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error("Input validation error:", { errors: error.errors });
        // Return a fallback response with an error diagram
        return {
          diagram: `@startuml\ntitle Error: Invalid Generation Parameters\nnote "Error: ${error.message}" as Error\n@enduml`,
          diagramType: DiagramType.UNKNOWN,
          explanation: `I couldn't generate the diagram due to invalid parameters: ${error.message}. Please try again with a clearer description.`
        };
      } else if (error instanceof Error) {
        logger.error("Error generating diagram:", { 
          message: error.message, 
          stack: error.stack
        });
        
        // Return a fallback response with an error diagram
        return {
          diagram: `@startuml\ntitle Error in Diagram Generation\nnote "Error: ${error.message}" as Error\n@enduml`,
          diagramType: DiagramType.UNKNOWN,
          explanation: `I encountered an error while generating the diagram: ${error.message}. Please try again or provide more details.`
        };
      } else {
        logger.error("Unknown error during diagram generation:", { error });
        
        // Return a generic fallback response
        return {
          diagram: `@startuml\ntitle Error in Diagram Generation\nnote "An unknown error occurred" as Error\n@enduml`,
          diagramType: DiagramType.UNKNOWN,
          explanation: "I encountered an unexpected error while generating the diagram. Please try again with a different description."
        };
      }
    }
  }

  /**
   * Detect the diagram type from user input
   * @param userInput - The user's input message
   * @returns Detected diagram type
   * @private
   */
  private async detectDiagramType(userInput: string): Promise<DiagramType> {
    try {
      const detectTypePrompt = PromptTemplate.fromTemplate(`
        ${baseSystemPrompt}
        
        Determine the most appropriate PlantUML diagram type based on the user's request:
        
        User request: ${userInput}
        
        Valid diagram types:
        - SEQUENCE: for interactions between components over time
        - CLASS: for system structure and relationships
        - ACTIVITY: for workflows and processes
        - STATE: for state transitions and behaviors
        - COMPONENT: for system components and interfaces
        - DEPLOYMENT: for physical deployment of components
        - USE_CASE: for system/actor interactions
        - ENTITY_RELATIONSHIP: for data modeling
        
        Return ONLY one of these types that best matches the user's request.
      `);
      
      const detectTypeChain = RunnableSequence.from([
        detectTypePrompt,
        model,
        new StringOutputParser()
      ]);
      
      const result = await detectTypeChain.invoke({});
      const detectedType = String(result).trim().toUpperCase();
      
      // Map the result to a valid DiagramType
      const diagramTypeMap: Record<string, DiagramType> = {
        "SEQUENCE": DiagramType.SEQUENCE,
        "CLASS": DiagramType.CLASS,
        "ACTIVITY": DiagramType.ACTIVITY,
        "STATE": DiagramType.STATE,
        "COMPONENT": DiagramType.COMPONENT,
        "DEPLOYMENT": DiagramType.DEPLOYMENT,
        "USE_CASE": DiagramType.USE_CASE,
        "USECASE": DiagramType.USE_CASE,
        "ENTITY_RELATIONSHIP": DiagramType.ENTITY_RELATIONSHIP,
        "ER": DiagramType.ENTITY_RELATIONSHIP
      };
      
      const finalType = diagramTypeMap[detectedType] || DiagramType.SEQUENCE;
      
      logger.info("Diagram type detected", { detectedType: finalType });
      return finalType;
    } catch (error) {
      logger.error("Error detecting diagram type:", error);
      // Default to SEQUENCE if detection fails
      return DiagramType.SEQUENCE;
    }
  }

  /**
   * Invoke the generator (convenience method for chainable API)
   * @param params - Generator parameters
   * @returns Generator result
   */
  public async invoke(params: GeneratorParams): Promise<GenerationResult> {
    return this.generate(params);
  }
}

// Export singleton instance for easier imports
export const diagramGenerator = new DiagramGenerator();
````

## File: lib/ai-pipeline/agents/modifier.ts
````typescript
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StructuredOutputParser, StringOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { model, baseSystemPrompt } from "../baseChain";
import { DiagramType, readGuidelines } from "../../knowledge/guidelines";
import pino from "pino";

// Setup logger
const logger = pino({
  browser: {
    asObject: true
  }
});

/**
 * Schema defining the structure of the diagram modification output
 */
const modificationOutputSchema = z.object({
  diagram: z.string().min(10),
  diagramType: z.nativeEnum(DiagramType),
  changes: z.array(z.string()).min(1),
  explanation: z.string()
});

/**
 * Type definition for the modifier result
 */
export type ModificationResult = z.infer<typeof modificationOutputSchema>;

/**
 * Schema for modifier input parameters
 */
const modifierParamsSchema = z.object({
  userInput: z.string().min(1),
  currentDiagram: z.string().min(10),
  diagramType: z.nativeEnum(DiagramType).optional(),
  context: z.record(z.unknown()).optional()
});

/**
 * Type definition for modifier parameters
 */
export type ModifierParams = z.infer<typeof modifierParamsSchema>;

/**
 * Specialized agent for modifying existing PlantUML diagrams
 */
export class DiagramModifier {
  private parser;

  constructor() {
    this.parser = StructuredOutputParser.fromZodSchema(modificationOutputSchema);
  }

  /**
   * Modify an existing PlantUML diagram based on user instructions
   * @param params - Parameters for modification
   * @returns A promise resolving to the modification result
   */
  public async modify(params: ModifierParams): Promise<ModificationResult> {
    try {
      // Validate input params
      const validatedParams = modifierParamsSchema.parse(params);
      
      // Detect diagram type if not provided
      const diagramType = validatedParams.diagramType || 
        await this.detectDiagramType(validatedParams.currentDiagram);
      
      logger.info("Modifying diagram", { diagramType });
      
      // Try a simple modification approach first
      try {
        const simplePrompt = PromptTemplate.fromTemplate(`
          ${baseSystemPrompt}
          
          You are a specialist in modifying PlantUML diagrams based on user instructions.
          
          Current diagram:
          \`\`\`plantuml
          ${validatedParams.currentDiagram}
          \`\`\`
          
          User modification request: ${validatedParams.userInput}
          
          Modify the diagram according to the user's instructions.
          Preserve existing structure while implementing the requested changes.
          Ensure the modified diagram uses correct PlantUML syntax.
          
          Modified diagram (full code, starting with @startuml and ending with @enduml):
        `);
        
        // Run the simple modification
        const simpleModifyChain = RunnableSequence.from([
          simplePrompt,
          model,
          new StringOutputParser()
        ]);
        
        const modifiedDiagram = await simpleModifyChain.invoke({});
        
        // Extract the diagram from the result (it might have extra text)
        const diagramMatch = modifiedDiagram.match(/@startuml[\s\S]*?@enduml/);
        const diagram = diagramMatch ? diagramMatch[0] : modifiedDiagram;
        
        // If no change was made, retry with stronger emphasis
        if (diagram.trim() === validatedParams.currentDiagram.trim()) {
          logger.warn("No changes detected in the diagram, retrying with emphasis");
          return await this.retryModification(validatedParams, diagramType);
        }
        
        // Create a list of changes
        const changesPrompt = PromptTemplate.fromTemplate(`
          ${baseSystemPrompt}
          
          You have just modified a PlantUML diagram based on this request:
          "${validatedParams.userInput}"
          
          Original diagram:
          \`\`\`plantuml
          ${validatedParams.currentDiagram}
          \`\`\`
          
          Modified diagram:
          \`\`\`plantuml
          ${diagram}
          \`\`\`
          
          List only the specific changes you made to the diagram, one per line.
          Be concise but clear. Start each line with "- ".
        `);
        
        const changesChain = RunnableSequence.from([
          changesPrompt,
          model,
          new StringOutputParser()
        ]);
        
        const changesText = await changesChain.invoke({});
        
        // Convert to array of changes
        const changes = changesText
          .split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.substring(1).trim())
          .filter(Boolean);
        
        // Create explanation
        const explanationPrompt = PromptTemplate.fromTemplate(`
          ${baseSystemPrompt}
          
          You've just modified a PlantUML diagram based on this request:
          "${validatedParams.userInput}"
          
          Provide a short explanation of the changes you made (2-3 sentences).
        `);
        
        const explanationChain = RunnableSequence.from([
          explanationPrompt,
          model,
          new StringOutputParser()
        ]);
        
        const explanation = await explanationChain.invoke({});
        
        logger.info("Diagram modification completed (simple approach)", { 
          diagramType,
          changes: changes.length
        });
        
        return {
          diagram,
          diagramType,
          changes: changes.length > 0 ? changes : ["Updated diagram as requested"],
          explanation
        };
        
      } catch (simpleError) {
        // If simple approach fails, log and try structured approach
        logger.warn("Simple diagram modification failed, trying structured approach", { error: simpleError });
        
        // Fetch relevant guidelines
        let guidelinesText = "No specific guidelines available.";
        try {
          const guidelines = await readGuidelines(diagramType, { 
            bestPracticesOnly: true 
          });
          
          // Format guidelines for prompt
          if (guidelines) {
            if (Array.isArray(guidelines)) {
              guidelinesText = guidelines.map(g => `${g.title}:\n${g.content}`).join('\n\n');
            } else if ('sections' in guidelines && Array.isArray(guidelines.sections)) {
              guidelinesText = guidelines.sections.map(g => `${g.title}:\n${g.content}`).join('\n\n');
            }
          }
        } catch (guidelineError) {
          logger.error("Error fetching guidelines:", guidelineError);
        }
        
        // Create the modification prompt template
        const modificationPrompt = PromptTemplate.fromTemplate(`
          ${baseSystemPrompt}
          
          You are a specialist in modifying PlantUML diagrams based on user instructions.
          
          Current diagram:
          \`\`\`plantuml
          ${validatedParams.currentDiagram}
          \`\`\`
          
          User modification request: ${validatedParams.userInput}
          
          PlantUML Guidelines:
          ${guidelinesText}
          
          Modify the diagram according to the user's instructions.
          Preserve existing structure while implementing the requested changes.
          Ensure the modified diagram uses correct PlantUML syntax.
          
          ${this.parser.getFormatInstructions()}
        `);
        
        // Create the modification chain
        const modificationChain = RunnableSequence.from([
          modificationPrompt,
          model,
          this.parser
        ]);
        
        // Execute the chain
        const result = await modificationChain.invoke({});
        
        // Ensure result has the expected type structure
        const typedResult = result as unknown as ModificationResult;
        
        // Validate the result has actual changes
        if (typedResult.diagram === validatedParams.currentDiagram) {
          // If no changes were made despite user request, try again with stronger emphasis
          logger.warn("No changes were made to the diagram", {
            request: validatedParams.userInput
          });
          
          return await this.retryModification(validatedParams, diagramType);
        }
        
        logger.info("Diagram modification completed (structured approach)", { 
          diagramType: typedResult.diagramType,
          changes: typedResult.changes.length
        });
        
        return typedResult;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error("Input validation error:", { errors: error.errors });
        // Return a fallback response with the original diagram
        return {
          diagram: params.currentDiagram || "",
          diagramType: DiagramType.UNKNOWN,
          changes: [`Error: Invalid modification parameters: ${error.message}`],
          explanation: `I couldn't modify the diagram due to validation errors: ${error.message}. Please try again with clearer instructions.`
        };
      } else if (error instanceof Error) {
        logger.error("Error modifying diagram:", { 
          message: error.message, 
          stack: error.stack
        });
        
        // Return a fallback response with the original diagram
        return {
          diagram: params.currentDiagram,
          diagramType: DiagramType.UNKNOWN,
          changes: [`Error: ${error.message}`],
          explanation: `I encountered an error while modifying the diagram: ${error.message}. Please try again with different instructions.`
        };
      } else {
        logger.error("Unknown error during diagram modification:", { error });
        
        // Return a generic fallback with the original diagram
        return {
          diagram: params.currentDiagram,
          diagramType: DiagramType.UNKNOWN,
          changes: ["Error: Unknown error occurred"],
          explanation: "I encountered an unexpected error while modifying the diagram. Please try again with different instructions."
        };
      }
    }
  }

  /**
   * Retry modification with stronger emphasis on making changes
   * @param params - Original parameters
   * @param diagramType - Detected diagram type
   * @returns Modified result
   * @private
   */
  private async retryModification(
    params: ModifierParams, 
    diagramType: DiagramType
  ): Promise<ModificationResult> {
    try {
      // Create a more directive prompt template
      const retryPrompt = PromptTemplate.fromTemplate(`
        ${baseSystemPrompt}
        
        You are a specialist in modifying PlantUML diagrams based on user instructions.
        
        Current diagram:
        \`\`\`plantuml
        ${params.currentDiagram}
        \`\`\`
        
        User modification request: ${params.userInput}
        
        IMPORTANT: You MUST make the specific changes requested by the user.
        The previous attempt did not implement any changes.
        
        Carefully analyze the diagram and implement the requested modifications.
        Focus on the specific elements the user wants to change.
        
        Modified diagram (full code, starting with @startuml and ending with @enduml):
      `);
      
      // Create the retry chain
      const retryChain = RunnableSequence.from([
        retryPrompt,
        model,
        new StringOutputParser()
      ]);
      
      // Execute the chain
      const modifiedDiagram = await retryChain.invoke({});
      
      // Extract the diagram from the result (it might have extra text)
      const diagramMatch = modifiedDiagram.match(/@startuml[\s\S]*?@enduml/);
      const diagram = diagramMatch ? diagramMatch[0] : modifiedDiagram;
      
      // Create a list of changes
      const changesPrompt = PromptTemplate.fromTemplate(`
        ${baseSystemPrompt}
        
        You have modified a PlantUML diagram based on this request:
        "${params.userInput}"
        
        List the specific changes you made, one per line.
        Be concise but clear. Start each line with "- ".
      `);
      
      const changesChain = RunnableSequence.from([
        changesPrompt,
        model,
        new StringOutputParser()
      ]);
      
      const changesText = await changesChain.invoke({});
      
      // Convert to array of changes
      const changes = changesText
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.substring(1).trim())
        .filter(Boolean);
      
      logger.info("Diagram modification retry completed", { 
        diagramType,
        changes: changes.length
      });
      
      return {
        diagram,
        diagramType,
        changes: changes.length > 0 ? changes : ["Updated diagram as requested"],
        explanation: `I've modified the diagram according to your request: "${params.userInput}"`
      };
    } catch (retryError) {
      logger.error("Error in modification retry:", retryError);
      
      // Return a fallback with the original diagram
      return {
        diagram: params.currentDiagram,
        diagramType,
        changes: ["No changes made due to error"],
        explanation: "I tried to modify the diagram but encountered an error. Please try again with more specific instructions."
      };
    }
  }

  /**
   * Detect the diagram type from an existing diagram
   * @param diagram - The current diagram
   * @returns Detected diagram type
   * @private
   */
  private async detectDiagramType(diagram: string): Promise<DiagramType> {
    try {
      const detectTypePrompt = PromptTemplate.fromTemplate(`
        ${baseSystemPrompt}
        
        Determine the type of the following PlantUML diagram:
        
        \`\`\`plantuml
        ${diagram}
        \`\`\`
        
        Return ONLY one of these types that best matches the diagram:
        SEQUENCE, CLASS, ACTIVITY, STATE, COMPONENT, DEPLOYMENT, USE_CASE, ENTITY_RELATIONSHIP
      `);
      
      const detectTypeChain = RunnableSequence.from([
        detectTypePrompt,
        model,
        new StringOutputParser()
      ]);
      
      const result = await detectTypeChain.invoke({});
      const detectedType = String(result).trim().toUpperCase();
      
      // Map the result to a valid DiagramType
      const diagramTypeMap: Record<string, DiagramType> = {
        "SEQUENCE": DiagramType.SEQUENCE,
        "CLASS": DiagramType.CLASS,
        "ACTIVITY": DiagramType.ACTIVITY,
        "STATE": DiagramType.STATE,
        "COMPONENT": DiagramType.COMPONENT,
        "DEPLOYMENT": DiagramType.DEPLOYMENT,
        "USE_CASE": DiagramType.USE_CASE,
        "USECASE": DiagramType.USE_CASE,
        "ENTITY_RELATIONSHIP": DiagramType.ENTITY_RELATIONSHIP,
        "ER": DiagramType.ENTITY_RELATIONSHIP
      };
      
      const finalType = diagramTypeMap[detectedType] || DiagramType.UNKNOWN;
      
      logger.info("Diagram type detected", { detectedType: finalType });
      return finalType;
    } catch (error) {
      logger.error("Error detecting diagram type:", error);
      return DiagramType.UNKNOWN;
    }
  }

  /**
   * Invoke the modifier (convenience method for chainable API)
   * @param params - Modifier parameters
   * @returns Modifier result
   */
  public async invoke(params: ModifierParams): Promise<ModificationResult> {
    return this.modify(params);
  }
}

// Export singleton instance
export const diagramModifier = new DiagramModifier();
````

## File: lib/ai-pipeline/baseChain.ts
````typescript
import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

dotenv.config();

// Define the type for the model configuration
const model: ChatOpenAI = new ChatOpenAI({ model: "gpt-4o-2024-08-06" });

// Base system prompt that all chains will extend
const baseSystemPrompt: string = `You are an AI assistant specialized in PlantUML diagrams.`;

// Create base templates for different operations
const baseGenerateTemplate: PromptTemplate = PromptTemplate.fromTemplate(`
    ${baseSystemPrompt}
    Generate a PlantUML diagram based on the following requirements:
    {requirements}
    `);

const baseModifyTemplate: PromptTemplate = PromptTemplate.fromTemplate(`
    ${baseSystemPrompt}
    Modify the following PlantUML diagram according to these instructions:
    Current diagram:
    {currentDiagram}
    
    Modification instructions:
    {instructions}
    `);

const baseAnalyzeTemplate: PromptTemplate = PromptTemplate.fromTemplate(`
    ${baseSystemPrompt}
    Analyze the following PlantUML diagram:
    {diagram}
    
    Focus on:
    {analysisType}
    `);

// Define the type for the function parameter and return value
const createBaseChain = (promptTemplate: PromptTemplate): RunnableSequence => {
    return RunnableSequence.from([
        promptTemplate,
        model,
        new StringOutputParser(),
    ]);
};

export {
    model,
    baseSystemPrompt,
    baseGenerateTemplate,
    baseModifyTemplate,
    baseAnalyzeTemplate,
    createBaseChain,
};
````

## File: lib/ai-pipeline/responseFormatter.ts
````typescript
import { DiagramIntent } from "./inputProcessor";
import { GenerationResult } from "./agents/generator";
import { ModificationResult } from "./agents/modifier";
import { AnalysisResult } from "./agents/analyzer";
import pino from "pino";

// Setup logger
const logger = pino({
  browser: {
    asObject: true
  }
});

/**
 * Types of possible responses
 */
export enum ResponseType {
  MESSAGE = "message",
  SCRIPT = "script",
  ERROR = "error"
}

/**
 * Base interface for all response objects
 */
export interface BaseResponse {
  type: ResponseType;
  content: string;
}

/**
 * Interface for message-only responses
 */
export interface MessageResponse extends BaseResponse {
  type: ResponseType.MESSAGE;
  content: string;
}

/**
 * Interface for script responses that include a diagram
 */
export interface ScriptResponse extends BaseResponse {
  type: ResponseType.SCRIPT;
  content: string;
  explanation: string;
}

/**
 * Interface for error responses
 */
export interface ErrorResponse extends BaseResponse {
  type: ResponseType.ERROR;
  content: string;
  errorCode?: string;
}

/**
 * Union type for all possible response types
 */
export type FormattedResponse = MessageResponse | ScriptResponse | ErrorResponse;

/**
 * Factory methods for creating standard responses
 */
export class ResponseFactory {
  /**
   * Create a message-only response
   * @param message - The message content
   * @returns A message response object
   */
  public static createMessageResponse(message: string): MessageResponse {
    return {
      type: ResponseType.MESSAGE,
      content: message
    };
  }

  /**
   * Create a script response with diagram
   * @param script - The PlantUML script
   * @param explanation - Explanation for the diagram
   * @returns A script response object
   */
  public static createScriptResponse(script: string, explanation: string): ScriptResponse {
    return {
      type: ResponseType.SCRIPT,
      content: script,
      explanation
    };
  }

  /**
   * Create an error response
   * @param message - The error message
   * @param errorCode - Optional error code
   * @returns An error response object
   */
  public static createErrorResponse(message: string, errorCode?: string): ErrorResponse {
    return {
      type: ResponseType.ERROR,
      content: message,
      errorCode
    };
  }
}

/**
 * Response formatter class for handling different agent outputs
 */
export class ResponseFormatter {
  /**
   * Format a generator result into a standardized response
   * @param result - The generator result
   * @returns Formatted response
   */
  public formatGeneratorResponse(result: GenerationResult): FormattedResponse {
    try {
      logger.info("Formatting generator response");
      
      return ResponseFactory.createScriptResponse(
        result.diagram,
        result.explanation
      );
    } catch (error) {
      logger.error("Error formatting generator response:", { error });
      return ResponseFactory.createErrorResponse(
        "Failed to format generator response",
        "FORMAT_ERROR"
      );
    }
  }

  /**
   * Format a modifier result into a standardized response
   * @param result - The modifier result
   * @returns Formatted response
   */
  public formatModifierResponse(result: ModificationResult): FormattedResponse {
    try {
      logger.info("Formatting modifier response");
      
      // Format the changes summary
      const changesList = result.changes.join('\n- ');
      const changesMessage = `Changes made:\n- ${changesList}`;
      
      return ResponseFactory.createScriptResponse(
        result.diagram,
        `${result.explanation}\n\n${changesMessage}`
      );
    } catch (error) {
      logger.error("Error formatting modifier response:", { error });
      return ResponseFactory.createErrorResponse(
        "Failed to format modifier response",
        "FORMAT_ERROR"
      );
    }
  }

  /**
   * Format an analyzer result into a standardized response
   * @param result - The analyzer result
   * @returns Formatted response
   */
  public formatAnalyzerResponse(result: AnalysisResult): FormattedResponse {
    try {
      logger.info("Formatting analyzer response");
      
      // Prepare the analysis message based on available data
      let analysisMessage = result.overview;
      
      // Add quality assessment if available
      if (result.qualityAssessment) {
        const quality = result.qualityAssessment;
        
        if (quality.score !== undefined) {
          analysisMessage += `\n\nQuality Score: ${quality.score}/10`;
        }
        
        if (quality.strengths && quality.strengths.length > 0) {
          analysisMessage += `\n\nStrengths:\n- ${quality.strengths.join('\n- ')}`;
        }
        
        if (quality.weaknesses && quality.weaknesses.length > 0) {
          analysisMessage += `\n\nAreas for Improvement:\n- ${quality.weaknesses.join('\n- ')}`;
        }
      }
      
      // Add improvement suggestions if available
      if (result.suggestedImprovements && result.suggestedImprovements.length > 0) {
        analysisMessage += `\n\nSuggested Improvements:\n- ${result.suggestedImprovements.join('\n- ')}`;
      }
      
      return ResponseFactory.createMessageResponse(analysisMessage);
    } catch (error) {
      logger.error("Error formatting analyzer response:", { error });
      return ResponseFactory.createErrorResponse(
        "Failed to format analyzer response",
        "FORMAT_ERROR"
      );
    }
  }

  /**
   * Format a generic response based on intent and result
   * @param intent - The diagram intent
   * @param result - The result object from any agent
   * @returns Formatted response
   */
  public formatResponse(intent: DiagramIntent, result: GenerationResult | ModificationResult | AnalysisResult | unknown): FormattedResponse {
    try {
      switch (intent) {
        case DiagramIntent.GENERATE:
          return this.formatGeneratorResponse(result as GenerationResult);
          
        case DiagramIntent.MODIFY:
          return this.formatModifierResponse(result as ModificationResult);
          
        case DiagramIntent.ANALYZE:
          return this.formatAnalyzerResponse(result as AnalysisResult);
          
        case DiagramIntent.UNKNOWN:
        default:
          return ResponseFactory.createMessageResponse(
            "I'm not sure what you'd like me to do with the diagram. " +
            "Could you please clarify if you want me to create a new diagram, " +
            "modify the existing one, or analyze it?"
          );
      }
    } catch (error) {
      logger.error("Error in response formatter:", { error, intent });
      
      return ResponseFactory.createErrorResponse(
        "An error occurred while processing your request. Please try again.",
        "GENERAL_ERROR"
      );
    }
  }
}

// Export singleton instance
export const responseFormatter = new ResponseFormatter();
````

## File: lib/ai-pipeline/types.ts
````typescript
/**
 * Type definitions for the AI Pipeline
 * These types provide a common interface between different components
 */

import { DiagramIntent } from "./inputProcessor";
import { DiagramType } from "../knowledge/guidelines";
import { FormattedResponse } from "./responseFormatter";

/**
 * Base agent parameters that all specialized agents share
 */
export interface BaseAgentParams {
  /**
   * The user's input message
   */
  userInput: string;
  
  /**
   * Optional context information
   */
  context?: Record<string, unknown>;
}

/**
 * Base agent result that all specialized agent results extend
 */
export interface BaseAgentResult {
  /**
   * The type of diagram
   */
  diagramType: DiagramType;
  
  /**
   * Explanation or message to the user
   */
  explanation: string;
}

/**
 * Parameters for pipeline processing
 */
export interface PipelineParams {
  /**
   * The user's input message
   */
  userInput: string;
  
  /**
   * Current PlantUML script (if any)
   */
  currentScript?: string;
  
  /**
   * Previous conversation messages
   */
  conversation?: string[];
  
  /**
   * Optional session identifier
   */
  sessionId?: string;
}

/**
 * Result from the pipeline processing
 */
export interface PipelineResult {
  /**
   * Formatted response for the UI
   */
  response: FormattedResponse;
  
  /**
   * The intent that was determined
   */
  intent: DiagramIntent;
  
  /**
   * Updated PlantUML script (if applicable)
   */
  updatedScript?: string;
  
  /**
   * Session identifier
   */
  sessionId: string;
}

/**
 * Interface for the complete AI pipeline
 */
export interface AIPipeline {
  /**
   * Process a user request through the pipeline
   * @param params - Parameters for processing
   * @returns Pipeline result
   */
  process(params: PipelineParams): Promise<PipelineResult>;
  
  /**
   * Reset the pipeline state
   * @param sessionId - Optional session ID to reset
   */
  reset(sessionId?: string): void;
}

/**
 * Interface for specialized agents
 */
export interface Agent<TParams extends BaseAgentParams, TResult extends BaseAgentResult> {
  /**
   * Process a request with this agent
   * @param params - Agent parameters
   * @returns Agent result
   */
  invoke(params: TParams): Promise<TResult>;
}
````

## File: lib/utils.ts
````typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
````

## File: lib/utils/openAIStreaming.ts
````typescript
/* import OpenAI from "openai";
import { zodResponseFormat} from "openai/helpers/zod";
import {z} from "zod";
export const openai = new OpenAI();

const responseSchema = z.object({
    type: z.string(),
    content: z.string(),
});

export const streaming = openai.beta.chat.completions.stream(
  {
    model:'gpt-4-turbo',
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant."
      },
        {
            role: "user",
            content: "What is the purpose of life?"
        }
    ]
  }  
); */
````

## File: lib/utils/plantuml.ts
````typescript
import { encode } from "plantuml-encoder"

export const PLANTUML_SERVER = "https://www.plantuml.com/plantuml"

export function getPlantUMLPreviewURL(content: string): string {
  const encoded = encode(content)
  return `${PLANTUML_SERVER}/svg/${encoded}`
}

export const DEFAULT_PLANTUML = `@startuml
Bob -> Alice : hello
@enduml`
````

## File: LICENSE.md
````markdown
MIT License

Copyright (c) 2025 Saeed NajafiMosleh

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
````

## File: postcss.config.mjs
````
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
  },
};

export default config;
````

## File: public/file.svg
````
<svg fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M14.5 13.5V5.41a1 1 0 0 0-.3-.7L9.8.29A1 1 0 0 0 9.08 0H1.5v13.5A2.5 2.5 0 0 0 4 16h8a2.5 2.5 0 0 0 2.5-2.5m-1.5 0v-7H8v-5H3v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1M9.5 5V2.12L12.38 5zM5.13 5h-.62v1.25h2.12V5zm-.62 3h7.12v1.25H4.5zm.62 3h-.62v1.25h7.12V11z" clip-rule="evenodd" fill="#666" fill-rule="evenodd"/></svg>
````

## File: public/globe.svg
````
<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g clip-path="url(#a)"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.27 14.1a6.5 6.5 0 0 0 3.67-3.45q-1.24.21-2.7.34-.31 1.83-.97 3.1M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.48-1.52a7 7 0 0 1-.96 0H7.5a4 4 0 0 1-.84-1.32q-.38-.89-.63-2.08a40 40 0 0 0 3.92 0q-.25 1.2-.63 2.08a4 4 0 0 1-.84 1.31zm2.94-4.76q1.66-.15 2.95-.43a7 7 0 0 0 0-2.58q-1.3-.27-2.95-.43a18 18 0 0 1 0 3.44m-1.27-3.54a17 17 0 0 1 0 3.64 39 39 0 0 1-4.3 0 17 17 0 0 1 0-3.64 39 39 0 0 1 4.3 0m1.1-1.17q1.45.13 2.69.34a6.5 6.5 0 0 0-3.67-3.44q.65 1.26.98 3.1M8.48 1.5l.01.02q.41.37.84 1.31.38.89.63 2.08a40 40 0 0 0-3.92 0q.25-1.2.63-2.08a4 4 0 0 1 .85-1.32 7 7 0 0 1 .96 0m-2.75.4a6.5 6.5 0 0 0-3.67 3.44 29 29 0 0 1 2.7-.34q.31-1.83.97-3.1M4.58 6.28q-1.66.16-2.95.43a7 7 0 0 0 0 2.58q1.3.27 2.95.43a18 18 0 0 1 0-3.44m.17 4.71q-1.45-.12-2.69-.34a6.5 6.5 0 0 0 3.67 3.44q-.65-1.27-.98-3.1" fill="#666"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h16v16H0z"/></clipPath></defs></svg>
````

## File: public/next.svg
````
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 394 80"><path fill="#000" d="M262 0h68.5v12.7h-27.2v66.6h-13.6V12.7H262V0ZM149 0v12.7H94v20.4h44.3v12.6H94v21h55v12.6H80.5V0h68.7zm34.3 0h-17.8l63.8 79.4h17.9l-32-39.7 32-39.6h-17.9l-23 28.6-23-28.6zm18.3 56.7-9-11-27.1 33.7h17.8l18.3-22.7z"/><path fill="#000" d="M81 79.3 17 0H0v79.3h13.6V17l50.2 62.3H81Zm252.6-.4c-1 0-1.8-.4-2.5-1s-1.1-1.6-1.1-2.6.3-1.8 1-2.5 1.6-1 2.6-1 1.8.3 2.5 1a3.4 3.4 0 0 1 .6 4.3 3.7 3.7 0 0 1-3 1.8zm23.2-33.5h6v23.3c0 2.1-.4 4-1.3 5.5a9.1 9.1 0 0 1-3.8 3.5c-1.6.8-3.5 1.3-5.7 1.3-2 0-3.7-.4-5.3-1s-2.8-1.8-3.7-3.2c-.9-1.3-1.4-3-1.4-5h6c.1.8.3 1.6.7 2.2s1 1.2 1.6 1.5c.7.4 1.5.5 2.4.5 1 0 1.8-.2 2.4-.6a4 4 0 0 0 1.6-1.8c.3-.8.5-1.8.5-3V45.5zm30.9 9.1a4.4 4.4 0 0 0-2-3.3 7.5 7.5 0 0 0-4.3-1.1c-1.3 0-2.4.2-3.3.5-.9.4-1.6 1-2 1.6a3.5 3.5 0 0 0-.3 4c.3.5.7.9 1.3 1.2l1.8 1 2 .5 3.2.8c1.3.3 2.5.7 3.7 1.2a13 13 0 0 1 3.2 1.8 8.1 8.1 0 0 1 3 6.5c0 2-.5 3.7-1.5 5.1a10 10 0 0 1-4.4 3.5c-1.8.8-4.1 1.2-6.8 1.2-2.6 0-4.9-.4-6.8-1.2-2-.8-3.4-2-4.5-3.5a10 10 0 0 1-1.7-5.6h6a5 5 0 0 0 3.5 4.6c1 .4 2.2.6 3.4.6 1.3 0 2.5-.2 3.5-.6 1-.4 1.8-1 2.4-1.7a4 4 0 0 0 .8-2.4c0-.9-.2-1.6-.7-2.2a11 11 0 0 0-2.1-1.4l-3.2-1-3.8-1c-2.8-.7-5-1.7-6.6-3.2a7.2 7.2 0 0 1-2.4-5.7 8 8 0 0 1 1.7-5 10 10 0 0 1 4.3-3.5c2-.8 4-1.2 6.4-1.2 2.3 0 4.4.4 6.2 1.2 1.8.8 3.2 2 4.3 3.4 1 1.4 1.5 3 1.5 5h-5.8z"/></svg>
````

## File: public/vercel.svg
````
<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1155 1000"><path d="m577.3 0 577.4 1000H0z" fill="#fff"/></svg>
````

## File: public/window.svg
````
<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill-rule="evenodd" clip-rule="evenodd" d="M1.5 2.5h13v10a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1zM0 1h16v11.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 0 12.5zm3.75 4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5M7 4.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0m1.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5" fill="#666"/></svg>
````

## File: vscode-style-terminal-tabs-plantuml.svg
````
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700">
  <!-- Background -->
  <rect width="1000" height="700" fill="#1e1e1e"/>
  
  <!-- Header/Title bar -->
  <rect x="0" y="0" width="1000" height="30" fill="#323233"/>
  <text x="20" y="20" font-family="Arial" font-size="14" fill="#ffffff">PlantUML Editor</text>
  <circle cx="980" cy="15" r="6" fill="#ff5f57"/>
  <circle cx="960" cy="15" r="6" fill="#febc2e"/>
  <circle cx="940" cy="15" r="6" fill="#28c840"/>
  
  <!-- Activity Bar (leftmost) -->
  <rect x="0" y="30" width="50" height="670" fill="#333333"/>
  <rect x="0" y="40" width="50" height="40" fill="#505050"/>
  <text x="25" y="65" font-family="Arial" font-size="18" fill="#ffffff" text-anchor="middle">📁</text>
  <text x="25" y="115" font-family="Arial" font-size="18" fill="#ffffff" text-anchor="middle">🔄</text>
  <text x="25" y="165" font-family="Arial" font-size="18" fill="#ffffff" text-anchor="middle">📋</text>
  <text x="25" y="215" font-family="Arial" font-size="18" fill="#ffffff" text-anchor="middle">🔍</text>
  <text x="25" y="665" font-family="Arial" font-size="18" fill="#ffffff" text-anchor="middle">⚙️</text>
  
  <!-- Left Sidebar - File Explorer, Templates, Version Control -->
  <rect x="50" y="30" width="200" height="670" fill="#252526"/>
  
  <!-- File Explorer Section -->
  <rect x="50" y="30" width="200" height="30" fill="#2d2d2d"/>
  <text x="65" y="50" font-family="Arial" font-size="14" fill="#ffffff">EXPLORER</text>
  <text x="232" y="50" font-family="Arial" font-size="14" fill="#ffffff" text-anchor="middle">...</text>
  
  <!-- File Tree -->
  <rect x="50" y="60" width="200" height="200" fill="#252526"/>
  <text x="70" y="80" font-family="Arial" font-size="12" fill="#ffffff">📁 PROJECT</text>
  <text x="90" y="100" font-family="Arial" font-size="12" fill="#cccccc">📄 sequence.puml</text>
  <text x="90" y="120" font-family="Arial" font-size="12" fill="#cccccc">📄 class.puml</text>
  <text x="90" y="140" font-family="Arial" font-size="12" fill="#cccccc">📄 activity.puml</text>
  <text x="70" y="160" font-family="Arial" font-size="12" fill="#ffffff">📁 EXAMPLES</text>
  <text x="90" y="180" font-family="Arial" font-size="12" fill="#cccccc">📄 authentication.puml</text>
  <text x="90" y="200" font-family="Arial" font-size="12" fill="#cccccc">📄 microservice.puml</text>

  <!-- Templates Section -->
  <rect x="50" y="260" width="200" height="30" fill="#2d2d2d"/>
  <text x="65" y="280" font-family="Arial" font-size="14" fill="#ffffff">TEMPLATES</text>
  <text x="232" y="280" font-family="Arial" font-size="14" fill="#ffffff" text-anchor="middle">...</text>
  
  <!-- Templates List -->
  <rect x="50" y="290" width="200" height="150" fill="#252526"/>
  <text x="70" y="310" font-family="Arial" font-size="12" fill="#cccccc">📊 Sequence Diagram</text>
  <text x="70" y="330" font-family="Arial" font-size="12" fill="#cccccc">📊 Class Diagram</text>
  <text x="70" y="350" font-family="Arial" font-size="12" fill="#cccccc">📊 Use Case Diagram</text>
  <text x="70" y="370" font-family="Arial" font-size="12" fill="#cccccc">📊 Activity Diagram</text>
  <text x="70" y="390" font-family="Arial" font-size="12" fill="#cccccc">📊 State Diagram</text>
  <text x="70" y="410" font-family="Arial" font-size="12" fill="#cccccc">📊 Component Diagram</text>
  
  <!-- Version Control Section -->
  <rect x="50" y="440" width="200" height="30" fill="#2d2d2d"/>
  <text x="65" y="460" font-family="Arial" font-size="14" fill="#ffffff">GIT</text>
  <text x="232" y="460" font-family="Arial" font-size="14" fill="#ffffff" text-anchor="middle">...</text>
  
  <!-- Git Status -->
  <rect x="50" y="470" width="200" height="100" fill="#252526"/>
  <text x="70" y="490" font-family="Arial" font-size="12" fill="#cccccc">Changes (2)</text>
  <text x="90" y="510" font-family="Arial" font-size="12" fill="#cccccc">M sequence.puml</text>
  <text x="90" y="530" font-family="Arial" font-size="12" fill="#cccccc">+ new_diagram.puml</text>
  <text x="70" y="550" font-family="Arial" font-size="12" fill="#cccccc">Branch: main</text>
  
  <!-- Main Editor Area -->
  <rect x="250" y="30" width="500" height="470" fill="#1e1e1e"/>
  
  <!-- Editor Tabs -->
  <rect x="250" y="30" width="500" height="30" fill="#2d2d2d"/>
  <rect x="250" y="30" width="150" height="30" fill="#094771"/>
  <text x="325" y="50" font-family="Arial" font-size="12" fill="#ffffff" text-anchor="middle">sequence.puml</text>
  <text x="415" y="50" font-family="Arial" font-size="12" fill="#888888" text-anchor="middle">class.puml</text>
  
  <!-- Editor Controls -->
  <rect x="630" y="35" width="50" height="20" rx="3" fill="#4285f4"/>
  <text x="655" y="50" font-family="Arial" font-size="12" fill="white" text-anchor="middle">Run</text>
  <rect x="690" y="35" width="50" height="20" rx="3" fill="#333333"/>
  <text x="715" y="50" font-family="Arial" font-size="12" fill="white" text-anchor="middle">Save</text>
  
  <!-- Monaco Editor Content -->
  <rect x="250" y="60" width="500" height="440" rx="0" fill="#1e1e1e"/>
  <rect x="250" y="60" width="30" height="440" fill="#252526"/>
  <text x="265" y="80" font-family="Consolas, monospace" font-size="12" fill="#858585">1</text>
  <text x="265" y="100" font-family="Consolas, monospace" font-size="12" fill="#858585">2</text>
  <text x="265" y="120" font-family="Consolas, monospace" font-size="12" fill="#858585">3</text>
  <text x="265" y="140" font-family="Consolas, monospace" font-size="12" fill="#858585">4</text>
  <text x="265" y="160" font-family="Consolas, monospace" font-size="12" fill="#858585">5</text>
  <text x="265" y="180" font-family="Consolas, monospace" font-size="12" fill="#858585">6</text>
  <text x="265" y="200" font-family="Consolas, monospace" font-size="12" fill="#858585">7</text>
  <text x="265" y="220" font-family="Consolas, monospace" font-size="12" fill="#858585">8</text>
  <text x="265" y="240" font-family="Consolas, monospace" font-size="12" fill="#858585">9</text>
  <text x="265" y="260" font-family="Consolas, monospace" font-size="12" fill="#858585">10</text>
  <text x="265" y="280" font-family="Consolas, monospace" font-size="12" fill="#858585">11</text>
  <text x="265" y="300" font-family="Consolas, monospace" font-size="12" fill="#858585">12</text>
  <text x="265" y="320" font-family="Consolas, monospace" font-size="12" fill="#858585">13</text>
  
  <text x="290" y="80" font-family="Consolas, monospace" font-size="12" fill="#569cd6">@startuml</text>
  <text x="290" y="100" font-family="Consolas, monospace" font-size="12" fill="#569cd6">title</text>
  <text x="290" y="120" font-family="Consolas, monospace" font-size="12" fill="#ce9178">Login Sequence</text>
  <text x="290" y="140" font-family="Consolas, monospace" font-size="12" fill="#569cd6">end title</text>
  <text x="290" y="160" font-family="Consolas, monospace" font-size="12" fill="#569cd6">actor</text>
  <text x="290" y="180" font-family="Consolas, monospace" font-size="12" fill="#ce9178">User</text>
  <text x="290" y="200" font-family="Consolas, monospace" font-size="12" fill="#569cd6">participant</text>
  <text x="290" y="220" font-family="Consolas, monospace" font-size="12" fill="#ce9178">"Server"</text>
  <text x="290" y="240" font-family="Consolas, monospace" font-size="12" fill="#569cd6">User -></text>
  <text x="290" y="260" font-family="Consolas, monospace" font-size="12" fill="#ce9178">"Server": Login Request</text>
  <text x="290" y="280" font-family="Consolas, monospace" font-size="12" fill="#569cd6">Server --></text>
  <text x="290" y="300" font-family="Consolas, monospace" font-size="12" fill="#ce9178">User: Authentication Response</text>
  <text x="290" y="320" font-family="Consolas, monospace" font-size="12" fill="#569cd6">@enduml</text>
  
  <!-- Terminal/Chat Area -->
  <rect x="250" y="500" width="500" height="200" fill="#1e1e1e"/>
  <rect x="250" y="500" width="500" height="30" fill="#2d2d2d"/>
  <text x="270" y="520" font-family="Arial" font-size="12" fill="#ffffff">TERMINAL / CHAT</text>
  
  <!-- Terminal Tabs -->
  <rect x="390" y="505" width="80" height="20" fill="#094771"/>
  <text x="430" y="520" font-family="Arial" font-size="12" fill="#ffffff" text-anchor="middle">COPILOT</text>
  <text x="500" y="520" font-family="Arial" font-size="12" fill="#888888" text-anchor="middle">TERMINAL</text>
  <text x="570" y="520" font-family="Arial" font-size="12" fill="#888888" text-anchor="middle">PROBLEMS</text>
  <text x="640" y="520" font-family="Arial" font-size="12" fill="#888888" text-anchor="middle">OUTPUT</text>
  
  <!-- Chat Content -->
  <rect x="250" y="530" width="500" height="140" fill="#1e1e1e"/>
  <rect x="260" y="540" width="480" height="40" rx="5" fill="#333333"/>
  <text x="270" y="560" font-family="Arial" font-size="12" fill="#cccccc">How can I create a sequence diagram for user authentication?</text>
  
  <rect x="260" y="590" width="480" height="60" rx="5" fill="#063561"/>
  <text x="270" y="610" font-family="Arial" font-size="12" fill="#cccccc">I've added a basic authentication sequence. You can see the preview on the right.</text>
  <text x="270" y="630" font-family="Arial" font-size="12" fill="#cccccc">Would you like to add more steps or participants?</text>
  
  <!-- Chat Input -->
  <rect x="260" y="660" width="480" height="30" rx="5" fill="#3c3c3c"/>
  <text x="270" y="680" font-family="Arial" font-size="12" fill="#999999">Ask about PlantUML or request a diagram change...</text>
  
  <!-- Right Panel - Preview -->
  <rect x="750" y="30" width="250" height="670" fill="#252526"/>
  <rect x="750" y="30" width="250" height="30" fill="#2d2d2d"/>
  <text x="770" y="50" font-family="Arial" font-size="14" fill="#ffffff">PREVIEW</text>
  
  <!-- Preview Controls -->
  <rect x="890" y="35" width="50" height="20" rx="3" fill="#333333"/>
  <text x="915" y="50" font-family="Arial" font-size="12" fill="white" text-anchor="middle">Export</text>
  <rect x="830" y="35" width="50" height="20" rx="3" fill="#333333"/>
  <text x="855" y="50" font-family="Arial" font-size="12" fill="white" text-anchor="middle">Share</text>
  
  <!-- PlantUML Preview -->
  <rect x="760" y="70" width="230" height="350" fill="#1e1e1e" stroke="#444444"/>
  
  <!-- Diagram Title -->
  <rect x="770" y="80" width="210" height="25" fill="#1e1e1e"/>
  <text x="875" y="97" font-family="Arial" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">Login Sequence</text>
  
  <!-- Simple diagram visualization -->
  <!-- Actor and participant -->
  <circle cx="800" cy="150" r="15" fill="none" stroke="#cccccc"/> 
  </svg>
````

## File: .gitignore
````
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
````

## File: app/globals.css
````css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: Arial, Helvetica, sans-serif;
}

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
    --radius: 0.5rem;
  }
  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --card: 0 0% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 14.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 14.9%;
    --input: 0 0% 14.9%;
    --ring: 0 0% 83.1%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
````

## File: app/layout.tsx
````typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ backgroundImage: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
      >
        <header className= "text-white p-4 text-center text-6xl font-bold">
          Model Mind
        </header>
        {children}
      </body>
    </html>
  );
}
````

## File: app/page.tsx
````typescript
"use client"

import { useState } from "react"
import { ChatInterface } from "@/components/chat-interface/chat-interface"
import { CodeEditor } from "@/components/code-editor/code-editor"
import { Preview } from "@/components/preview/preview"
import { DEFAULT_PLANTUML } from "@/lib/utils/plantuml"

export default function Home() {
  const [script, setScript] = useState(DEFAULT_PLANTUML)

  return (
    <main className="container mx-5 py-4 flex gap-10 justify-center items-center">
      <div className="flex gap-5 justify-center w-full">
        <div className="flex-1 min-w-0">
          <h2>Chat Assistant</h2>
          <ChatInterface onScriptGenerated={setScript} currentScript={script} />
        </div>

        <div className="flex-1 min-w-0">
          <h2>Code Editor</h2>
          <CodeEditor value={script} onChange={setScript} />
        </div>

        <div className="flex-1 min-w-0">
          <h2>Preview</h2>
          <Preview content={script} />
        </div>
      </div>
    </main>
  )
}
````

## File: components/chat-interface/chat-interface.tsx
````typescript
"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ResponseType } from "@/lib/ai-pipeline/responseFormatter"

interface ChatInterfaceProps {
  onScriptGenerated: (script: string) => void
  currentScript: string
}

export function ChatInterface({ onScriptGenerated, currentScript }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<{ id: string; role: string; content: string }[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [rows, setRows] = useState(3)
  const [showCommands, setShowCommands] = useState(false)
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)

  const lineHeight = 24 // adjust as needed
  const minRows = 3 // minimum number of rows
  const maxRows = 10 // maximum number of rows

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const commandsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages]) 

  const commandHandlers = useMemo(() => ({
    "@clear": () => {
      setMessages([])
      setInput("")
      return true
    },
    "@reset": () => {
      onScriptGenerated("")
      setInput("")
      return true
    },
  }), [setMessages, setInput, onScriptGenerated]);

  const commandList = useMemo(() => Object.keys(commandHandlers), [commandHandlers]);

  // Check if input is a command and handle it
  const handleCommand = useCallback((userMessage: string) => {
    for (const cmd of commandList) {
      if (userMessage.trim() === cmd) {
        return commandHandlers[cmd]();
      }
    }
    return false;
  }, [commandList, commandHandlers]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const userMessage = input.trim()
      
      if (!userMessage) return
      
      // Check if this is a command before proceeding
      if (handleCommand(userMessage)) {
        return;
      }
      
      // Add user message to UI
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: Date.now().toString(), role: "user", content: userMessage },
      ])
      
      // Clear input and hide commands
      setInput("")
      setShowCommands(false)
      setIsLoading(true)
      
      try {
        // Send request to pipeline API
        const response = await fetch("/api/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              ...messages,
              { role: "user", content: userMessage }
            ],
            currentScript
          })
        })
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        
        const data = await response.json()
        
        // Process the response based on type
        if (data.type === ResponseType.SCRIPT) {
          // Update diagram in the editor
          onScriptGenerated(data.content)
          
          // Add explanation to chat
          setMessages((prevMessages) => [
            ...prevMessages,
            { 
              id: Date.now().toString(), 
              role: "assistant", 
              content: data.explanation || "I've updated the diagram." 
            },
          ])
        } else if (data.type === ResponseType.MESSAGE) {
          // Add message to chat
          setMessages((prevMessages) => [
            ...prevMessages,
            { 
              id: Date.now().toString(), 
              role: "assistant", 
              content: data.content 
            },
          ])
        } else if (data.type === ResponseType.ERROR) {
          // Handle error
          setMessages((prevMessages) => [
            ...prevMessages,
            { 
              id: Date.now().toString(), 
              role: "assistant", 
              content: `Error: ${data.content}` 
            },
          ])
        }
      } catch (error) {
        console.error("Failed to send message:", error)
        setMessages((prevMessages) => [
          ...prevMessages,
          { 
            id: Date.now().toString(), 
            role: "assistant", 
            content: "Sorry, I encountered an error processing your request." 
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [input, messages, currentScript, handleCommand, onScriptGenerated]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const value = e.target.value
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = value.slice(0, cursorPos)
    const currentWord = textBeforeCursor.split(/\s+/).pop() || ""
    setShowCommands(currentWord.startsWith("@"))
    setSelectedCommandIndex(0)

    // Reset the height to auto and set a specific width to get the correct scrollHeight
    e.target.style.height = "auto"
    e.target.style.width = `${e.target.offsetWidth}px` // Set a specific width

    // Calculate the new number of rows
    const newRows = Math.min(Math.max(Math.ceil((e.target.scrollHeight - 10) / lineHeight), minRows), maxRows)

    // Set the new height
    e.target.style.height = `${newRows * lineHeight}px`

    setRows(newRows)

    // Sync overlay scroll position with textarea
    const overlayDiv = e.target.previousSibling as HTMLDivElement
    if (overlayDiv) {
      overlayDiv.scrollTop = e.target.scrollTop
    }
  }

  const handleTextareaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const overlayDiv = e.currentTarget.previousSibling as HTMLDivElement
    if (overlayDiv) {
      overlayDiv.scrollTop = e.currentTarget.scrollTop
    }
  }

  const filteredCommands = input ? commandList.filter((cmd) => cmd.startsWith(input.split(/\s+/).pop() || "")) : []

  const insertCommand = (cmd: string) => {
    if (textareaRef.current) {
      const cursorPosition = textareaRef.current.selectionStart
      const textBeforeCursor = input.slice(0, cursorPosition)
      const textAfterCursor = input.slice(cursorPosition)
      const lastSpaceIndex = textBeforeCursor.lastIndexOf(" ")
      const newValue = textBeforeCursor.slice(0, lastSpaceIndex + 1) + cmd + " " + textAfterCursor
      setInput(newValue)
      setShowCommands(false)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          const newPos = lastSpaceIndex + 1 + cmd.length + 1
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newPos
        }
      }, 0)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommands && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedCommandIndex((prevIndex) => (prevIndex < filteredCommands.length - 1 ? prevIndex + 1 : prevIndex))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedCommandIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : prevIndex))
      } else if (e.key === "Enter" && !e.shiftKey) {
        if (filteredCommands[selectedCommandIndex]?.startsWith("@")) {
          // Insert the command instead of submitting
          e.preventDefault()
          insertCommand(filteredCommands[selectedCommandIndex])
          return
        }
        e.preventDefault()
        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
      } else if (e.key === "Escape") {
        setShowCommands(false)
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
    }
  }

  const highlightText = (text: string) => {
    return text.split(/(@\w+)/).map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <span key={index} className="bg-blue-100 text-blue-800 rounded py-0.5">
            {part}
          </span>
        )
      } else {
        return <span key={index} className="text-white">{part}</span>
      }
    })
  }

  // Shared styles so both the overlay and textarea align
  const sharedStyle: React.CSSProperties = {
    fontSize: "1rem",
    lineHeight: "1.5", // Matches lineHeight of 24px (1.5 * 16px base)
    padding: "8px", // Explicit pixels for consistency (0.5rem = 8px typically)
    fontFamily: "inherit", // Ensures same font as textarea
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    wordBreak: "break-word",
    boxSizing: "border-box", // Ensures padding doesn't offset alignment
    transition: "all 0.2s ease-in-out",
  }

  return (
    <Card className="flex flex-col h-full bg-slate-600">
      <CardContent className="flex-1 p-4">
        <ScrollArea ref={scrollAreaRef} className="h-[500px] pr-4 pl-4 overflow-y-auto bg-slate-900 rounded-lg">
          {messages.map((message) => (
            <div key={message.id} className={`mb-4 ${message.role === "user" ? "text-rose-400" : "text-green-600"}`}>
              <p className="whitespace-pre-wrap">
                {message.content.split(/(@\w+)/).map((part, index) =>
                  part.startsWith("@") ? (
                    <Badge key={index} variant="secondary" className="mr-1 bg-blue-100 text-blue-800">
                      {part}
                    </Badge>
                  ) : (
                    part
                  ),
                )}
              </p>
            </div>
          ))}
          {isLoading && (
            <div className="text-green-600 animate-pulse">
              <p>Thinking...</p>
            </div>
          )}
        </ScrollArea>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
          <div className="relative">
            {/* Overlay that displays highlighted commands */}
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden bg-slate-900 z-0 "
              style={{
                ...sharedStyle,
                height: `${Math.min(rows, maxRows) * lineHeight}px`,
                overflowY: rows > maxRows ? "scroll" : "hidden",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {highlightText(input)}
            </div>
            {/* The real Textarea which remains fully functional */}
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onScroll={handleTextareaScroll}
              placeholder="Ask about PlantUML diagrams..."
              className="relative caret-white bg-transparent resize-none pr-10 transition-all duration-200 ease-in-out z-1"
              style={{
                ...sharedStyle,
                minHeight: `${minRows * lineHeight}px`,
                maxHeight: `${maxRows * lineHeight}px`,
                height: `${Math.min(rows, maxRows) * lineHeight}px`,
                overflowY: rows > maxRows ? "scroll" : "hidden", 
                caretColor: "white", 
                color: "transparent", 
                position: "relative", 
              }}
              disabled={isLoading}
            />
            {showCommands && filteredCommands.length > 0 && (
              <div
                ref={commandsRef}
                className="absolute bottom-full left-0 w-full bg-white border border-gray-200 rounded-md shadow-lg z-10"
              >
                <ul className="py-1">
                  {filteredCommands.map((cmd, index) => (
                    <li
                      key={cmd}
                      className={`px-4 py-2 cursor-pointer ${
                        index === selectedCommandIndex ? "bg-blue-100" : "hover:bg-gray-100"
                      }`}
                      onClick={() => insertCommand(cmd)}
                    >
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {cmd}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <Button type="submit" className="self-end" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
````

## File: lib/ai-pipeline/contextManager.ts
````typescript
import { BufferMemory } from "langchain/memory";
import { DiagramIntent } from "./inputProcessor";
import pino from "pino";

// Setup logger
const logger = pino({
  browser: {
    asObject: true
  }
});

/**
 * Interface defining a message in the conversation history
 */
export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

/**
 * Interface defining the diagram metadata
 */
export interface DiagramMetadata {
  id?: string;
  type?: string;
  lastModified: Date;
  createdAt: Date;
  version: number;
  history: string[];
}

/**
 * Class for managing context in the AI pipeline
 * Maintains diagram state, conversation history, and session metadata
 */
export class ContextManager {
  private currentDiagram: string;
  private diagramMetadata: DiagramMetadata;
  private memory: BufferMemory | null = null;
  private sessionId: string;
  private messages: Message[];
  private lastIntent: DiagramIntent;
  private isMemoryInitialized: boolean = false;

  /**
   * Constructor for the ContextManager
   * @param sessionId - Unique identifier for the current session
   * @param initialDiagram - Initial diagram code (if any)
   */
  constructor(sessionId: string = "", initialDiagram: string = "") {
    this.sessionId = sessionId || `session_${Date.now()}`;
    this.currentDiagram = initialDiagram;
    this.messages = [];
    this.lastIntent = DiagramIntent.UNKNOWN;
    
    // Initialize memory lazily to avoid issues
    try {
      this.memory = new BufferMemory({
        returnMessages: true,
        memoryKey: "conversation_history"
      });
    } catch (error) {
      logger.error("Failed to initialize LangChain memory:", error);
      this.memory = null;
    }
    
    // Initialize diagram metadata
    const now = new Date();
    this.diagramMetadata = {
      lastModified: now,
      createdAt: now,
      version: 1,
      history: initialDiagram ? [initialDiagram] : []
    };
    
    logger.info("Context manager initialized", { sessionId: this.sessionId });
  }

  /**
   * Updates the current diagram and its metadata
   * @param newDiagram - The new diagram code
   * @param intent - The intent that caused this update
   */
  public updateDiagram(newDiagram: string, intent: DiagramIntent = DiagramIntent.MODIFY): void {
    // Don't update if diagram hasn't changed
    if (this.currentDiagram === newDiagram) {
      return;
    }
    
    this.currentDiagram = newDiagram;
    
    // Update metadata
    this.diagramMetadata.lastModified = new Date();
    this.diagramMetadata.version += 1;
    this.diagramMetadata.history.push(newDiagram);
    
    // Limit history size
    if (this.diagramMetadata.history.length > 10) {
      this.diagramMetadata.history = this.diagramMetadata.history.slice(-10);
    }
    
    // If this is a new generation, reset creation time
    if (intent === DiagramIntent.GENERATE) {
      this.diagramMetadata.createdAt = new Date();
      this.diagramMetadata.version = 1;
    }
    
    logger.info("Diagram updated", { 
      version: this.diagramMetadata.version,
      intent: intent
    });
  }

  /**
   * Adds a message to the conversation history
   * @param role - Role of the message sender (user or assistant)
   * @param content - Content of the message
   */
  public async addMessage(role: "user" | "assistant", content: string): Promise<void> {
    const message: Message = {
      role,
      content,
      timestamp: new Date()
    };
    
    this.messages.push(message);
    
    // Only try to use memory if it was successfully initialized
    if (this.memory) {
      try {
        // Add to LangChain memory
        if (role === "user") {
          // For user messages, just save with empty output
          await this.memory.saveContext({ input: content }, { output: "" });
          this.isMemoryInitialized = true;
        } else if (role === "assistant" && this.isMemoryInitialized) {
          // For assistant messages, update the last output if memory is initialized
          const memoryVariables = await this.memory.loadMemoryVariables({});
          const chatHistory = memoryVariables.conversation_history || [];
          
          // Only try to update if we have history
          if (Array.isArray(chatHistory) && chatHistory.length > 0) {
            const lastMessage = chatHistory[chatHistory.length - 1];
            if (lastMessage && typeof lastMessage.content === 'string') {
              await this.memory.saveContext(
                { input: lastMessage.content }, 
                { output: content }
              );
            }
          }
        }
      } catch (error) {
        logger.error("Error saving message to memory:", error);
        // Continue execution even if memory fails - we still have the messages array
      }
    }
    
    logger.info("Message added to context", { role });
  }

  /**
   * Sets the last detected intent
   * @param intent - The intent to set
   */
  public setLastIntent(intent: DiagramIntent): void {
    this.lastIntent = intent;
    logger.info("Intent updated", { intent });
  }

  /**
   * Gets the current diagram
   * @returns The current diagram code
   */
  public getCurrentDiagram(): string {
    return this.currentDiagram;
  }

  /**
   * Gets the diagram metadata
   * @returns The current diagram metadata
   */
  public getDiagramMetadata(): DiagramMetadata {
    return { ...this.diagramMetadata };
  }

  /**
   * Gets the conversation history
   * @param limit - Optional limit on the number of messages to return
   * @returns An array of messages
   */
  public getConversationHistory(limit?: number): Message[] {
    if (limit && limit > 0) {
      return [...this.messages].slice(-limit);
    }
    return [...this.messages];
  }

  /**
   * Gets the last detected intent
   * @returns The last intent
   */
  public getLastIntent(): DiagramIntent {
    return this.lastIntent;
  }

  /**
   * Gets the conversation history in a format suitable for LLM context
   * @param limit - Optional limit on the number of messages to return
   * @returns Formatted conversation history string
   */
  public async getFormattedConversationHistory(limit?: number): Promise<string> {
    // If memory is unavailable or fails, fall back to the messages array
    if (!this.memory || !this.isMemoryInitialized) {
      return this.messages
        .slice(limit ? -limit : 0)
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
    }
    
    try {
      const memoryVariables = await this.memory.loadMemoryVariables({});
      const history = memoryVariables.conversation_history || [];
      
      // If no history from memory, use the messages array
      if (!Array.isArray(history) || history.length === 0) {
        return this.messages
          .slice(limit ? -limit : 0)
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n');
      }
      
      // Format the history from memory
      return history
        .slice(limit ? -limit : 0)
        .map((msg: { type: string; content: string }) => 
          `${msg.type || 'unknown'}: ${msg.content}`)
        .join('\n');
    } catch (error) {
      logger.error("Error loading conversation history:", error);
      // Fallback to messages array if memory fails
      return this.messages
        .slice(limit ? -limit : 0)
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
    }
  }

  /**
   * Gets the complete context for agent operations
   * @returns An object containing all relevant context for agents
   */
  public async getCompleteContext(): Promise<Record<string, unknown>> {
    return {
      currentDiagram: this.currentDiagram,
      diagramMetadata: this.diagramMetadata,
      lastIntent: this.lastIntent,
      sessionId: this.sessionId,
      conversationHistory: await this.getFormattedConversationHistory()
    };
  }

  /**
   * Gets context specifically tailored for diagram generation
   * @returns Context for the generator agent
   */
  public async getGeneratorContext(): Promise<Record<string, unknown>> {
    return {
      conversationHistory: await this.getFormattedConversationHistory(5),
      lastIntent: this.lastIntent,
      sessionId: this.sessionId
    };
  }

  /**
   * Gets context specifically tailored for diagram modification
   * @returns Context for the modifier agent
   */
  public async getModifierContext(): Promise<Record<string, unknown>> {
    return {
      currentDiagram: this.currentDiagram,
      diagramMetadata: {
        version: this.diagramMetadata.version,
        lastModified: this.diagramMetadata.lastModified
      },
      conversationHistory: await this.getFormattedConversationHistory(3),
      lastIntent: this.lastIntent
    };
  }

  /**
   * Gets context specifically tailored for diagram analysis
   * @returns Context for the analyzer agent
   */
  public async getAnalyzerContext(): Promise<Record<string, unknown>> {
    return {
      currentDiagram: this.currentDiagram,
      diagramMetadata: {
        version: this.diagramMetadata.version,
        type: this.diagramMetadata.type
      },
      lastIntent: this.lastIntent
    };
  }

  /**
   * Resets the current diagram state
   */
  public resetDiagram(): void {
    this.currentDiagram = "";
    const now = new Date();
    this.diagramMetadata = {
      lastModified: now,
      createdAt: now,
      version: 0,
      history: []
    };
    logger.info("Diagram state reset");
  }

  /**
   * Clears the conversation history
   */
  public async clearConversation(): Promise<void> {
    this.messages = [];
    this.isMemoryInitialized = false;
    
    // Recreate memory instance to clear it
    try {
      this.memory = new BufferMemory({
        returnMessages: true,
        memoryKey: "conversation_history"
      });
    } catch (error) {
      logger.error("Error recreating memory:", error);
      this.memory = null;
    }
    
    logger.info("Conversation history cleared");
  }
}

// Export an instance for singleton usage across the application
export const contextManager = new ContextManager();
````

## File: lib/ai-pipeline/inputProcessor.ts
````typescript
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";
import { StructuredOutputParser, StringOutputParser } from "@langchain/core/output_parsers";
import { model, baseSystemPrompt } from "./baseChain";
import pino from "pino";

// Setup logger
const logger = pino({
  browser: {
    asObject: true
  }
});

/**
 * Enum defining the possible user intents for diagram operations
 */
export enum DiagramIntent {
  GENERATE = "GENERATE", // User wants to create a new diagram
  MODIFY = "MODIFY",     // User wants to change an existing diagram
  ANALYZE = "ANALYZE",   // User wants to analyze or get information about a diagram
  UNKNOWN = "UNKNOWN"    // Intent couldn't be determined
}

/**
 * Schema for validating input parameters
 */
const inputParamsSchema = z.object({
  userInput: z.string().min(1, "User input is required"),
  currentDiagram: z.string().optional(),
  conversation: z.array(z.string()).optional()
});

/**
 * Type definition for input parameters
 */
export type InputProcessorParams = z.infer<typeof inputParamsSchema>;

/**
 * Schema defining the structure of the intent classification output
 */
const intentOutputSchema = z.object({
  intent: z.nativeEnum(DiagramIntent),
  confidence: z.number().min(0).max(1),
  extractedParameters: z.object({
    diagramType: z.string().optional(),
    analysisType: z.string().optional(),
    modificationDescription: z.string().optional(),
    generationRequirements: z.string().optional()
  }).optional() // Make the entire object optional
});

/**
 * Type definition for the intent classification result
 */
export type IntentClassification = z.infer<typeof intentOutputSchema>;

/**
 * Classifies user intent regarding PlantUML diagrams.
 * 
 * This function analyzes a user's message to determine if they want to 
 * generate a new diagram, modify an existing one, or analyze a diagram.
 * 
 * @param params - The input parameters containing the user message and context
 * @returns A promise resolving to an intent classification object
 */
export async function classifyIntent(params: InputProcessorParams): Promise<IntentClassification> {
  try {
    // Validate input parameters
    const validatedParams = inputParamsSchema.parse(params);
    
    // Precompute template values for better readability
    const { userInput, currentDiagram = "", conversation = [] } = validatedParams;
    const currentDiagramStatus = currentDiagram ? "YES" : "NO";
    const conversationHistory = conversation.length > 0 ? `Previous conversation:\n${conversation.join('\n')}` : '';
    
    // Try to use a simpler classification approach first
    try {
      // First try the simple parser
      const intentClassifierPrompt = PromptTemplate.fromTemplate(`
        ${baseSystemPrompt}
        
        Your task is to classify the user's intent regarding PlantUML diagrams.
        
        Current diagram present: ${currentDiagramStatus}
        
        User request: ${userInput}
        
        ${conversationHistory}
        
        Classify the intent as one of: GENERATE (for creating a new diagram), MODIFY (for changing an existing diagram), ANALYZE (for examining a diagram), or UNKNOWN (if unclear).
        
        Return ONLY ONE WORD: GENERATE, MODIFY, ANALYZE, or UNKNOWN.
      `);
      
      // Create the simple classification chain with string output
      const simpleClassificationChain = RunnableSequence.from([
        intentClassifierPrompt,
        model,
        new StringOutputParser()
      ]);
      
      // Execute the chain with the input
      const result = await simpleClassificationChain.invoke({});
      const intentString = String(result).trim().toUpperCase();
      
      // Map the string to an enum value
      let intentEnum: DiagramIntent;
      switch (intentString) {
        case "GENERATE":
          intentEnum = DiagramIntent.GENERATE;
          break;
        case "MODIFY":
          intentEnum = DiagramIntent.MODIFY;
          break;
        case "ANALYZE":
          intentEnum = DiagramIntent.ANALYZE;
          break;
        default:
          intentEnum = DiagramIntent.UNKNOWN;
      }
      
      logger.info("Intent classification completed (simple)", { intent: intentEnum });
      
      // Return a simple classification
      return {
        intent: intentEnum,
        confidence: 0.8, // Arbitrary confidence since we didn't calculate it
        extractedParameters: {} // No extracted parameters in simple mode
      };
      
    } catch (simpleError) {
      // If simple classification fails, fall back to structured output
      logger.warn("Simple intent classification failed, trying structured approach", { error: simpleError });
      
      // Create intent classifier prompt with precomputed values
      const detailedPrompt = PromptTemplate.fromTemplate(`
        ${baseSystemPrompt}
        
        Your task is to classify the user's intent regarding PlantUML diagrams.
        
        Current diagram present: ${currentDiagramStatus}
        
        User request: ${userInput}
        
        ${conversationHistory}
        
        Classify the intent as one of: GENERATE (for creating a new diagram), MODIFY (for changing an existing diagram), ANALYZE (for examining a diagram), or UNKNOWN (if unclear).
        
        Analyze the confidence of your classification on a scale from 0 to 1.
        
        ${StructuredOutputParser.fromZodSchema(intentOutputSchema).getFormatInstructions()}
      `);
      
      // Create a parser for structured output
      const parser = StructuredOutputParser.fromZodSchema(intentOutputSchema);

      // Create the intent classification chain
      const detailedClassificationChain = RunnableSequence.from([
        detailedPrompt,
        model,
        parser
      ]);

      // Execute the chain with the input
      const result = await detailedClassificationChain.invoke({});
      logger.info("Intent classification completed (detailed)", { 
        intent: result.intent, 
        confidence: result.confidence 
      });
      
      return result;
    }
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("Input validation error:", { errors: error.errors });
      // Return a validation error classification
      return {
        intent: DiagramIntent.UNKNOWN,
        confidence: 0,
        extractedParameters: {
          generationRequirements: "Invalid input parameters provided"
        }
      };
    } else if (error instanceof Error) {
      logger.error("Error classifying intent:", { 
        message: error.message, 
        stack: error.stack,
        input: params.userInput,
        currentDiagram: params.currentDiagram ? "present" : "absent"
      });
    } else {
      logger.error("Unknown error during intent classification:", { 
        error,
        input: params.userInput,
        currentDiagram: params.currentDiagram ? "present" : "absent"
      });
    }
    
    // Return a fallback classification on error
    return {
      intent: DiagramIntent.UNKNOWN,
      confidence: 0,
      extractedParameters: {}
    };
  }
}
````

## File: lib/ai-pipeline/taskRouter.ts
````typescript
import { RunnableSequence } from "@langchain/core/runnables";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { model } from "./baseChain";
import { DiagramIntent } from "./inputProcessor";
import { contextManager } from "./contextManager";
import { diagramGenerator } from "./agents/generator";
import { diagramModifier } from "./agents/modifier";
import { diagramAnalyzer } from "./agents/analyzer";
import pino from "pino";

// Setup logger
const logger = pino({
  browser: {
    asObject: true
  }
});

// Define the task router prompt template
const routerPromptTemplate = PromptTemplate.fromTemplate(`
You are a task router for a PlantUML diagram assistant.
Based on the user's message and the current state of the diagram, determine which specialized agent
should handle this request.

User message: {userInput}

Current diagram: {currentDiagram}

Previous messages: {messageHistory}

Classify the request into exactly one of the following categories:
- GENERATE: Create a new diagram or a completely different one
- MODIFY: Make changes to an existing diagram
- ANALYZE: Explain, interpret, or provide feedback on the diagram

Return only the category name (GENERATE, MODIFY, or ANALYZE) with no additional text.
`);

// Create the task router chain
export const taskRouter = RunnableSequence.from([
  routerPromptTemplate,
  model,
  new StringOutputParser(),
]);

/**
 * Routes the request to the appropriate specialized agent based on intent
 * @param params - Object containing user input, current diagram and message history
 * @returns Response from the appropriate specialized agent
 */
export async function routeRequest({ 
  userInput, 
  currentDiagram, 
  messageHistory 
}: { 
  userInput: string; 
  currentDiagram: string; 
  messageHistory: string;
}) {
  try {
    // Get the task classification
    const taskType = await taskRouter.invoke({
      userInput,
      currentDiagram,
      messageHistory,
    });

    // Update context with intent
    let intent: DiagramIntent;
    
    // Route to the appropriate agent based on the task type
    switch (taskType.trim().toUpperCase()) {
      case "GENERATE":
        intent = DiagramIntent.GENERATE;
        contextManager.setLastIntent(intent);
        logger.info("Routing to generator agent", { userInput });
        return await diagramGenerator.generate({ 
          userInput, 
          context: await contextManager.getGeneratorContext()
        });
        
      case "MODIFY":
        intent = DiagramIntent.MODIFY;
        contextManager.setLastIntent(intent);
        logger.info("Routing to modifier agent", { userInput });
        return await diagramModifier.modify({ 
          userInput, 
          currentDiagram, 
          context: await contextManager.getModifierContext()
        });
        
      case "ANALYZE":
        intent = DiagramIntent.ANALYZE;
        contextManager.setLastIntent(intent);
        logger.info("Routing to analyzer agent", { userInput });
        return await diagramAnalyzer.analyze({ 
          userInput, 
          diagram: currentDiagram, 
          context: await contextManager.getAnalyzerContext()
        });
        
      default:
        // Fallback if classification is unclear
        intent = DiagramIntent.UNKNOWN;
        contextManager.setLastIntent(intent);
        logger.warn(`Unknown task type: ${taskType}. Defaulting to ANALYZE.`);
        return await diagramAnalyzer.analyze({ 
          userInput, 
          diagram: currentDiagram, 
          context: await contextManager.getAnalyzerContext()
        });
    }
  } catch (error) {
    logger.error("Error in task router:", error);
    return {
      type: "error",
      content: "I encountered an error determining how to process your request. Please try again.",
    };
  }
}
````

## File: next.config.ts
````typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  
  /* config options here */
};

export default nextConfig;
````

## File: README.md
````markdown
# Model Mind

Model Mind is a web application designed to assist users in modeling systems through an interactive chatbox. The chatbox guides users by asking questions to help them define their system. Based on the user's responses, the AI agent generates a model in PlantUML format.

Users can manually modify the generated code, view a live preview of the diagram, and continue refining the model with AI assistance.

---

## Features

- **AI-Powered Chat Assistant**: Guides users in creating and modifying PlantUML diagrams.
- **Code Editor**: Allows users to manually edit the PlantUML script with syntax highlighting.
- **Live Preview**: Displays real-time updates of the PlantUML diagram as users make changes.
- **Command Support**: Use commands like `@clear` to reset the chat or `@reset` to clear the diagram.
- **Customizable Themes**: Dark mode and TailwindCSS-based styling for a modern UI. (in progress)

---

## Getting Started

### Prerequisites

Ensure you have the following installed:

- Node.js (v18 or higher)
- npm, yarn, pnpm, or bun (for package management)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/modelmind-v1.git
   cd modelmind-v1
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. Create a `.env` file in the root directory and add your OpenAI API key:

   ```env
   OPENAI_API_KEY=your_openai_api_key
   ```

### Running the Development Server

Start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

---

## Usage

1. **Chat Assistant**: Use the chat interface to describe your system or request modifications to the diagram.
2. **Code Editor**: Edit the PlantUML script directly in the code editor.
3. **Live Preview**: View the updated diagram in the preview panel.

### Commands

- `@clear`: Clears the chat history.
- `@reset`: Resets the PlantUML diagram to an empty state.

---

## Project Structure

```
.
├── app/
│   ├── api/               # API routes for chat and OpenAI integration
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Main page component
├── components/
│   ├── chat-interface/    # Chat assistant components
│   ├── code-editor/       # Code editor components
│   ├── preview/           # Diagram preview components
│   └── ui/                # Reusable UI components
├── lib/
│   └── utils/             # Utility functions (e.g., PlantUML encoding)
├── public/                # Static assets
├── .env                   # Environment variables
├── package.json           # Project metadata and dependencies
└── README.md              # Project documentation
```

---

## Technologies Used

- **Frontend**: React, Next.js, TailwindCSS
- **Editor**: Monaco Editor
- **AI Integration**: OpenAI API
- **Diagram Generation**: PlantUML

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Commit your changes and push the branch.
4. Submit a pull request.

---

## License

The project is licensed under the [MIT license](./LICENSE).

---

## Acknowledgments

- [OpenAI](https://openai.com/) for the GPT models.
- [PlantUML](https://plantuml.com/) for diagram generation.
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) for the code editor.
- [TailwindCSS](https://tailwindcss.com/) for styling.
````

## File: tailwind.config.ts
````typescript
import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
````

## File: tsconfig.json
````json
{
  "compilerOptions": {
    "noImplicitAny": false,
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"],  
}
````

## File: package.json
````json
{
  "name": "modelmind-v1",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@ai-sdk/openai": "^1.1.0",
    "@langchain/core": "^0.3.43",
    "@langchain/openai": "^0.5.2",
    "@monaco-editor/react": "^4.7.0",
    "@radix-ui/react-accordion": "^1.2.2",
    "@radix-ui/react-popover": "^1.1.6",
    "@radix-ui/react-scroll-area": "^1.2.2",
    "@radix-ui/react-slot": "^1.1.1",
    "ai": "^4.1.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "dotenv": "^16.4.7",
    "langchain": "^0.3.19",
    "lucide-react": "^0.473.0",
    "next": "15.1.6",
    "openai": "^4.80.0",
    "pino": "^9.6.0",
    "plantuml-encoder": "^1.4.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3",
    "@types/node": "^20",
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.1",
    "eslint": "^9",
    "eslint-config-next": "15.1.6",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
````
