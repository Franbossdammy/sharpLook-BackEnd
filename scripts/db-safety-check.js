const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://admin_db_user:0IdZs4KxhsnRAMdA@cluster0.u2w9pbh.mongodb.net/?appName=Cluster0';

async function run() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('\n========================================');
  console.log('  SHARPLOOK LIVE DB SAFETY CHECK');
  console.log('========================================\n');

  // ─── 1. USERS MISSING referralCode ───────────────────────────────────────
  const missingReferral = await db.collection('users').countDocuments({ referralCode: { $exists: false } });
  const nullReferral    = await db.collection('users').countDocuments({ referralCode: null });
  const emptyReferral   = await db.collection('users').countDocuments({ referralCode: '' });
  const totalUsers      = await db.collection('users').countDocuments({});

  console.log(`[1] referralCode check (${totalUsers} total users)`);
  if (missingReferral === 0 && nullReferral === 0 && emptyReferral === 0) {
    console.log(`    ✅ SAFE — all users have referralCode`);
  } else {
    console.log(`    ❌ RISK — users missing referralCode: ${missingReferral} (field absent)`);
    console.log(`    ❌ RISK — users with referralCode=null: ${nullReferral}`);
    console.log(`    ❌ RISK — users with referralCode='': ${emptyReferral}`);
    // Print a few affected IDs
    const sample = await db.collection('users')
      .find({ $or: [{ referralCode: { $exists: false } }, { referralCode: null }, { referralCode: '' }] })
      .limit(5)
      .project({ _id: 1, email: 1, referralCode: 1 })
      .toArray();
    console.log(`    Sample affected:`, sample.map(u => `${u.email} (${u._id})`).join('\n                    '));
  }

  // ─── 2. DUPLICATE REVIEWS PER BOOKING ────────────────────────────────────
  console.log(`\n[2] Duplicate reviews per booking check`);
  const dupReviews = await db.collection('reviews').aggregate([
    { $group: { _id: '$booking', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  if (dupReviews.length === 0) {
    console.log(`    ✅ SAFE — no duplicate reviews per booking`);
  } else {
    console.log(`    ❌ RISK — ${dupReviews.length} booking(s) have multiple reviews:`);
    dupReviews.forEach(r => console.log(`    booking ${r._id}: ${r.count} reviews`));
  }

  // ─── 3. MALFORMED GEO LOCATION ON USERS ──────────────────────────────────
  console.log(`\n[3] Malformed location.coordinates on users`);
  const malformedUserLoc = await db.collection('users').find({
    'location.coordinates': { $exists: true },
    $or: [
      { 'location.coordinates': { $size: 0 } },
      { 'location.type': { $nin: ['Point'] } }
    ]
  }).project({ _id: 1, email: 1, location: 1 }).limit(10).toArray();

  const hasAnyUserLoc = await db.collection('users').countDocuments({ 'location.coordinates': { $exists: true } });
  console.log(`    Total users with location set: ${hasAnyUserLoc}`);

  if (malformedUserLoc.length === 0) {
    console.log(`    ✅ SAFE — no malformed user location.coordinates`);
  } else {
    console.log(`    ❌ RISK — ${malformedUserLoc.length} users have malformed location:`);
    malformedUserLoc.forEach(u => console.log(`    ${u.email}: ${JSON.stringify(u.location)}`));
  }

  // ─── 4. MALFORMED GEO ON VENDOR PROFILE ──────────────────────────────────
  console.log(`\n[4] Malformed vendorProfile.location.coordinates on users`);
  const malformedVendorLoc = await db.collection('users').find({
    'vendorProfile.location.coordinates': { $exists: true },
    $or: [
      { 'vendorProfile.location.coordinates': { $size: 0 } },
      { 'vendorProfile.location.type': { $nin: ['Point'] } }
    ]
  }).project({ _id: 1, email: 1, 'vendorProfile.location': 1 }).limit(10).toArray();

  const hasAnyVendorLoc = await db.collection('users').countDocuments({ 'vendorProfile.location.coordinates': { $exists: true } });
  console.log(`    Total vendors with location set: ${hasAnyVendorLoc}`);

  if (malformedVendorLoc.length === 0) {
    console.log(`    ✅ SAFE — no malformed vendor location.coordinates`);
  } else {
    console.log(`    ❌ RISK — ${malformedVendorLoc.length} vendors have malformed location:`);
    malformedVendorLoc.forEach(u => console.log(`    ${u.email}: ${JSON.stringify(u['vendorProfile'].location)}`));
  }

  // ─── 5. PHONE FORMAT ON EXISTING USERS ───────────────────────────────────
  console.log(`\n[5] Phone number format check (Nigerian format)`);
  const nigerianPhoneRegex = /^(\+234|234|0)[7-9][0-1]\d{8}$/;
  const usersWithPhone = await db.collection('users').find({ phone: { $exists: true, $ne: null, $ne: '' } })
    .project({ _id: 1, email: 1, phone: 1 }).toArray();

  const badPhone = usersWithPhone.filter(u => u.phone && !nigerianPhoneRegex.test(u.phone));
  const goodPhone = usersWithPhone.length - badPhone.length;

  console.log(`    Total users with phone: ${usersWithPhone.length}`);
  if (badPhone.length === 0) {
    console.log(`    ✅ SAFE — all phones match Nigerian format`);
  } else {
    console.log(`    ⚠️  RISK — ${badPhone.length} users have non-standard phone format:`);
    badPhone.slice(0, 10).forEach(u => console.log(`    ${u.email}: "${u.phone}"`));
    if (badPhone.length > 10) console.log(`    ... and ${badPhone.length - 10} more`);
  }

  // ─── 6. BOOKINGS IN 6–24H RESCHEDULE RISK WINDOW ─────────────────────────
  console.log(`\n[6] Active bookings in 6–24h window (reschedule behavior change)`);
  const now = new Date();
  const in6h  = new Date(now.getTime() + 6  * 60 * 60 * 1000);
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const atRiskBookings = await db.collection('bookings').countDocuments({
    status: { $in: ['pending', 'accepted', 'confirmed'] },
    scheduledDate: { $gte: in6h, $lte: in24h }
  });

  if (atRiskBookings === 0) {
    console.log(`    ✅ SAFE — no active bookings in the 6–24h window right now`);
  } else {
    console.log(`    ⚠️  NOTE — ${atRiskBookings} booking(s) are 6–24h away. These clients can no longer reschedule (old code allowed it). No data break, just UX change.`);
  }

  // ─── 7. GENERAL COLLECTION COUNTS ────────────────────────────────────────
  console.log(`\n[7] Collection overview`);
  const collections = ['users', 'bookings', 'reviews', 'payments', 'transactions', 'products', 'services', 'notifications'];
  for (const col of collections) {
    try {
      const count = await db.collection(col).countDocuments({});
      console.log(`    ${col}: ${count} documents`);
    } catch (e) {
      console.log(`    ${col}: (collection not found)`);
    }
  }

  console.log('\n========================================');
  console.log('  CHECK COMPLETE');
  console.log('========================================\n');

  await client.close();
}

run().catch(err => {
  console.error('Script failed:', err.message);
  process.exit(1);
});
