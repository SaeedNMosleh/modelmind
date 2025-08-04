'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewPromptPage() {
  const router = useRouter();
  
  const handleCreatePrompt = () => {
    // Navigate to the edit page with 'new' ID
    router.push('/prompt-mgmt/new/edit');
  };
  
  const templates = [
    {
      name: 'PlantUML Class Diagram',
      description: 'Generate UML class diagrams with relationships and attributes',
      template: `You are an expert software architect. Generate a PlantUML class diagram for the following requirements:

{requirements}

Requirements:
- Use proper PlantUML syntax
- Include class relationships (inheritance, composition, aggregation)
- Add relevant attributes and methods
- Follow UML best practices
- Ensure the diagram is clear and well-structured

Context: {context}
Diagram Type: class`,
      agentType: 'generator',
      operation: 'generate',
      diagramType: ['class'],
      tags: ['plantuml', 'class-diagram', 'architecture']
    },
    {
      name: 'Sequence Diagram Generator',
      description: 'Create sequence diagrams showing interaction flows',
      template: `Generate a PlantUML sequence diagram that shows the interaction flow for:

{scenario}

Requirements:
- Show all participants and their interactions
- Include proper message ordering
- Add activation boxes where appropriate
- Use clear, descriptive message labels
- Handle error cases if specified
- Follow sequence diagram best practices

Additional Context: {context}
Participants: {participants}`,
      agentType: 'generator',
      operation: 'generate',
      diagramType: ['sequence'],
      tags: ['plantuml', 'sequence-diagram', 'interactions']
    },
    {
      name: 'Diagram Modifier',
      description: 'Modify existing diagrams based on change requests',
      template: `You are tasked with modifying an existing PlantUML diagram. Here is the current diagram:

{currentDiagram}

Modification Request: {modificationRequest}

Please make the requested changes while:
- Preserving the existing structure where possible
- Maintaining PlantUML syntax correctness
- Ensuring the diagram remains clear and readable
- Following the same style as the original
- Adding explanatory comments for significant changes

Return only the modified PlantUML code.`,
      agentType: 'modifier',
      operation: 'modify',
      diagramType: ['class', 'sequence', 'activity'],
      tags: ['plantuml', 'modification', 'refactoring']
    },
    {
      name: 'Diagram Analyzer',
      description: 'Analyze diagrams for quality and best practices',
      template: `Analyze the following PlantUML diagram for quality, completeness, and adherence to best practices:

{diagram}

Analysis Context: {context}

Please provide:
1. **Quality Assessment**: Rate the diagram quality (1-10) and explain
2. **Completeness Check**: Identify missing elements or relationships
3. **Best Practices**: Check adherence to UML and PlantUML conventions
4. **Improvements**: Suggest specific improvements
5. **Syntax Issues**: Note any syntax problems or warnings

Focus Areas: {focusAreas}`,
      agentType: 'analyzer',
      operation: 'analyze',
      diagramType: ['class', 'sequence', 'activity', 'component'],
      tags: ['plantuml', 'analysis', 'quality-check']
    }
  ];
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/prompt-mgmt">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Prompts
          </Link>
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <span>Create New Prompt</span>
          </h1>
          <p className="text-gray-600">
            Start from scratch or choose from our curated templates
          </p>
        </div>
      </div>
      
      {/* Quick Create */}
      <Card className="border-2 border-blue-200 ">
        <CardHeader>
          <CardTitle className="text-lg">Start from Scratch</CardTitle>
          <CardDescription>
            Create a completely custom prompt template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCreatePrompt} size="lg">
            <Sparkles className="h-4 w-4 mr-2" />
            Create Blank Prompt
          </Button>
        </CardContent>
      </Card>
      
      {/* Templates */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Choose from Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template, index) => (
            <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map(tag => (
                      <span 
                        key={tag}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    <span className="capitalize">{template.agentType}</span> • 
                    <span className="capitalize ml-1">{template.operation}</span> • 
                    <span className="ml-1">{template.diagramType.join(', ')}</span>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      // Store template data and navigate to editor
                      localStorage.setItem('promptTemplate', JSON.stringify(template));
                      router.push('/prompt-mgmt/new/edit');
                    }}
                  >
                    Use This Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Templates:</strong> Pre-built prompts for common diagram generation tasks
            </p>
            <p>
              <strong>Variables:</strong> Use {`{variableName}`} syntax to create dynamic prompts
            </p>
            <p>
              <strong>Agent Types:</strong> Choose generator, modifier, analyzer, or classifier based on your needs
            </p>
            <p>
              <strong>Testing:</strong> Always test your prompts before marking them as production-ready
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}