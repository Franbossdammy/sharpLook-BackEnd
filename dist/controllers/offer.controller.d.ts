import { Response, NextFunction } from 'express';
declare class OfferController {
    /**
     * Create new offer request
     * ✅ UPDATED: Added serviceType validation
     */
    createOffer: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get available offers (vendors)
     */
    getAvailableOffers: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Respond to offer (vendor)
     */
    respondToOffer: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Submit counter offer (client)
     */
    counterOffer: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Accept vendor response (client)
     */
    acceptResponse: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get offer by ID
     */
    getOfferById: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get my offers (client)
     */
    getMyOffers: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get my responses (vendor)
     */
    getMyResponses: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Close offer (client)
     */
    closeOffer: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Vendor accepts client's counter offer
     */
    acceptCounterOffer: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Vendor makes a counter offer to client's counter
     */
    vendorCounterOffer: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
   * Get all offers (admin)
   */
    getAllOffersAdmin: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get offer statistics (admin)
     */
    getOfferStatsAdmin: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Delete offer (admin)
     */
    deleteOffer: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: OfferController;
export default _default;
//# sourceMappingURL=offer.controller.d.ts.map