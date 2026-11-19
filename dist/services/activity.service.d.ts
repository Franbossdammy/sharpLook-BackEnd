/**
 * User activity analytics (admin).
 *
 * "Last active" is the LATEST of several independent signals, because no
 * single field is reliable on its own:
 *  - lastLogin: only changes when the user types their password. The app keeps
 *    people signed in for weeks, so on its own it hugely overstates inactivity.
 *  - lastSeen: app activity. Was barely recorded before the activity-tracking
 *    fix in the auth middleware; accurate from that deploy onwards.
 *  - booking actions: booking created (client) or any status change the user
 *    made themselves (accept, start, complete, cancel…) from statusHistory.
 *  - messages sent, offer responses (vendors), product orders placed (clients).
 * Booking.updatedAt is deliberately NOT used — crons (reminders) touch it.
 */
export type ActivityRole = 'vendor' | 'client';
export type ActivityBucket = 'active7' | 'd7to30' | 'd30to90' | 'over90' | 'never';
export interface ActivityFilters {
    role: ActivityRole;
    bucket?: ActivityBucket;
    kyc?: string;
    search?: string;
    sort?: 'recent' | 'oldest';
    page?: number;
    limit?: number;
}
declare class ActivityService {
    getActivity(filters: ActivityFilters): Promise<{
        role: ActivityRole;
        generatedAt: Date;
        summary: {
            total: number;
            active7: number;
            active30: number;
            inactive30: number;
            inactive90: number;
            loginOnlyInactive30: number;
        };
        buckets: {
            count: number;
            key: ActivityBucket;
            label: string;
        }[];
        verified: {
            total: number;
            quiet30: number;
        } | null;
        list: {
            items: {
                _id: string;
                name: string;
                businessName: any;
                email: any;
                phone: any;
                kycStatus: any;
                status: any;
                joinedAt: any;
                lastActive: Date | null;
                lastLogin: any;
                lastBookingAction: Date | null;
                lastMessage: Date | null;
                completedBookings: number;
                bucket: ActivityBucket;
            }[];
            total: number;
            page: number;
            totalPages: number;
        };
    }>;
    /** CSV of the filtered list (all rows, no pagination). */
    getActivityCsv(filters: ActivityFilters): Promise<string>;
}
declare const _default: ActivityService;
export default _default;
//# sourceMappingURL=activity.service.d.ts.map