/**
 * Idempotent fix for an order whose escrow was marked 'released' but whose
 * vendor was never actually credited (ORDER_EARNING transaction missing,
 * seller.walletBalance not increased, payment.escrowStatus still 'held').
 *
 * Safe to re-run: it checks for an existing ORDER_EARNING tx and will not
 * double-credit.
 *
 * Usage:
 *   node scripts/credit-stranded-order.js <orderNumber>            # dry run
 *   node scripts/credit-stranded-order.js <orderNumber> --apply    # commit
 */
require('dotenv').config();
const mongoose = require('mongoose');

const orderNumber = process.argv[2];
const apply = process.argv.includes('--apply');
if (!orderNumber) {
  console.error('Usage: node scripts/credit-stranded-order.js <orderNumber> [--apply]');
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
const fmt = (n) => '₦' + (Number(n) || 0).toLocaleString();
const line = () => console.log('─'.repeat(72));

function randomSuffix(len = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

(async () => {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const orders = db.collection('orders');
    const payments = db.collection('payments');
    const txs = db.collection('transactions');
    const users = db.collection('users');

    const order = await orders.findOne({ orderNumber });
    if (!order) throw new Error(`No order with orderNumber=${orderNumber}`);

    const payment = order.payment
      ? await payments.findOne({ _id: order.payment })
      : await payments.findOne({ reference: order.paymentReference });
    if (!payment) throw new Error(`No payment linked to ${orderNumber}`);

    const seller = await users.findOne({ _id: order.seller });
    if (!seller) throw new Error(`Seller ${order.seller} not found`);

    const existingEarning = await txs.findOne({
      user: order.seller,
      order: order._id,
      type: 'order_earning',
    });

    line();
    console.log(`ORDER ${order.orderNumber}`);
    line();
    console.log(`  order.status:          ${order.status}`);
    console.log(`  order.escrowStatus:    ${order.escrowStatus}`);
    console.log(`  order.totalAmount:     ${fmt(order.totalAmount)}`);
    console.log(`  payment.escrowStatus:  ${payment.escrowStatus}`);
    console.log(`  seller:                ${seller.email}  _id=${seller._id}`);
    console.log(`  seller.walletBalance:  ${fmt(seller.walletBalance)}`);
    console.log(`  existing ORDER_EARNING tx: ${existingEarning ? existingEarning.reference : 'NONE'}`);
    console.log();

    if (existingEarning) {
      console.log('✅ Vendor already has an ORDER_EARNING transaction for this order.');
      console.log('   No action taken (idempotent no-op).');
      process.exit(0);
    }

    const sellerAmount = order.totalAmount;
    const balanceBefore = seller.walletBalance || 0;
    const balanceAfter = balanceBefore + sellerAmount;

    console.log('PLANNED CHANGES');
    line();
    console.log(`  1. users._id=${seller._id}  walletBalance:  ${fmt(balanceBefore)}  →  ${fmt(balanceAfter)}`);
    console.log(`  2. transactions.create  type=order_earning  amount=${fmt(sellerAmount)}  user=${seller._id}  order=${order._id}`);
    if (payment.escrowStatus !== 'released') {
      console.log(`  3. payments._id=${payment._id}  escrowStatus: ${payment.escrowStatus} → released  (escrowedAt updated)`);
    } else {
      console.log(`  3. payments._id=${payment._id}  escrowStatus already 'released' — skipped`);
    }
    console.log();

    if (!apply) {
      console.log('DRY RUN — rerun with --apply to commit these changes.');
      process.exit(0);
    }

    const now = new Date();
    const reference = `TXN-${Date.now()}-${randomSuffix(8)}`;

    const txDoc = {
      user: seller._id,
      type: 'order_earning',
      amount: sellerAmount,
      balanceBefore,
      balanceAfter,
      status: 'completed',
      reference,
      description: `Earnings from completed order #${order.orderNumber}`,
      order: order._id,
      payment: payment._id,
      createdAt: now,
      updatedAt: now,
    };

    await txs.insertOne(txDoc);
    console.log(`   ✓ transactions insert ok  ref=${reference}`);

    await users.updateOne(
      { _id: seller._id },
      { $set: { walletBalance: balanceAfter, updatedAt: now } }
    );
    console.log(`   ✓ users walletBalance updated → ${fmt(balanceAfter)}`);

    if (payment.escrowStatus !== 'released') {
      await payments.updateOne(
        { _id: payment._id },
        { $set: { escrowStatus: 'released', escrowedAt: now, updatedAt: now } }
      );
      console.log(`   ✓ payments escrowStatus → released`);
    }

    console.log();
    console.log('✅ DONE — vendor credited and ledger consistent.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
