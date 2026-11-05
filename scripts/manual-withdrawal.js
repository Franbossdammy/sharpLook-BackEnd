/**
 * Admin-only: record a manual withdrawal for a user.
 *
 * Use this when the in-app withdrawal feature is broken and the admin has
 * paid the user out-of-band (e.g. bank transfer from their own account).
 * The script keeps the user's in-app wallet + audit trail correct by:
 *   1. Deducting the amount from walletBalance
 *   2. Creating a Withdrawal record (status = completed)
 *   3. Creating a matching Transaction record (type = withdrawal)
 *
 * Defaults to DRY RUN. Pass --confirm to actually mutate.
 *
 * Usage:
 *   node scripts/manual-withdrawal.js \
 *     --identifier "<email | phone | businessName>" \
 *     --amount 10000 \
 *     --bank "Opay" \
 *     --account 9167941703 \
 *     --name "Olaoluwa Bukola" \
 *     [--bankCode 999992] \
 *     [--fee 0] \
 *     [--confirm]
 */
require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');

function arg(flag, fallback = null) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : fallback;
}
function has(flag) {
  return process.argv.includes(flag);
}
function randRef(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

const identifier = arg('--identifier');
const amount = Number(arg('--amount'));
const bankName = arg('--bank');
const accountNumber = arg('--account');
const accountName = arg('--name');
const bankCode = arg('--bankCode', '999992'); // Opay default
const fee = Number(arg('--fee', '0'));
const note = arg('--note', null); // optional audit note (e.g. booking id)
const confirm = has('--confirm');

if (!identifier || !amount || !bankName || !accountNumber || !accountName) {
  console.error('Missing required args.');
  console.error('  --identifier <email|phone|businessName>');
  console.error('  --amount <NGN>');
  console.error('  --bank <name>');
  console.error('  --account <number>');
  console.error('  --name <account holder>');
  console.error('  [--bankCode <code>]  default 999992 (Opay)');
  console.error('  [--fee <NGN>]        default 0');
  console.error('  [--confirm]          actually mutate DB');
  process.exit(1);
}
if (!Number.isFinite(amount) || amount <= 0) {
  console.error('Amount must be a positive number.');
  process.exit(1);
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sharplook';

(async () => {
  try {
    await mongoose.connect(uri);
    console.log(`Connected to ${uri}`);
    console.log(confirm ? 'MODE: CONFIRM (will mutate)' : 'MODE: DRY RUN (no changes)');

    const users = mongoose.connection.db.collection('users');
    const withdrawals = mongoose.connection.db.collection('withdrawals');
    const transactions = mongoose.connection.db.collection('transactions');

    // Locate user by email, phone, or vendor business name (case-insensitive)
    const rx = new RegExp(`^${identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const user = await users.findOne({
      $or: [
        { email: rx },
        { phone: identifier },
        { 'vendorProfile.businessName': rx },
      ],
    });

    if (!user) {
      console.error(`No user matched identifier: "${identifier}"`);
      process.exit(1);
    }

    console.log('\n=== USER ===');
    console.log(`  _id:            ${user._id}`);
    console.log(`  name:           ${user.firstName || ''} ${user.lastName || ''}`);
    console.log(`  email:          ${user.email}`);
    console.log(`  phone:          ${user.phone}`);
    console.log(`  business:       ${user.vendorProfile?.businessName || '(not a vendor)'}`);
    console.log(`  walletBalance:  ₦${(user.walletBalance || 0).toLocaleString()}`);

    const balanceBefore = user.walletBalance || 0;
    const totalDeduction = amount; // gross amount comes out of wallet
    const netAmount = amount - fee; // what the user actually received

    if (balanceBefore < totalDeduction) {
      console.error(`\nInsufficient balance. Has ₦${balanceBefore.toLocaleString()}, needs ₦${totalDeduction.toLocaleString()}.`);
      process.exit(1);
    }

    const balanceAfter = balanceBefore - totalDeduction;
    const withdrawalRef = randRef('WTH');
    const txnRef = randRef('TXN');

    console.log('\n=== WITHDRAWAL TO RECORD ===');
    console.log(`  amount (gross): ₦${amount.toLocaleString()}`);
    console.log(`  fee:            ₦${fee.toLocaleString()}`);
    console.log(`  net paid out:   ₦${netAmount.toLocaleString()}`);
    console.log(`  bank:           ${bankName} (${bankCode})`);
    console.log(`  account:        ${accountNumber} — ${accountName}`);
    console.log(`  new balance:    ₦${balanceAfter.toLocaleString()}`);
    console.log(`  withdrawal ref: ${withdrawalRef}`);
    console.log(`  txn ref:        ${txnRef}`);

    if (!confirm) {
      console.log('\nDry run only. Re-run with --confirm to apply.');
      process.exit(0);
    }

    const now = new Date();

    const withdrawalDoc = {
      user: user._id,
      amount,
      bankName,
      bankCode,
      accountNumber,
      accountName,
      reference: withdrawalRef,
      withdrawalFee: fee,
      netAmount,
      status: 'completed',
      requestedAt: now,
      processedAt: now,
      completedAt: now,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    const wResult = await withdrawals.insertOne(withdrawalDoc);
    console.log(`\nWithdrawal inserted: ${wResult.insertedId}`);

    const txnDoc = {
      user: user._id,
      type: 'withdrawal',
      amount,
      balanceBefore,
      balanceAfter,
      status: 'completed',
      reference: txnRef,
      description: `Manual withdrawal to ${bankName} ${accountNumber} (${accountName}) — processed out-of-band by admin${note ? ` [ref: ${note}]` : ''}`,
      withdrawal: wResult.insertedId,
      metadata: { manual: true, reason: 'in-app withdrawal feature unavailable', note: note || undefined },
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    const tResult = await transactions.insertOne(txnDoc);
    console.log(`Transaction inserted: ${tResult.insertedId}`);

    const uResult = await users.updateOne(
      { _id: user._id },
      { $set: { walletBalance: balanceAfter, updatedAt: now } }
    );
    console.log(`User wallet updated: matched=${uResult.matchedCount} modified=${uResult.modifiedCount}`);

    console.log('\nDone.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
