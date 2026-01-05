"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const errors_1 = require("../utils/errors");
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
class DeliveryService {
    constructor() {
        // Default delivery pricing (can be overridden per product/vendor)
        this.defaultPricing = {
            baseDistanceKm: 5,
            baseFee: 500, // ₦500 for first 5km
            pricePerKm: 100, // ₦100 per additional km
            maxDeliveryDistance: 50, // 50km max
        };
    }
    /**
     * Calculate delivery fee based on distance between two locations
     */
    calculateDeliveryFee(vendorLocation, customerLocation, customPricing, freeDelivery = false) {
        // Calculate distance
        const distance = (0, helpers_1.calculateDistance)(vendorLocation.latitude, vendorLocation.longitude, customerLocation.latitude, customerLocation.longitude);
        // Use custom pricing or defaults
        const pricing = {
            baseDistanceKm: customPricing?.baseDistanceKm ?? this.defaultPricing.baseDistanceKm,
            baseFee: customPricing?.baseFee ?? this.defaultPricing.baseFee,
            pricePerKm: customPricing?.pricePerKm ?? this.defaultPricing.pricePerKm,
            maxDeliveryDistance: customPricing?.maxDeliveryDistance ?? this.defaultPricing.maxDeliveryDistance,
        };
        // Check if distance exceeds maximum delivery distance
        if (distance > pricing.maxDeliveryDistance) {
            return {
                distance,
                deliveryFee: 0,
                estimatedDeliveryTime: 'N/A',
                canDeliver: false,
                message: `Delivery not available. Maximum delivery distance is ${pricing.maxDeliveryDistance}km. Your location is ${distance.toFixed(2)}km away.`,
            };
        }
        // Calculate fee
        let deliveryFee = 0;
        if (!freeDelivery) {
            if (distance <= pricing.baseDistanceKm) {
                // Within base distance
                deliveryFee = pricing.baseFee;
            }
            else {
                // Beyond base distance
                const extraKm = distance - pricing.baseDistanceKm;
                deliveryFee = pricing.baseFee + (extraKm * pricing.pricePerKm);
            }
            // Round to nearest 50 Naira
            deliveryFee = Math.round(deliveryFee / 50) * 50;
        }
        // Estimate delivery time based on distance
        const estimatedDeliveryTime = this.estimateDeliveryTime(distance);
        logger_1.default.info(`Delivery fee calculated: ${deliveryFee} for ${distance.toFixed(2)}km`);
        return {
            distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
            deliveryFee,
            estimatedDeliveryTime,
            canDeliver: true,
            message: `Delivery available to your location (${distance.toFixed(2)}km away)`,
        };
    }
    /**
     * Calculate delivery fee from coordinates array format [longitude, latitude]
     */
    calculateDeliveryFeeFromCoordinates(vendorCoordinates, customerCoordinates, customPricing, freeDelivery = false) {
        return this.calculateDeliveryFee({
            longitude: vendorCoordinates[0],
            latitude: vendorCoordinates[1],
        }, {
            longitude: customerCoordinates[0],
            latitude: customerCoordinates[1],
        }, customPricing, freeDelivery);
    }
    /**
     * Estimate delivery time based on distance
     */
    estimateDeliveryTime(distanceKm) {
        if (distanceKm <= 5) {
            return '1-2 days';
        }
        else if (distanceKm <= 15) {
            return '2-3 days';
        }
        else if (distanceKm <= 30) {
            return '3-4 days';
        }
        else if (distanceKm <= 50) {
            return '4-5 days';
        }
        else {
            return '5-7 days';
        }
    }
    /**
     * Validate that both locations have coordinates
     */
    validateLocations(vendorLocation, customerLocation) {
        if (!vendorLocation?.coordinates || vendorLocation.coordinates.length !== 2) {
            throw new errors_1.BadRequestError('Vendor location not available. Please ensure vendor has set their business location.');
        }
        if (!customerLocation?.coordinates || customerLocation.coordinates.length !== 2) {
            throw new errors_1.BadRequestError('Customer delivery address must include valid coordinates. Please provide a complete address with location.');
        }
        // Validate coordinate ranges
        const [vLng, vLat] = vendorLocation.coordinates;
        const [cLng, cLat] = customerLocation.coordinates;
        if (vLng < -180 || vLng > 180 || vLat < -90 || vLat > 90) {
            throw new errors_1.BadRequestError('Invalid vendor location coordinates');
        }
        if (cLng < -180 || cLng > 180 || cLat < -90 || cLat > 90) {
            throw new errors_1.BadRequestError('Invalid customer location coordinates');
        }
    }
    /**
     * Get delivery zones (for display purposes)
     */
    getDeliveryZones(customPricing) {
        const pricing = {
            baseDistanceKm: customPricing?.baseDistanceKm ?? this.defaultPricing.baseDistanceKm,
            baseFee: customPricing?.baseFee ?? this.defaultPricing.baseFee,
            pricePerKm: customPricing?.pricePerKm ?? this.defaultPricing.pricePerKm,
        };
        return [
            {
                zone: 'Zone 1',
                distanceRange: `0-${pricing.baseDistanceKm}km`,
                baseFee: pricing.baseFee,
                description: 'Base delivery fee',
            },
            {
                zone: 'Zone 2',
                distanceRange: `${pricing.baseDistanceKm + 1}-15km`,
                baseFee: pricing.baseFee + (10 * pricing.pricePerKm),
                description: `Base fee + ₦${pricing.pricePerKm}/km`,
            },
            {
                zone: 'Zone 3',
                distanceRange: '16-30km',
                baseFee: pricing.baseFee + (25 * pricing.pricePerKm),
                description: `Base fee + ₦${pricing.pricePerKm}/km`,
            },
            {
                zone: 'Zone 4',
                distanceRange: '31-50km',
                baseFee: pricing.baseFee + (45 * pricing.pricePerKm),
                description: `Base fee + ₦${pricing.pricePerKm}/km`,
            },
        ];
    }
}
exports.default = new DeliveryService();
//# sourceMappingURL=delivery.service.js.map