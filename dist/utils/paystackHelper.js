"use strict";
// utils/paystackHelper.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("./logger"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class PaystackHelper {
    constructor() {
        this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
        this.baseUrl = 'https://api.paystack.co';
        if (!this.secretKey) {
            logger_1.default.error('⚠️ Paystack secret key not configured');
        }
    }
    /**
     * Initialize Paystack payment
     */
    async initializePayment(email, amount, reference, metadata) {
        try {
            logger_1.default.info(`💳 Initializing Paystack payment: ${reference} for ${email}`);
            const response = await axios_1.default.post(`${this.baseUrl}/transaction/initialize`, {
                email,
                amount: Math.round(amount * 100), // Convert to kobo (Naira * 100)
                reference,
                metadata,
                currency: 'NGN',
            }, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                    'Content-Type': 'application/json',
                },
            });
            if (response.data.status) {
                logger_1.default.info(`✅ Paystack payment initialized: ${reference}`);
                return response.data.data;
            }
            else {
                logger_1.default.error(`❌ Paystack initialization failed: ${response.data.message}`);
                throw new Error(response.data.message || 'Payment initialization failed');
            }
        }
        catch (error) {
            logger_1.default.error('❌ Paystack initialization error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || error.message || 'Failed to initialize payment');
        }
    }
    /**
     * Verify Paystack payment
     */
    async verifyPayment(reference) {
        try {
            logger_1.default.info(`🔍 Verifying Paystack payment: ${reference}`);
            const response = await axios_1.default.get(`${this.baseUrl}/transaction/verify/${reference}`, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                },
            });
            if (response.data.status) {
                logger_1.default.info(`✅ Paystack payment verified: ${reference}`);
                return response.data.data;
            }
            else {
                logger_1.default.error(`❌ Paystack verification failed: ${response.data.message}`);
                throw new Error(response.data.message || 'Payment verification failed');
            }
        }
        catch (error) {
            logger_1.default.error('❌ Paystack verification error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || error.message || 'Failed to verify payment');
        }
    }
    /**
     * Get list of banks
     */
    async getBanks() {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/bank`, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                },
            });
            if (response.data.status) {
                return response.data.data;
            }
            else {
                throw new Error(response.data.message || 'Failed to fetch banks');
            }
        }
        catch (error) {
            logger_1.default.error('❌ Fetch banks error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || error.message || 'Failed to fetch banks');
        }
    }
    /**
     * Verify bank account
     */
    async verifyBankAccount(accountNumber, bankCode) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                },
            });
            if (response.data.status) {
                return response.data.data;
            }
            else {
                throw new Error(response.data.message || 'Account verification failed');
            }
        }
        catch (error) {
            logger_1.default.error('❌ Verify bank account error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || error.message || 'Failed to verify bank account');
        }
    }
    /**
     * Create transfer recipient
     */
    async createTransferRecipient(name, accountNumber, bankCode) {
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/transferrecipient`, {
                type: 'nuban',
                name,
                account_number: accountNumber,
                bank_code: bankCode,
                currency: 'NGN',
            }, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                    'Content-Type': 'application/json',
                },
            });
            if (response.data.status) {
                return response.data.data;
            }
            else {
                throw new Error(response.data.message || 'Failed to create transfer recipient');
            }
        }
        catch (error) {
            logger_1.default.error('❌ Create transfer recipient error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || error.message || 'Failed to create transfer recipient');
        }
    }
    /**
     * Initiate transfer
     */
    async initiateTransfer(amount, recipientCode, reference, reason) {
        try {
            logger_1.default.info(`💸 Initiating Paystack transfer: ${reference}`);
            const response = await axios_1.default.post(`${this.baseUrl}/transfer`, {
                source: 'balance',
                amount: Math.round(amount * 100), // Convert to kobo
                recipient: recipientCode,
                reference,
                reason: reason || 'Withdrawal',
            }, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                    'Content-Type': 'application/json',
                },
            });
            if (response.data.status) {
                logger_1.default.info(`✅ Paystack transfer initiated: ${reference}`);
                return response.data.data;
            }
            else {
                logger_1.default.error(`❌ Paystack transfer failed: ${response.data.message}`);
                throw new Error(response.data.message || 'Transfer initiation failed');
            }
        }
        catch (error) {
            logger_1.default.error('❌ Paystack transfer error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || error.message || 'Failed to initiate transfer');
        }
    }
    /**
     * Verify transfer
     */
    async verifyTransfer(reference) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/transfer/verify/${reference}`, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                },
            });
            if (response.data.status) {
                return response.data.data;
            }
            else {
                throw new Error(response.data.message || 'Transfer verification failed');
            }
        }
        catch (error) {
            logger_1.default.error('❌ Verify transfer error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || error.message || 'Failed to verify transfer');
        }
    }
}
exports.default = new PaystackHelper();
//# sourceMappingURL=paystackHelper.js.map