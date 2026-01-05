import { Response } from 'express';

interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
  meta?: any;
  timestamp: string;
}

class ResponseHandler {
  /**
   * Send success response
   */
  public static success(
    res: Response,
    message: string = 'Operation successful',
    data: any = null,
    statusCode: number = 200,
    meta?: any
  ): Response {
    const response: ApiResponse = {
      success: true,
      message,
      timestamp: new Date().toISOString(),
    };

    if (data !== null) {
      response.data = data;
    }

    if (meta) {
      response.meta = meta;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send created response
   */
  public static created(
    res: Response,
    message: string = 'Resource created successfully',
    data: any = null
  ): Response {
    return this.success(res, message, data, 201);
  }

  /**
   * Send error response
   */
  public static error(
    res: Response,
    message: string = 'Operation failed',
    statusCode: number = 500,
    error?: any,
    code?: string
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    };

    if (error) {
      response.error = error;
    }

    if (code) {
      response.error = { ...response.error, code };
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send validation error response
   */
  public static validationError(
    res: Response,
    message: string = 'Validation failed',
    errors: any[]
  ): Response {
    return this.error(res, message, 400, { errors }, 'VALIDATION_ERROR');
  }

  /**
   * Send not found response
   */
  public static notFound(
    res: Response,
    message: string = 'Resource not found'
  ): Response {
    return this.error(res, message, 404, null, 'NOT_FOUND');
  }

  /**
   * Send unauthorized response
   */
  public static unauthorized(
    res: Response,
    message: string = 'Unauthorized access'
  ): Response {
    return this.error(res, message, 401, null, 'UNAUTHORIZED');
  }

  /**
   * Send forbidden response
   */
  public static forbidden(
    res: Response,
    message: string = 'Access forbidden'
  ): Response {
    return this.error(res, message, 403, null, 'FORBIDDEN');
  }

  /**
   * Send conflict response
   */
  public static conflict(
    res: Response,
    message: string = 'Resource already exists'
  ): Response {
    return this.error(res, message, 409, null, 'CONFLICT');
  }

  /**
   * Send bad request response
   */
  public static badRequest(
    res: Response,
    message: string = 'Bad request',
    error?: any
  ): Response {
    return this.error(res, message, 400, error, 'BAD_REQUEST');
  }

  /**
   * Send paginated response
   */
  public static paginated(
    res: Response,
    message: string = 'Data retrieved successfully',
    data: any[],
    page: number,
    limit: number,
    total: number
  ): Response {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return this.success(
      res,
      message,
      data,
      200,
      {
        pagination: {
          currentPage: page,
          totalPages,
          pageSize: limit,
          totalItems: total,
          hasNextPage,
          hasPrevPage,
        },
      }
    );
  }
}

export default ResponseHandler;
