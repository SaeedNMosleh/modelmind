import { connectToDatabase, Prompt, TestCase, TestResult } from '@/lib/database';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  withTimeout
} from '@/lib/api/responses';
import { createEnhancedLogger } from "@/lib/utils/consola-logger";

const logger = createEnhancedLogger('prompts-health-api');

export async function GET() {
  const startTime = Date.now();
  
  try {
    const dbConnection = await withTimeout(connectToDatabase(), 5000);
    const dbConnectTime = Date.now() - startTime;

    const [
      promptStats,
      testCaseStats,
      testResultStats,
      versionStats
    ] = await Promise.all([
      Prompt.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            production: { $sum: { $cond: ['$isProduction', 1, 0] } },
            byAgentType: {
              $push: {
                agentType: '$agentType',
                count: 1
              }
            }
          }
        }
      ]),
      TestCase.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: ['$isActive', 1, 0] } }
          }
        }
      ]),
      TestResult.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            successful: { $sum: { $cond: ['$success', 1, 0] } },
            avgScore: { $avg: '$score' },
            avgLatency: { $avg: '$latencyMs' }
          }
        }
      ]),
      Prompt.aggregate([
        { $unwind: '$versions' },
        {
          $group: {
            _id: null,
            totalVersions: { $sum: 1 },
            activeVersions: { $sum: { $cond: ['$versions.isActive', 1, 0] } }
          }
        }
      ])
    ]);

    const agentTypeCounts = promptStats[0]?.byAgentType?.reduce((acc: Record<string, number>, item: { agentType: string }) => {
      acc[item.agentType] = (acc[item.agentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      performance: {
        dbConnectionTimeMs: dbConnectTime,
        totalResponseTimeMs: Date.now() - startTime
      },
      database: {
        connected: dbConnection?.readyState === 1,
        name: dbConnection?.name || 'unknown'
      },
      statistics: {
        prompts: {
          total: promptStats[0]?.total || 0,
          production: promptStats[0]?.production || 0,
          development: (promptStats[0]?.total || 0) - (promptStats[0]?.production || 0),
          byAgentType: agentTypeCounts
        },
        versions: {
          total: versionStats[0]?.totalVersions || 0,
          active: versionStats[0]?.activeVersions || 0
        },
        testCases: {
          total: testCaseStats[0]?.total || 0,
          active: testCaseStats[0]?.active || 0
        },
        testResults: {
          last24h: testResultStats[0]?.total || 0,
          successRate: testResultStats[0]?.total > 0 
            ? ((testResultStats[0]?.successful || 0) / testResultStats[0].total) 
            : 0,
          averageScore: testResultStats[0]?.avgScore || 0,
          averageLatencyMs: testResultStats[0]?.avgLatency || 0
        }
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    logger.info({
      dbConnectionTime: dbConnectTime,
      totalResponseTime: Date.now() - startTime,
      promptCount: healthData.statistics.prompts.total
    }, 'Health check completed');

    return createSuccessResponse(healthData);
    
  } catch (error: Error | unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message, stack: err.stack }, 'Health check failed');
    
    return createErrorResponse(
      'Health check failed',
      'HEALTH_CHECK_ERROR',
      503,
      {
        error: { message: err.message },
        responseTimeMs: { message: String(Date.now() - startTime) }
      }
    );
  }
}