/**
 * Enhanced Consola-based logger configuration for ModelMind
 * Provides beautiful, readable logging with colors, 3-letter prefixes, and stage-specific colors
 */

import { consola, createConsola } from 'consola';

const isDevelopment = process.env.NODE_ENV === 'development';

// Stage-specific color schemes for pipeline visualization
const STAGE_COLORS = {
  // Request Processing
  api: '\x1b[36m',      // cyan - API entry points
  pipeline: '\x1b[35m', // magenta - main pipeline flow
  
  // AI Processing
  classifier: '\x1b[93m', // bright yellow - classification
  generator: '\x1b[92m',  // bright green - generation
  modifier: '\x1b[94m',   // bright blue - modification  
  analyzer: '\x1b[96m',   // bright cyan - analysis
  
  // Infrastructure
  database: '\x1b[33m',   // yellow - database ops
  prompts: '\x1b[37m',    // white - prompt operations
  testing: '\x1b[95m',    // bright magenta - testing
  scripts: '\x1b[90m',    // gray - utility scripts
  
  // Default
  app: '\x1b[97m'         // bright white - general
};

/**
 * Create a themed logger with context and stage-specific colors
 */
export function createLogger(context?: string) {
  const stageColor = context ? STAGE_COLORS[context as keyof typeof STAGE_COLORS] || STAGE_COLORS.app : STAGE_COLORS.app;
  
  const logger = createConsola({
    level: isDevelopment ? 4 : 3, // 4=debug, 3=info in development; 3=info in production
    formatOptions: {
      colors: isDevelopment,
      compact: !isDevelopment,
      date: isDevelopment,
    },
    // Custom reporters for different environments
    reporters: isDevelopment 
      ? [
          // Beautiful console output for development
          {
            log: (logObj) => {
              const { level, args, date, tag } = logObj;
              const timestamp = date?.toISOString().slice(11, 19) || new Date().toISOString().slice(11, 19);
              
              // 3-letter prefixes with icons
              const prefixes = {
                0: { code: 'FTL', icon: '💥' }, // fatal
                1: { code: 'ERR', icon: '🔴' }, // error  
                2: { code: 'WRN', icon: '⚠️' },  // warn
                3: { code: 'INF', icon: 'ℹ️' },  // info
                4: { code: 'DBG', icon: '🔍' }, // debug
                5: { code: 'TRC', icon: '📝' }  // trace
              };
              
              const reset = '\x1b[0m';
              const prefix = prefixes[level as keyof typeof prefixes] || prefixes[3];
              
              let output = `${stageColor}${timestamp} ${prefix.code}`;
              
              if (context || tag) {
                output += ` [${(context || tag).toUpperCase()}]`;
              }
              
              output += `${reset} ${prefix.icon} ${args.join(' ')}`;
              
              console.log(output);
            }
          }
        ]
      : [
          // Clean JSON output for production
          {
            log: (logObj) => {
              const { level, args, date, tag } = logObj;
              const levelNames = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
              
              const logEntry = {
                level: levelNames[level] || 'info',
                time: date?.toISOString() || new Date().toISOString(),
                service: 'modelmind',
                context: context || tag,
                msg: args.join(' ')
              };
              
              console.log(JSON.stringify(logEntry));
            }
          }
        ]
  });

  // Add context if provided
  if (context) {
    return logger.withTag(context);
  }

  return logger;
}

/**
 * Specialized loggers for different components
 */
export const loggers = {
  // AI Pipeline components  
  pipeline: createLogger('pipeline'),
  generator: createLogger('generator'),
  modifier: createLogger('modifier'), 
  analyzer: createLogger('analyzer'),
  classifier: createLogger('classifier'),
  
  // Core systems
  database: createLogger('database'),
  api: createLogger('api'),
  testing: createLogger('testing'),
  scripts: createLogger('scripts'),
  
  // Default logger
  app: createLogger('app')
};

/**
 * Performance timing utility with beautiful output
 */
