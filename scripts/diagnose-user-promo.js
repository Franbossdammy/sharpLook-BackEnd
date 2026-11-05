/**
 * Read-only diagnostic: prints the currently active promo campaign and
 * every reason why a given user might not be eligible. Also lists their
 * pending payments that hold a claim on the campaign.
 *
 * Usage: node scripts/diagnose-user-promo.js <email>
 */
require('dotenv').config();
const mongoose = require('mongoose');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/diagnose-user-promo.js <email>');
  process.exit(1);
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sharplook';

(async () => {
  try {
    await mongoose.connect(uri);
    console.log(`Connected to ${uri}\n`);

    const users = mongoose.connection.db.collection('users');
    const campaigns = mongoose.connection.db.collection('promocampaigns');
    const payments = mongoose.connection.db.collection('payments');

    const user = await users.findOne({ email });
    if (!user) {
      console.error(`No user with email: ${email}`);
      process.exit(1);
    }
    console.log(`USER`);
    console.log(`  _id:     ${user._id}`);
    console.log(`  name:    ${user.firstName || ''} ${user.lastName || ''}`);
    console.log(`  role:    ${user.role || '?'} isVendor=${!!user.isVendor}`);
    console.log();

    // Find the active campaign
    const now = new Date();
    const active = await campaigns.findOne({
      isActive: true,
      $and: [
        { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    });

    if (!active) {
      console.log('ACTIVE PROMO: none');
      console.log('  → No campaign is active right now. Promo will not show for anyone.');
      process.exit(0);
    }

    console.log(`ACTIVE PROMO`);
    console.log(`  _id:              ${active._id}`);
    console.log(`  name:             ${active.name}`);
    console.log(`  appliesTo:        ${active.appliesTo}`);
    console.log(`  discountAmount:   ₦${active.discountAmount.toLocaleString()}`);
    console.log(`  minServicePrice:  ₦${active.minServicePrice.toLocaleString()}`);
    console.log(`  maxSlots:         ${active.maxSlots}`);
    console.log(`  slotsRemaining:   ${active.slotsRemaining}`);
    console.log(`  maxUsesPerUser:   ${active.maxUsesPerUser}`);
    console.log(`  startsAt:         ${active.startsAt || 'n/a'}`);
    console.log(`  endsAt:           ${active.endsAt || 'n/a'}`);
    console.log();

    // Check user's redemptions on this campaign
    const userRedemptions = (active.redemptions || []).filter(
      (r) => r.user.toString() === user._id.toString()
    );
    const activeRedemptions = userRedemptions.filter((r) => !r.refundedAt);

    console.log(`USER'S REDEMPTIONS on this campaign`);
    console.log(`  total:            ${userRedemptions.length}`);
    console.log(`  active (unrefunded): ${activeRedemptions.length}`);
    if (userRedemptions.length > 0) {
      userRedemptions.forEach((r, i) => {
        console.log(
          `  [${i}] booking=${r.booking} redeemedAt=${r.redeemedAt} refundedAt=${r.refundedAt || 'null'}`
        );
      });
    }
    console.log();

    // Check user's pending payments that hold a claim
    const pendingWithClaim = await payments.find({
      user: user._id,
      status: 'pending',
      $or: [
        { 'metadata.pendingBookingData.promoCampaignId': active._id.toString() },
        { 'metadata.pendingOfferData.promoCampaignId': active._id.toString() },
      ],
    }).toArray();

    console.log(`USER'S PENDING PAYMENTS with promo claim on this campaign`);
    console.log(`  count: ${pendingWithClaim.length}`);
    pendingWithClaim.forEach((p, i) => {
      const bd = p.metadata?.pendingBookingData;
      const od = p.metadata?.pendingOfferData;
      const scope = bd ? 'booking' : od ? 'offer' : '?';
      const data = bd || od || {};
      console.log(
        `  [${i}] ref=${p.reference} initiatedAt=${p.initiatedAt} scope=${scope} redemptionId=${data.promoRedemptionId} promoApplied=${data.promoApplied}`
      );
    });
    console.log();

    // Verdict
    console.log(`VERDICT — /promo/current would return:`);
    const userAlreadyRedeemed = activeRedemptions.length >= active.maxUsesPerUser;
    const userEligible = !userAlreadyRedeemed && active.slotsRemaining > 0;
    console.log(`  userAlreadyRedeemed: ${userAlreadyRedeemed}`);
    console.log(`  userEligible:        ${userEligible}`);
    console.log();

    if (userEligible) {
      console.log('  → Promo SHOULD apply for this user on their next booking.');
      console.log('    If the app still hides the banner, ask them to force-close');
      console.log('    the app and reopen so CreateBooking re-fetches /promo/current.');
    } else if (userAlreadyRedeemed) {
      console.log('  → Blocked: this user has already used the promo.');
      console.log(`    Run: node scripts/clear-user-promo-redemptions.js ${email}`);
    } else {
      console.log('  → Blocked: campaign has no slots remaining.');
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
