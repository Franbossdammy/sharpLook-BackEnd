interface DeliveryPricing {
    baseDistanceKm?: number;
    baseFee?: number;
    pricePerKm?: number;
    maxDeliveryDistance?: number;
}
interface LocationCoordinates {
    latitude: number;
    longitude: number;
}
interface DeliveryCalculation {
    distance: number;
    deliveryFee: number;
    estimatedDeliveryTime: string;
    canDeliver: boolean;
    message?: string;
}
declare class DeliveryService {
    private defaultPricing;
    /**
     * Calculate delivery fee based on distance between two locations
     */
    calculateDeliveryFee(vendorLocation: LocationCoordinates, customerLocation: LocationCoordinates, customPricing?: DeliveryPricing, freeDelivery?: boolean): DeliveryCalculation;
    /**
     * Calculate delivery fee from coordinates array format [longitude, latitude]
     */
    calculateDeliveryFeeFromCoordinates(vendorCoordinates: [number, number], customerCoordinates: [number, number], customPricing?: DeliveryPricing, freeDelivery?: boolean): DeliveryCalculation;
    /**
     * Estimate delivery time based on distance
     */
    private estimateDeliveryTime;
    /**
     * Validate that both locations have coordinates
     */
    validateLocations(vendorLocation?: {
        type?: string;
        coordinates?: [number, number];
    }, customerLocation?: {
        type?: string;
        coordinates?: [number, number];
    }): void;
    /**
     * Get delivery zones (for display purposes)
     */
    getDeliveryZones(customPricing?: DeliveryPricing): Array<{
        zone: string;
        distanceRange: string;
        baseFee: number;
        description: string;
    }>;
}
declare const _default: DeliveryService;
export default _default;
//# sourceMappingURL=delivery.service.d.ts.map