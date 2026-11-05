/**
 * Admin-only: manage a user's withdrawal PIN by email.
 *
 * - Without a value: clears the withdrawal PIN so the user can set a fresh
 *   one from the app. The change-PIN flow requires the current PIN, so
 *   clearing is the only way to unstick a user who forgot theirs.
 * - With a value: overwrites the withdrawal PIN to the given 4-6 digit value.
 *   The PIN is bcrypt-hashed with cost 10 to match the User model's pre-save
 *   hook (models/User.ts).
 *
 * Usage:
 *   node scripts/clear-user-withdrawal-pin.js <email>            # clear
 *   node scripts/clear-user-withdrawal-pin.js <email> --set 1234 # overwrite
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const email = process.argv[2];
const setFlagIndex = process.argv.indexOf('--set');
const pinValue = setFlagIndex !== -1 ? process.argv[setFlagIndex + 1] : null;

if (!email) {
  console.error('Usage:');
  console.error('  node scripts/clear-user-withdrawal-pin.js <email>             # clear');
  console.error('  node scripts/clear-user-withdrawal-pin.js <email> --set 1234  # overwrite');
  process.exit(1);
}

if (pinValue !== null && !/^\d{4,6}$/.test(pinValue)) {
  console.error('PIN must be 4-6 digits.');
  process.exit(1);
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sharplook';

(async () => {
  try {
    await mongoose.connect(uri);
    console.log(`Connected to ${uri}`);

    const users = mongoose.connection.db.collection('users');

    const user = await users.findOne({ email });
    if (!user) {
      console.error(`No user with email: ${email}`);
      process.exit(1);
    }
    console.log(`User: ${user._id} (${user.firstName || ''} ${user.lastName || ''})`);

    if (pinValue) {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(pinValue, salt);
      const result = await users.updateOne(
        { _id: user._id },
        { $set: { withdrawalPin: hashed } }
      );
      console.log(
        `Withdrawal PIN set to "${pinValue}" for ${email}. matched=${result.matchedCount} modified=${result.modifiedCount}`
      );
      console.log('Tell the user to change it to something private via Wallet → Change Withdrawal PIN.');
    } else {
      if (!user.withdrawalPin) {
        console.log('User has no withdrawal PIN set. Nothing to clear.');
        process.exit(0);
      }
      const result = await users.updateOne(
        { _id: user._id },
        { $unset: { withdrawalPin: '' } }
      );
      console.log(
        `Withdrawal PIN cleared for ${email}. matched=${result.matchedCount} modified=${result.modifiedCount}`
      );
      console.log('Tell the user to open the app → Wallet → Set Withdrawal PIN.');
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
