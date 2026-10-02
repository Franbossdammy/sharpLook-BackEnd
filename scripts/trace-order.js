/**
 * Read-only diagnostic: traces one order end-to-end so we can see
 * (a) its lifecycle, (b) its payment, (c) its transactions, and
 * (d) exactly why the vendor was / was not credited.
 *
 * Usage: node scripts/trace-order.js <orderNumber>
 */
require('dotenv').config();
const mongoose = require('mongoose');

const orderNumber = process.argv[2];
if (!orderNumber) {
  console.error('Usage: node scripts/trace-order.js <orderNumber>');
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
const fmt = (n) => '₦' + (Number(n) || 0).toLocaleString();
const line = () => console.log('─'.repeat(72));

(async () => {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    const orders = db.collection('orders');
    const payments = db.collection('payments');
    const txs = db.collection('transactions');
    const users = db.collection('users');

    const order = await orders.findOne({ orderNumber });
    if (!order) {
      console.error(`No order found with orderNumber=${orderNumber}`);
      process.exit(1);
    }

    line();
    console.log('ORDER');
    line();
    console.log(`  _id:              ${order._id}`);
    console.log(`  orderNumber:      ${order.orderNumber}`);
    console.log(`  status:           ${order.status}`);
    console.log(`  escrowStatus:     ${order.escrowStatus}`);
    console.log(`  escrowedAmount:   ${fmt(order.escrowedAmount)}`);
    console.log(`  escrowedAt:       ${order.escrowedAt || 'n/a'}`);
    console.log(`  escrowReleaseDate:${order.escrowReleaseDate || 'n/a'}`);
    console.log(`  totalAmount:      ${fmt(order.totalAmount)}`);
    console.log(`  subtotal:         ${fmt(order.subtotal)}  deliveryFee: ${fmt(order.deliveryFee)}  discount: ${fmt(order.discount)}`);
    console.log(`  paymentMethod:    ${order.paymentMethod}`);
    console.log(`  paymentReference: ${order.paymentReference}`);
    console.log(`  isPaid:           ${order.isPaid}   paidAt: ${order.paidAt || 'n/a'}`);
    console.log(`  customerConfirmedDelivery: ${order.customerConfirmedDelivery}  at ${order.customerConfirmedAt || 'n/a'}`);
    console.log(`  sellerConfirmedDelivery:   ${order.sellerConfirmedDelivery}    at ${order.sellerConfirmedAt || 'n/a'}`);
    console.log(`  hasDispute:       ${order.hasDispute}`);
    console.log(`  cancelledAt:      ${order.cancelledAt || 'n/a'}`);
    console.log(`  createdAt:        ${order.createdAt}`);
    console.log(`  updatedAt:        ${order.updatedAt}`);
    console.log();

    const customer = await users.findOne({ _id: order.customer });
    const seller = await users.findOne({ _id: order.seller });
    console.log(`  customer: ${customer?.firstName || ''} ${customer?.lastName || ''}  <${customer?.email}>  _id=${order.customer}`);
    console.log(`  seller:   ${seller?.firstName || ''} ${seller?.lastName || ''}    <${seller?.email}>  _id=${order.seller}  (${order.sellerType})`);
    console.log(`  seller.walletBalance (NOW): ${fmt(seller?.walletBalance)}`);
    console.log();

    console.log('STATUS HISTORY');
    (order.statusHistory || []).forEach((h, i) => {
      console.log(`  [${i}] ${h.updatedAt?.toISOString?.() || h.updatedAt}  ${h.status}  by=${h.updatedBy}  ${h.note ? '— ' + h.note : ''}`);
    });
    console.log();

    line();
    console.log('PAYMENT');
    line();
    let payment = null;
    if (order.payment) payment = await payments.findOne({ _id: order.payment });
    if (!payment && order.paymentReference) {
      payment = await payments.findOne({ reference: order.paymentReference });
    }
    if (!payment) {
      console.log('  ⚠️  No Payment document linked to this order.');
      console.log(`     order.payment:          ${order.payment}`);
      console.log(`     order.paymentReference: ${order.paymentReference}`);
    } else {
      console.log(`  _id:               ${payment._id}`);
      console.log(`  reference:         ${payment.reference}`);
      console.log(`  status:            ${payment.status}`);
      console.log(`  escrowStatus:      ${payment.escrowStatus}`);
      console.log(`  escrowedAt:        ${payment.escrowedAt || 'n/a'}`);
      console.log(`  amount:            ${fmt(payment.amount)}`);
      console.log(`  paymentMethod:     ${payment.paymentMethod}`);
      console.log(`  type:              ${payment.type}`);
      console.log(`  initiatedAt:       ${payment.initiatedAt}`);
      console.log(`  completedAt:       ${payment.completedAt || 'n/a'}`);
      console.log(`  gatewayReference:  ${payment.gatewayReference || 'n/a'}`);
      console.log(`  verifiedAt:        ${payment.verifiedAt || 'n/a'}`);
      console.log();
    }

    line();
    console.log('TRANSACTIONS linked to this order');
    line();
    const orderTxs = await txs.find({ order: order._id }).sort({ createdAt: 1 }).toArray();
    if (orderTxs.length === 0) {
      console.log('  (none)');
    } else {
      for (const t of orderTxs) {
        const u = await users.findOne({ _id: t.user });
        console.log(
          `  ${t.createdAt?.toISOString?.() || t.createdAt}  ` +
          `type=${t.type}  amount=${fmt(t.amount)}  status=${t.status || 'n/a'}  ` +
          `user=${u?.email || t.user} (${u?.role || '?'})  ref=${t.reference || t._id}`
        );
        if (t.description) console.log(`      └─ ${t.description}`);
      }
    }
    console.log();

    // Also check for ORDER_EARNING transactions targeting the seller
    console.log(`SELLER'S ORDER_EARNING txs (any, limited to this order)`);
    const sellerEarnings = await txs.find({ user: order.seller, type: 'order_earning', order: order._id }).toArray();
    if (sellerEarnings.length === 0) {
      console.log('  (none)  → vendor has NOT been credited for this order');
    } else {
      sellerEarnings.forEach((t) =>
        console.log(`  ${t.createdAt?.toISOString?.() || t.createdAt}  ${fmt(t.amount)}  status=${t.status}  ${t.description || ''}`)
      );
    }
    console.log();

    line();
    console.log('VERDICT');
    line();
    const bothConfirmed = order.customerConfirmedDelivery && order.sellerConfirmedDelivery;
    const released = order.escrowStatus === 'released';
    const paid = order.isPaid;

    if (!paid) {
      console.log('  ❌ Order is NOT marked as paid (order.isPaid=false).');
      console.log('     → Vendor cannot be credited until payment is verified. Check Payment status above.');
    } else if (order.status === 'cancelled') {
      console.log('  ❌ Order was cancelled — funds would have been refunded to the customer, not credited to the vendor.');
    } else if (order.hasDispute) {
      console.log('  ⏸  Order has an active dispute. Escrow is frozen until resolution.');
    } else if (!order.customerConfirmedDelivery && !order.sellerConfirmedDelivery) {
      console.log('  ⏸  Neither party has confirmed delivery yet. Escrow stays locked.');
      console.log(`     Order is in status "${order.status}". Vendor gets credited only after BOTH confirmations.`);
    } else if (!order.customerConfirmedDelivery) {
      console.log('  ⏸  Customer has NOT confirmed delivery yet. Escrow stays locked until they do.');
    } else if (!order.sellerConfirmedDelivery) {
      console.log('  ⏸  Vendor (seller) has NOT confirmed delivery yet. Escrow stays locked until they do.');
    } else if (bothConfirmed && !released) {
      console.log('  🐞 BUG CANDIDATE: Both parties confirmed delivery, but escrow was never released.');
      console.log('     releaseFundsToSeller() may have thrown silently. Check logs around this timestamp:');
      console.log(`     ${order.sellerConfirmedAt || order.customerConfirmedAt}`);
    } else if (released && sellerEarnings.length === 0) {
      console.log('  🐞 BUG CANDIDATE: escrow is marked released but no ORDER_EARNING transaction exists.');
      console.log('     releaseFundsToSeller() crashed AFTER updating the order but BEFORE / DURING creating the tx.');
    } else if (released && sellerEarnings.length > 0) {
      console.log('  ✅ Vendor was credited. See the ORDER_EARNING transaction above.');
    } else {
      console.log('  (indeterminate — review printout above)');
    }
    console.log();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
