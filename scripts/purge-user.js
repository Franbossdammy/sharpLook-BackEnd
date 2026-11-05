/**
 * Admin-only: fully purges a user and every document referencing them.
 * Runs a DRY RUN by default (prints what would be deleted). Pass --confirm
 * to actually delete.
 *
 * WARNING: this is irreversible. Anything referencing the user's _id
 * elsewhere (a vendor's booking with this user as the client, a review
 * written by this user, etc.) will be deleted alongside the user.
 *
 * Usage:
 *   node scripts/purge-user.js <email>              # dry run — safe
 *   node scripts/purge-user.js <email> --confirm    # actually delete
 *
 * Accepts multiple emails:
 *   node scripts/purge-user.js user1@x.com user2@x.com --confirm
 */
require('dotenv').config();
const mongoose = require('mongoose');

const args = process.argv.slice(2);
const confirm = args.includes('--confirm');
const emails = args.filter((a) => !a.startsWith('--'));

if (emails.length === 0) {
  console.error('Usage: node scripts/purge-user.js <email> [<email>...] [--confirm]');
  process.exit(1);
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sharplook';

// Every collection that references a user, mapped to the field(s) that hold
// the user's _id. If a document matches on ANY of these fields, it's deleted.
const REFS = [
  { collection: 'auditlogs',          fields: ['actor', 'target'] },
  { collection: 'blogposts',          fields: ['author'] },
  { collection: 'bookings',           fields: ['client', 'vendor'] },
  { collection: 'calls',              fields: ['caller', 'receiver'] },
  { collection: 'conversations',      fields: ['participants'] },
  { collection: 'coupons',            fields: ['createdBy', 'usedBy.user'] },
  { collection: 'devicetokens',       fields: ['user'] },
  { collection: 'disputes',           fields: ['raisedBy', 'againstUser', 'resolvedBy'] },
  { collection: 'disputeproducts',    fields: ['raisedBy', 'againstUser', 'resolvedBy'] },
  { collection: 'messages',           fields: ['sender', 'receiver'] },
  { collection: 'notifications',      fields: ['user', 'userId'] },
  { collection: 'offers',             fields: ['client', 'selectedVendor', 'responses.vendor'] },
  { collection: 'orders',             fields: ['buyer', 'seller'] },
  { collection: 'payments',           fields: ['user'] },
  { collection: 'products',           fields: ['seller'] },
  { collection: 'redflags',           fields: ['user', 'vendor', 'client'] },
  { collection: 'referrals',          fields: ['referrer', 'referred'] },
  { collection: 'reviews',            fields: ['reviewer', 'reviewedUser'] },
  { collection: 'services',           fields: ['vendor'] },
  { collection: 'subscriptions',      fields: ['user'] },
  { collection: 'transactions',       fields: ['user'] },
  { collection: 'withdrawals',        fields: ['user'] },
];

// PromoCampaign is not deleted (shared across users), but the user's
// redemption entries inside it are pulled out.
const PROMO_PULLS = { collection: 'promocampaigns', arrayField: 'redemptions', userField: 'user' };

(async () => {
  try {
    await mongoose.connect(uri);
    console.log(`Connected to ${uri}`);
    console.log(confirm ? '⚠️  --confirm SET — will DELETE.' : '🔍 DRY RUN — no deletes. Pass --confirm to actually delete.');
    console.log();

    const users = mongoose.connection.db.collection('users');

    for (const email of emails) {
      const user = await users.findOne({ email });
      if (!user) {
        console.log(`— ${email}: no user found. Skipping.`);
        continue;
      }

      console.log(`═══ ${email} (_id: ${user._id}) ═══`);
      let totalDocs = 0;

      for (const { collection, fields } of REFS) {
        const col = mongoose.connection.db.collection(collection);
        // Match on any of the given fields equalling the user's _id
        const match = { $or: fields.map((f) => ({ [f]: user._id })) };
        const count = await col.countDocuments(match);
        if (count > 0) {
          totalDocs += count;
          if (confirm) {
            const result = await col.deleteMany(match);
            console.log(`  ${collection.padEnd(20)} deleted ${result.deletedCount}`);
          } else {
            console.log(`  ${collection.padEnd(20)} would delete ${count}`);
          }
        }
      }

      // Promo redemptions — pull the user's entries from the array, don't delete campaigns
      const promoCol = mongoose.connection.db.collection(PROMO_PULLS.collection);
      const campaignsWithUser = await promoCol
        .find({ [`${PROMO_PULLS.arrayField}.${PROMO_PULLS.userField}`]: user._id })
        .toArray();
      let redemptionsToRemove = 0;
      let slotsToReturn = 0;
      for (const camp of campaignsWithUser) {
        const userRedemptions = camp.redemptions.filter(
          (r) => r.user.toString() === user._id.toString()
        );
        const activeCount = userRedemptions.filter((r) => !r.refundedAt).length;
        redemptionsToRemove += userRedemptions.length;
        slotsToReturn += activeCount;
        if (confirm) {
          await promoCol.updateOne(
            { _id: camp._id },
            {
              $pull: { redemptions: { user: user._id } },
              $inc: { slotsRemaining: activeCount },
            }
          );
        }
      }
      if (redemptionsToRemove > 0) {
        if (confirm) {
          console.log(
            `  promocampaigns       pulled ${redemptionsToRemove} redemption(s), restored ${slotsToReturn} slot(s)`
          );
        } else {
          console.log(
            `  promocampaigns       would pull ${redemptionsToRemove} redemption(s), restore ${slotsToReturn} slot(s)`
          );
        }
      }

      // Finally, the user document itself
      if (confirm) {
        const result = await users.deleteOne({ _id: user._id });
        console.log(`  users                deleted ${result.deletedCount}`);
      } else {
        console.log(`  users                would delete 1`);
      }

      console.log(`  TOTAL related docs: ${totalDocs} + user + ${redemptionsToRemove} redemptions`);
      console.log();
    }

    console.log(confirm ? '✅ Purge complete.' : 'ℹ️  Dry run complete. Re-run with --confirm to actually delete.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
