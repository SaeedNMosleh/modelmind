import { NextResponse } from 'next/server';
import pino from 'pino';

const logger = pino({ name: 'api' });

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
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
  details?: any
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
  details: any
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

export function handleApiError(error: any): NextResponse<ApiResponse> {
  if (error.name === 'ValidationError') {
    return createValidationErrorResponse(error.errors);
  }
  
  if (error.name === 'CastError') {
    return createErrorResponse(
      'Invalid ID format',
      'INVALID_ID',
      400
    );
  }
  
  if (error.code === 11000) {
    return createConflictResponse(
      'Resource already exists with these unique fields'
    );
  }

  logger.error({ error: error.message, stack: error.stack }, 'Unhandled API error');
  
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