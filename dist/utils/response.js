"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ResponseHandler {
    /**
     * Send success response
     */
    static success(res, message = 'Operation successful', data = null, statusCode = 200, meta) {
        const response = {
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
    static created(res, message = 'Resource created successfully', data = null) {
        return this.success(res, message, data, 201);
    }
    /**
     * Send error response
     */
    static error(res, message = 'Operation failed', statusCode = 500, error, code) {
        const response = {
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
    static validationError(res, message = 'Validation failed', errors) {
        return this.error(res, message, 400, { errors }, 'VALIDATION_ERROR');
    }
    /**
     * Send not found response
     */
    static notFound(res, message = 'Resource not found') {
        return this.error(res, message, 404, null, 'NOT_FOUND');
    }
    /**
     * Send unauthorized response
     */
    static unauthorized(res, message = 'Unauthorized access') {
        return this.error(res, message, 401, null, 'UNAUTHORIZED');
    }
    /**
     * Send forbidden response
     */
    static forbidden(res, message = 'Access forbidden') {
        return this.error(res, message, 403, null, 'FORBIDDEN');
    }
    /**
     * Send conflict response
     */
    static conflict(res, message = 'Resource already exists') {
        return this.error(res, message, 409, null, 'CONFLICT');
    }
    /**
     * Send bad request response
     */
    static badRequest(res, message = 'Bad request', error) {
        return this.error(res, message, 400, error, 'BAD_REQUEST');
    }
    /**
     * Send paginated response
     */
    static paginated(res, message = 'Data retrieved successfully', data, page, limit, total) {
        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        return this.success(res, message, data, 200, {
            pagination: {
                currentPage: page,
                totalPages,
                pageSize: limit,
                totalItems: total,
                hasNextPage,
                hasPrevPage,
            },
        });
    }
}
exports.default = ResponseHandler;
//# sourceMappingURL=response.js.map