export async function withTiming<T>(
  logger: any,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  logger.start(`⏱️  Starting ${operation}...`);
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logger.success(`✅ Completed ${operation} in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`❌ Failed ${operation} after ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Enhanced logging methods with specific use cases - focused on results, not user input
 */
export const createEnhancedLogger = (context: string) => {
  const base = createLogger(context);
  
  return {
    ...base,
    
    // AI Pipeline Stage Logging
    classification: (intent: string, confidence: number, diagramType?: string, duration?: number) => {
      const confidenceStr = `${(confidence * 100).toFixed(1)}%`;
      const timeStr = duration ? ` (${duration}ms)` : '';
      base.info(`🎯 Intent: ${intent} | Confidence: ${confidenceStr}${diagramType ? ` | Type: ${diagramType}` : ''}${timeStr}`);
    },
    
    generation: (diagramType: string, duration: number, lineCount?: number) => {
      const lines = lineCount ? ` | Lines: ${lineCount}` : '';
      base.success(`✨ Generated ${diagramType} diagram | Duration: ${duration}ms${lines}`);
    },
    
    modification: (diagramType: string, changes: number, duration: number) => {
      base.success(`🔧 Modified ${diagramType} diagram | Changes: ${changes} | Duration: ${duration}ms`);
    },
    
    analysis: (analysisType: string, diagramType: string, findings: number, duration: number) => {
      base.info(`🔍 Analysis: ${analysisType} | Type: ${diagramType} | Insights: ${findings} | Duration: ${duration}ms`);
    },
    
    // Request Flow Logging (without exposing user input)
    requestStart: (hasContext?: boolean) => {
      base.start(`🚀 Processing request${hasContext ? ' (with context)' : ''}`);
    },
    
    requestComplete: (duration: number, intent: string, result?: string) => {
      base.success(`✅ Request complete | Duration: ${duration}ms | Intent: ${intent}${result ? ` | Result: ${result}` : ''}`);
    },
    
    // Prompt and Database Operations
    promptLoaded: (source: 'mongodb' | 'embedded', agentType: string, duration: number) => {
      base.debug(`📝 Prompt loaded | Source: ${source} | Agent: ${agentType} | Duration: ${duration}ms`);
    },
    
    dbOperation: (operation: string, collection: string, count?: number, duration?: number) => {
      const countStr = count !== undefined ? ` | Count: ${count}` : '';
      const timeStr = duration ? ` | Duration: ${duration}ms` : '';
      base.debug(`🗄️ DB ${operation} | Collection: ${collection}${countStr}${timeStr}`);
    },
    
    // Performance and Context Logging
    stageStart: (stage: string) => {
      base.start(`⏳ Starting ${stage}`);
    },
    
    stageComplete: (stage: string, duration: number, result?: Record<string, any>) => {
      let resultStr = '';
      if (result) {
        const keys = Object.keys(result).slice(0, 3); // Show first 3 result fields
        resultStr = ` | ${keys.map(k => `${k}: ${result[k]}`).join(', ')}`;
      }
      base.success(`✅ Completed ${stage} | Duration: ${duration}ms${resultStr}`);
    },
    
    // Error logging with context (no user input exposure)
    failure: (operation: string, error: any, context?: Record<string, any>) => {
      base.error(`❌ ${operation} failed | Error: ${error.message || error}`);
      if (context && Object.keys(context).length > 0) {
        // Filter out sensitive information
        const safeContext = Object.fromEntries(
          Object.entries(context).filter(([key]) => 
            !key.toLowerCase().includes('input') && 
            !key.toLowerCase().includes('content') &&
            !key.toLowerCase().includes('message')
          )
        );
        if (Object.keys(safeContext).length > 0) {
          base.debug(`Context: ${JSON.stringify(safeContext)}`);
        }
      }
    },
    
    // API and Route Logging
    apiCall: (method: string, route: string, status?: number, duration?: number) => {
      const statusStr = status ? ` | Status: ${status}` : '';
      const timeStr = duration ? ` | Duration: ${duration}ms` : '';
      base.info(`🌐 ${method} ${route}${statusStr}${timeStr}`);
    }
  };
};

// Export default logger
export default loggers.app;