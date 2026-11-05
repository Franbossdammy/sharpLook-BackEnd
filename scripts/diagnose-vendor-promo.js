/**
 * Read-only: for a given vendor email, prints every reason a client's
 * booking of them would fail to apply the promo. Checks vendor status,
 * every service they offer and its price vs the active promo minimum,
 * KYC/suspension flags, and whether the active promo has slots.
 *
 * Usage: node scripts/diagnose-vendor-promo.js <vendorEmail>
 */
require('dotenv').config();
const mongoose = require('mongoose');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/diagnose-vendor-promo.js <vendorEmail>');
  process.exit(1);
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sharplook';

(async () => {
  try {
    await mongoose.connect(uri);
    console.log(`Connected to ${uri}\n`);

    const users = mongoose.connection.db.collection('users');
    const services = mongoose.connection.db.collection('services');
    const campaigns = mongoose.connection.db.collection('promocampaigns');

    const vendor = await users.findOne({ email });
    if (!vendor) {
      console.error(`No user with email: ${email}`);
      process.exit(1);
    }

    console.log(`VENDOR`);
    console.log(`  _id:              ${vendor._id}`);
    console.log(`  name:             ${vendor.firstName || ''} ${vendor.lastName || ''}`);
    console.log(`  role:             ${vendor.role || '?'} isVendor=${!!vendor.isVendor}`);
    console.log(`  isActive:         ${vendor.isActive !== false}`);
    console.log(`  status:           ${vendor.status || '?'}`);
    console.log();

    if (!vendor.isVendor) {
      console.log('⚠️  This user is NOT a vendor. They can\'t be booked as one.');
      process.exit(0);
    }

    const vp = vendor.vendorProfile || {};
    console.log(`VENDOR PROFILE`);
    console.log(`  businessName:     ${vp.businessName || '(not set)'}`);
    console.log(`  vendorType:       ${vp.vendorType || '(not set)'}`);
    console.log(`  kycStatus:        ${vp.kycStatus || 'not_submitted'}`);
    console.log(`  isVerified:       ${!!vp.isVerified}`);
    console.log(`  isSuspended:      ${!!vp.isSuspended}`);
    console.log(`  suspensionReason: ${vp.suspensionReason || '(none)'}`);
    console.log(`  categories count: ${(vp.categories || []).length}`);
    console.log(`  serviceRadius:    ${vp.serviceRadius ?? '(not set)'}`);
    console.log(`  location.city:    ${vp.location?.city || '(not set)'}`);
    console.log(`  location.state:   ${vp.location?.state || '(not set)'}`);
    console.log();

    // Get the active promo
    const now = new Date();
    const active = await campaigns.findOne({
      isActive: true,
      $and: [
        { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    });

    if (!active) {
      console.log('ACTIVE PROMO: none. Promo would not show for any client anywhere.');
      process.exit(0);
    }

    console.log(`ACTIVE PROMO`);
    console.log(`  name:             ${active.name}`);
    console.log(`  appliesTo:        ${active.appliesTo}`);
    console.log(`  minServicePrice:  ₦${active.minServicePrice.toLocaleString()}`);
    console.log(`  discountAmount:   ₦${active.discountAmount.toLocaleString()}`);
    console.log(`  slotsRemaining:   ${active.slotsRemaining}/${active.maxSlots}`);
    console.log();

    // Every service this vendor offers
    const vendorServices = await services.find({ vendor: vendor._id }).toArray();
    console.log(`VENDOR'S SERVICES (${vendorServices.length} total)`);
    if (vendorServices.length === 0) {
      console.log('  → No services! Vendor has nothing to book.');
    } else {
      let qualifyingCount = 0;
      let activeCount = 0;
      vendorServices.forEach((s, i) => {
        const priceOk = s.basePrice >= active.minServicePrice;
        const isActive = s.isActive !== false && !s.isDeleted;
        const canBookWithPromo = priceOk && isActive;
        const typeOk =
          active.appliesTo === 'ALL' ||
          (active.appliesTo === 'HOME_SERVICE' &&
            (vp.vendorType === 'home_service' || vp.vendorType === 'both')) ||
          (active.appliesTo === 'IN_SHOP' &&
            (vp.vendorType === 'in_shop' || vp.vendorType === 'both'));
        if (canBookWithPromo && typeOk) qualifyingCount++;
        if (isActive) activeCount++;
        console.log(
          `  [${i}] ${s.name?.padEnd(30) || '(no name)'.padEnd(30)}` +
            ` ₦${(s.basePrice ?? 0).toLocaleString().padStart(10)}` +
            ` active=${isActive ? 'yes' : 'NO '}` +
            ` promo-eligible=${canBookWithPromo && typeOk ? 'YES' : 'no '}` +
            (s.duration ? `  ${s.duration}min` : '')
        );
      });
      console.log();
      console.log(`  active services:            ${activeCount}`);
      console.log(`  promo-eligible services:    ${qualifyingCount}`);
      console.log();

      if (qualifyingCount === 0 && activeCount > 0) {
        console.log('⚠️  DIAGNOSIS: no active service meets the ₦' +
          active.minServicePrice.toLocaleString() + ' minimum.');
        console.log('   The client\'s booking screen will hide the promo banner because');
        console.log('   the unit price is below the campaign minimum.');
        console.log();
        console.log('   FIX OPTIONS:');
        console.log('   a) Have the vendor raise a service price to ≥ ₦' +
          active.minServicePrice.toLocaleString());
        console.log('   b) Lower the campaign minServicePrice');
        console.log('   c) Client uses group booking (partySize ≥ N so total meets min)');
        console.log('      — but this only works on the NEW frontend build with the');
        console.log('        servicePrice × partySize fix. Old build checks unit only.');
      } else if (qualifyingCount > 0) {
        console.log('✅ At least one service qualifies. Promo should show for a fresh client.');
        console.log('   If it doesn\'t, ask the client to force-close and reopen the app.');
      }
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
