import { BadRequestError } from '../utils/errors';
import { calculateDistance } from '../utils/helpers';
import logger from '../utils/logger';

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
  distance: number; // in kilometers
  deliveryFee: number; // in Naira
  estimatedDeliveryTime: string; // e.g., "2-3 days"
  canDeliver: boolean;
  message?: string;
}

class DeliveryService {
  // Default delivery pricing (can be overridden per product/vendor)
  private defaultPricing: Required<DeliveryPricing> = {
    baseDistanceKm: 5,
    baseFee: 500, // ₦500 for first 5km
    pricePerKm: 100, // ₦100 per additional km
    maxDeliveryDistance: 50, // 50km max
  };

  /**
   * Calculate delivery fee based on distance between two locations
   */
  public calculateDeliveryFee(
    vendorLocation: LocationCoordinates,
    customerLocation: LocationCoordinates,
    customPricing?: DeliveryPricing,
    freeDelivery: boolean = false
  ): DeliveryCalculation {
    // Calculate distance
    const distance = calculateDistance(
      vendorLocation.latitude,
      vendorLocation.longitude,
      customerLocation.latitude,
      customerLocation.longitude
    );

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
      } else {
        // Beyond base distance
        const extraKm = distance - pricing.baseDistanceKm;
        deliveryFee = pricing.baseFee + (extraKm * pricing.pricePerKm);
      }

      // Round to nearest 50 Naira
      deliveryFee = Math.round(deliveryFee / 50) * 50;
    }

    // Estimate delivery time based on distance
    const estimatedDeliveryTime = this.estimateDeliveryTime(distance);

    logger.info(`Delivery fee calculated: ${deliveryFee} for ${distance.toFixed(2)}km`);

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
  public calculateDeliveryFeeFromCoordinates(
    vendorCoordinates: [number, number],
    customerCoordinates: [number, number],
    customPricing?: DeliveryPricing,
    freeDelivery: boolean = false
  ): DeliveryCalculation {
    return this.calculateDeliveryFee(
      {
        longitude: vendorCoordinates[0],
        latitude: vendorCoordinates[1],
      } as LocationCoordinates,
      {
        longitude: customerCoordinates[0],
        latitude: customerCoordinates[1],
      } as LocationCoordinates,
      customPricing,
      freeDelivery
    );
  }

  /**
   * Estimate delivery time based on distance
   */
  private estimateDeliveryTime(distanceKm: number): string {
    if (distanceKm <= 5) {
      return '1-2 days';
    } else if (distanceKm <= 15) {
      return '2-3 days';
    } else if (distanceKm <= 30) {
      return '3-4 days';
    } else if (distanceKm <= 50) {
      return '4-5 days';
    } else {
      return '5-7 days';
    }
  }

  /**
   * Validate that both locations have coordinates
   */
  public validateLocations(
    vendorLocation?: {
      type?: string;
      coordinates?: [number, number];
    },
    customerLocation?: {
      type?: string;
      coordinates?: [number, number];
    }
  ): void {
    if (!vendorLocation?.coordinates || vendorLocation.coordinates.length !== 2) {
      throw new BadRequestError(
        'Vendor location not available. Please ensure vendor has set their business location.'
      );
    }

    if (!customerLocation?.coordinates || customerLocation.coordinates.length !== 2) {
      throw new BadRequestError(
        'Customer delivery address must include valid coordinates. Please provide a complete address with location.'
      );
    }

    // Validate coordinate ranges
    const [vLng, vLat] = vendorLocation.coordinates;
    const [cLng, cLat] = customerLocation.coordinates;

    if (vLng < -180 || vLng > 180 || vLat < -90 || vLat > 90) {
      throw new BadRequestError('Invalid vendor location coordinates');
    }

    if (cLng < -180 || cLng > 180 || cLat < -90 || cLat > 90) {
      throw new BadRequestError('Invalid customer location coordinates');
    }
  }

  /**
   * Get delivery zones (for display purposes)
   */
  public getDeliveryZones(customPricing?: DeliveryPricing): Array<{
    zone: string;
    distanceRange: string;
    baseFee: number;
    description: string;
  }> {
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

export default new DeliveryService();