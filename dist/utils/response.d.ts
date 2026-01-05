import { Response } from 'express';
declare class ResponseHandler {
    /**
     * Send success response
     */
    static success(res: Response, message?: string, data?: any, statusCode?: number, meta?: any): Response;
    /**
     * Send created response
     */
    static created(res: Response, message?: string, data?: any): Response;
    /**
     * Send error response
     */
    static error(res: Response, message?: string, statusCode?: number, error?: any, code?: string): Response;
    /**
     * Send validation error response
     */
    static validationError(res: Response, message: string | undefined, errors: any[]): Response;
    /**
     * Send not found response
     */
    static notFound(res: Response, message?: string): Response;
    /**
     * Send unauthorized response
     */
    static unauthorized(res: Response, message?: string): Response;
    /**
     * Send forbidden response
     */
    static forbidden(res: Response, message?: string): Response;
    /**
     * Send conflict response
     */
    static conflict(res: Response, message?: string): Response;
    /**
     * Send bad request response
     */
    static badRequest(res: Response, message?: string, error?: any): Response;
    /**
     * Send paginated response
     */
    static paginated(res: Response, message: string | undefined, data: any[], page: number, limit: number, total: number): Response;
}
export default ResponseHandler;
//# sourceMappingURL=response.d.ts.map