import { NextResponse } from 'next/server';
import { createEnhancedLogger } from "@/lib/utils/consola-logger";
import { ZodIssue } from 'zod';

const logger = createEnhancedLogger('api');

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: ValidationErrorDetails;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

export interface ValidationErrorDetails {
  [field: string]: {
    message: string;
    path?: string;
    value?: unknown;
    type?: string;
  }
}

export function createSuccessResponse<T>(
  data: T,
  meta?: ApiResponse['meta']
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    ...(meta && { meta })
  });
}

export function createErrorResponse(
  message: string,
  code: string = 'INTERNAL_ERROR',
  status: number = 500,
  details?: ValidationErrorDetails
): NextResponse<ApiResponse> {
  logger.error({ code, message, details, status }, 'API Error');
  
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && { details })
      }
    },
    { status }
  );
}

export function createValidationErrorResponse(
  details: ValidationErrorDetails
): NextResponse<ApiResponse> {
  return createErrorResponse(
    'Validation failed',
    'VALIDATION_ERROR',
    400,
    details
  );
}

export function createNotFoundResponse(
  resource: string = 'Resource'
): NextResponse<ApiResponse> {
  return createErrorResponse(
    `${resource} not found`,
    'NOT_FOUND',
    404
  );
}

export function createUnauthorizedResponse(): NextResponse<ApiResponse> {
  return createErrorResponse(
    'Unauthorized access',
    'UNAUTHORIZED',
    401
  );
}

export function createConflictResponse(
  message: string
): NextResponse<ApiResponse> {
  return createErrorResponse(
    message,
    'CONFLICT',
    409
  );
}

export function createRateLimitResponse(): NextResponse<ApiResponse> {
  return createErrorResponse(
    'Rate limit exceeded',
    'RATE_LIMIT',
    429
  );
}

// ValidationError interface for MongoDB/Mongoose validation errors
interface ValidationError {
  errors: ValidationErrorDetails;
  name: 'ValidationError';
}

// CastError interface for MongoDB/Mongoose cast errors
interface CastError {
  name: 'CastError';
  path: string;
  value: unknown;
  message: string;
}

export function handleApiError(error: Error | unknown): NextResponse<ApiResponse> {
  const err = error instanceof Error ? error : new Error(String(error));
  
  if (err.name === 'ValidationError') {
    return createValidationErrorResponse((error as ValidationError).errors);
  }
  
  if (err.name === 'CastError') {
    const castError = error as CastError;
    return createErrorResponse(
      `Invalid ID format: ${castError.value}`,
      'INVALID_ID',
      400
    );
  }
  
  // MongoDB duplicate key error
  interface MongoError {
    code?: number;
    keyPattern?: Record<string, number>;
    keyValue?: Record<string, string>;
  }
  
  const mongoError = error as MongoError;
  if (mongoError.code === 11000) {
    return createConflictResponse(
      'Resource already exists with these unique fields'
    );
  }

  logger.error({ error: err.message, stack: err.stack }, 'Unhandled API error');
  
  return createErrorResponse(
    'Internal server error',
    'INTERNAL_ERROR',
    500
  );
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
}

// Utility function to convert Zod errors to ValidationErrorDetails
export function zodErrorsToValidationDetails(errors: ZodIssue[]): ValidationErrorDetails {
  const errorDetails: ValidationErrorDetails = {};
  
  errors.forEach((err, index) => {
    const path = err.path.join('.');
    errorDetails[path || `error_${index}`] = {
      message: err.message,
      path: path,
      value: err.code
    };
  });
  
  return errorDetails;
}

// Helper to convert primitive values to ValidationErrorDetails
export function toValidationDetails(obj: Record<string, unknown>): ValidationErrorDetails {
  const result: ValidationErrorDetails = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && 'message' in (value as object)) {
      // Already in the correct format
      result[key] = value as { message: string; path?: string; value?: unknown };
    } else {
      // Convert primitive value to expected format
      result[key] = {
        message: typeof value === 'string' ? value : `${key}: ${String(value)}`,
        value: value
      };
    }
  }
  
  return result;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const sort = searchParams.get('sort') || 'createdAt';
  const order = (searchParams.get('order') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';
  
  return { page, limit, sort, order };
}

export function createPaginationMeta(
  total: number,
  page: number,
  limit: number
) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

/**
 * Standardized validation error creators - OPTIMIZED to reduce repetitive code
 */
export const ValidationErrors = {
  invalidId: (resource: string = 'ID') => 
    createErrorResponse(`Invalid ${resource.toLowerCase()} format`, 'INVALID_ID', 400),
  
  invalidPromptId: () => 
    createErrorResponse('Invalid prompt ID format', 'INVALID_ID', 400),
  
  invalidTestResultId: () => 
    createErrorResponse('Invalid test result ID format', 'INVALID_ID', 400),
  
  invalidTestCaseId: () => 
    createErrorResponse('Invalid test case ID format', 'INVALID_ID', 400),
  
  invalidVersion: () => 
    createErrorResponse('Invalid version format', 'INVALID_VERSION', 400),
  
  invalidRequestFormat: (details?: ZodIssue[]) => 
    createErrorResponse(
      'Invalid request format', 
      'VALIDATION_ERROR', 
      400, 
      details ? zodErrorsToValidationDetails(details) : undefined
    ),
  
  missingFields: (fields: string[]) => 
    createErrorResponse(
      `Missing required fields: ${fields.join(', ')}`, 
      'MISSING_FIELDS', 
      400
    ),
  
  resourceNotFound: (resource: string) => 
    createErrorResponse(`${resource} not found`, 'NOT_FOUND', 404),
  
  conflictError: (message: string) => 
    createErrorResponse(message, 'CONFLICT', 409)
} as const;