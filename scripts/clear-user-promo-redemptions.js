/**
 * Dev-only: wipes all promo redemptions for a given user email so they can
 * test the promo flow again from scratch. Restores slotsRemaining for any
 * redemption that hadn't been refunded (i.e., was still counted against the pool).
 *
 * Usage: node scripts/clear-user-promo-redemptions.js <email>
 */
require('dotenv').config();
const mongoose = require('mongoose');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/clear-user-promo-redemptions.js <email>');
  process.exit(1);
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sharplook';

(async () => {
  try {
    await mongoose.connect(uri);
    console.log(`Connected to ${uri}`);

    const users = mongoose.connection.db.collection('users');
    const campaigns = mongoose.connection.db.collection('promocampaigns');

    const user = await users.findOne({ email });
    if (!user) {
      console.error(`No user with email: ${email}`);
      process.exit(1);
    }
    console.log(`User: ${user._id}`);

    const affected = await campaigns.find({ 'redemptions.user': user._id }).toArray();
    if (affected.length === 0) {
      console.log('No campaigns have redemptions for this user. Nothing to do.');
      process.exit(0);
    }

    for (const camp of affected) {
      const userRedemptions = camp.redemptions.filter(
        (r) => r.user.toString() === user._id.toString()
      );
      const activeCount = userRedemptions.filter((r) => !r.refundedAt).length;

      const result = await campaigns.updateOne(
        { _id: camp._id },
        {
          $pull: { redemptions: { user: user._id } },
          $inc: { slotsRemaining: activeCount },
        }
      );
      console.log(
        `Campaign ${camp._id} (${camp.name}): removed ${userRedemptions.length} redemption(s), returned ${activeCount} slot(s) to the pool. matched=${result.matchedCount} modified=${result.modifiedCount}`
      );
    }

    console.log('Done.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
