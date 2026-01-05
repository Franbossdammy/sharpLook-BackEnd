import { Response, NextFunction } from 'express';
declare class ReviewController {
    createReview: (req: import("express").Request, res: Response, next: NextFunction) => void;
    respondToReview: (req: import("express").Request, res: Response, next: NextFunction) => void;
    voteHelpful: (req: import("express").Request, res: Response, next: NextFunction) => void;
    flagReview: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getReviewById: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getUserReviews: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getReviewsForUser: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getServiceReviews: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getReviewStats: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getAllReviews: (req: import("express").Request, res: Response, next: NextFunction) => void;
    approveReview: (req: import("express").Request, res: Response, next: NextFunction) => void;
    hideReview: (req: import("express").Request, res: Response, next: NextFunction) => void;
    unhideReview: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: ReviewController;
export default _default;
//# sourceMappingURL=review.controller.d.ts.map