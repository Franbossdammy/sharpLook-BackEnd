"use strict";
// BACKEND: Webhook Routes
// File: routes/webhook.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhook_controller_1 = require("../controllers/webhook.controller");
const router = (0, express_1.Router)();
/**
 * Paystack Webhook
 * POST /api/v1/webhooks/paystack
 *
 * NOTE: No authentication middleware!
 * Paystack sends webhooks directly to this endpoint.
 * We verify authenticity using the x-paystack-signature header.
 */
router.post('/paystack', webhook_controller_1.handlePaystackWebhook);
exports.default = router;
// ============================================
// REGISTER IN YOUR app.ts or server.ts
// ============================================
/*
import webhookRoutes from './routes/webhook.routes';

// Add BEFORE your regular routes
// Webhooks need to receive raw body for signature verification
app.use('/api/v1/webhooks', webhookRoutes);

// OR if you need raw body parsing for Paystack specifically:
app.use('/api/v1/webhooks/paystack',
  express.raw({ type: 'application/json' }),
  webhookRoutes
);
*/
// ============================================
// PAYSTACK DASHBOARD SETUP
// ============================================
/*
1. Go to Paystack Dashboard: https://dashboard.paystack.com/
2. Navigate to: Settings → API Keys & Webhooks
3. Add Webhook URL: https://your-api-domain.com/api/v1/webhooks/paystack
4. Enable these events:
   - charge.success
   - charge.failed
   - transfer.success (for withdrawals)
   - transfer.failed (for withdrawals)
5. Save

Test mode webhook URL example:
https://your-render-app.onrender.com/api/v1/webhooks/paystack

Live mode webhook URL example:
https://api.yourapp.com/api/v1/webhooks/paystack
*/ 
//# sourceMappingURL=webhooks.routes.js.map