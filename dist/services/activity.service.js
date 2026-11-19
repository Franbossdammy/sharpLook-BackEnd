"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(require("../models/User"));
const Booking_1 = __importDefault(require("../models/Booking"));
const Message_1 = __importDefault(require("../models/Message"));
const Offer_1 = __importDefault(require("../models/Offer"));
const Order_1 = __importDefault(require("../models/Order"));
const DAY = 24 * 60 * 60 * 1000;
const BUCKETS = [
    { key: 'active7', label: 'Last 7 days' },
    { key: 'd7to30', label: '7–30 days ago' },
    { key: 'd30to90', label: '30–90 days ago' },
    { key: 'over90', label: 'Over 90 days ago' },
    { key: 'never', label: 'No activity recorded' },
];
const bucketOf = (lastActive, now) => {
    if (!lastActive)
        return 'never';
    const age = now - lastActive.getTime();
    if (age <= 7 * DAY)
        return 'active7';
    if (age <= 30 * DAY)
        return 'd7to30';
    if (age <= 90 * DAY)
        return 'd30to90';
    return 'over90';
};
const latest = (...dates) => {
    let best = null;
    for (const d of dates) {
        if (d && (!best || d > best))
            best = d;
    }
    return best;
};
/** Aggregation result -> Map<userId, Date> */
const toMap = (rows) => {
    const m = new Map();
    for (const r of rows)
        if (r._id && r.last)
            m.set(String(r._id), new Date(r.last));
    return m;
};
class ActivityService {
    async getActivity(filters) {
        const now = Date.now();
        const { role } = filters;
        const page = Math.max(1, filters.page || 1);
        const limit = Math.min(Math.max(1, filters.limit || 25), 5000);
        const roleQuery = role === 'vendor'
            ? { $or: [{ role: 'vendor' }, { isVendor: true }] }
            : { role: 'client', isVendor: { $ne: true } };
        const users = await User_1.default.find(roleQuery)
            .select('firstName lastName email phone createdAt lastLogin lastSeen status isSuspended ' +
            'vendorProfile.businessName vendorProfile.kycStatus vendorProfile.isVerified')
            .lean();
        // ── Activity signals (one grouped query each, merged in memory) ─────────
        const [statusChanges, bookingsCreated, messagesSent, offerResponses, ordersPlaced, completedCounts] = await Promise.all([
            // Booking status changes the user made themselves
            Booking_1.default.aggregate([
                { $unwind: '$statusHistory' },
                { $match: { 'statusHistory.changedBy': { $ne: null } } },
                { $group: { _id: '$statusHistory.changedBy', last: { $max: '$statusHistory.changedAt' } } },
            ]),
            // Bookings created (client side)
            role === 'client'
                ? Booking_1.default.aggregate([{ $group: { _id: '$client', last: { $max: '$createdAt' } } }])
                : Promise.resolve([]),
            Message_1.default.aggregate([{ $group: { _id: '$sender', last: { $max: '$createdAt' } } }]),
            role === 'vendor'
                ? Offer_1.default.aggregate([
                    { $unwind: '$responses' },
                    { $group: { _id: '$responses.vendor', last: { $max: '$responses.respondedAt' } } },
                ])
                : Promise.resolve([]),
            role === 'client'
                ? Order_1.default.aggregate([{ $group: { _id: '$customer', last: { $max: '$createdAt' } } }])
                : Promise.resolve([]),
            // Completed bookings per user (vendor or client side)
            Booking_1.default.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: role === 'vendor' ? '$vendor' : '$client', count: { $sum: 1 } } },
            ]),
        ]);
        const statusMap = toMap(statusChanges);
        const createdMap = toMap(bookingsCreated);
        const messageMap = toMap(messagesSent);
        const offerMap = toMap(offerResponses);
        const orderMap = toMap(ordersPlaced);
        const completedMap = new Map(completedCounts.map((r) => [String(r._id), r.count]));
        // ── Build one row per user ─────────────────────────────────────────────
        const rows = users.map((u) => {
            const id = String(u._id);
            const lastBookingAction = latest(statusMap.get(id), createdMap.get(id));
            const lastActive = latest(u.lastLogin ? new Date(u.lastLogin) : null, u.lastSeen ? new Date(u.lastSeen) : null, lastBookingAction, messageMap.get(id), offerMap.get(id), orderMap.get(id));
            return {
                _id: id,
                name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
                businessName: u.vendorProfile?.businessName || null,
                email: u.email,
                phone: u.phone || null,
                kycStatus: u.vendorProfile?.kycStatus || null,
                status: u.isSuspended ? 'suspended' : u.status || 'active',
                joinedAt: u.createdAt || null,
                lastActive,
                lastLogin: u.lastLogin || null,
                lastBookingAction,
                lastMessage: messageMap.get(id) || null,
                completedBookings: completedMap.get(id) || 0,
                bucket: bucketOf(lastActive, now),
            };
        });
        // ── Summary over ALL users of this role ────────────────────────────────
        const countBy = (b) => rows.filter((r) => r.bucket === b).length;
        const buckets = BUCKETS.map((b) => ({ ...b, count: countBy(b.key) }));
        const active7 = countBy('active7');
        const d7to30 = countBy('d7to30');
        const summary = {
            total: rows.length,
            active7,
            active30: active7 + d7to30,
            inactive30: rows.length - active7 - d7to30,
            inactive90: countBy('over90') + countBy('never'),
            // Login alone vs real activity — shows how misleading lastLogin is
            loginOnlyInactive30: rows.filter((r) => !r.lastLogin || now - new Date(r.lastLogin).getTime() > 30 * DAY).length,
        };
        let verified = null;
        if (role === 'vendor') {
            const approved = rows.filter((r) => r.kycStatus === 'approved');
            verified = {
                total: approved.length,
                quiet30: approved.filter((r) => r.bucket !== 'active7' && r.bucket !== 'd7to30').length,
            };
        }
        // ── Filtered, sorted, paginated list ───────────────────────────────────
        let list = rows;
        if (filters.bucket)
            list = list.filter((r) => r.bucket === filters.bucket);
        if (filters.kyc)
            list = list.filter((r) => r.kycStatus === filters.kyc);
        if (filters.search) {
            const q = filters.search.toLowerCase();
            list = list.filter((r) => [r.name, r.businessName, r.email, r.phone].some((v) => v && String(v).toLowerCase().includes(q)));
        }
        const ts = (d) => (d ? d.getTime() : 0);
        list = [...list].sort((a, b) => filters.sort === 'oldest' ? ts(a.lastActive) - ts(b.lastActive) : ts(b.lastActive) - ts(a.lastActive));
        const totalFiltered = list.length;
        const items = list.slice((page - 1) * limit, page * limit);
        return {
            role,
            generatedAt: new Date(now),
            summary,
            buckets,
            verified,
            list: {
                items,
                total: totalFiltered,
                page,
                totalPages: Math.max(1, Math.ceil(totalFiltered / limit)),
            },
        };
    }
    /** CSV of the filtered list (all rows, no pagination). */
    async getActivityCsv(filters) {
        const { list } = await this.getActivity({ ...filters, page: 1, limit: 5000 });
        const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
        const esc = (v) => {
            const s = v == null ? '' : String(v);
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const header = [
            'Name', 'Business', 'Email', 'Phone', 'KYC', 'Status', 'Joined',
            'Last active', 'Last login', 'Last booking action', 'Last message', 'Completed bookings', 'Activity group',
        ];
        const label = new Map(BUCKETS.map((b) => [b.key, b.label]));
        const lines = list.items.map((r) => [
            r.name, r.businessName, r.email, r.phone, r.kycStatus, r.status, fmt(r.joinedAt),
            fmt(r.lastActive), fmt(r.lastLogin), fmt(r.lastBookingAction), fmt(r.lastMessage),
            r.completedBookings, label.get(r.bucket),
        ].map(esc).join(','));
        return [header.join(','), ...lines].join('\n');
    }
}
exports.default = new ActivityService();
//# sourceMappingURL=activity.service.js.map