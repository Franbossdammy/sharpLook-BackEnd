// utils/paystackHelper.ts

import axios from 'axios';
import logger from './logger';



import dotenv from "dotenv"


dotenv.config()
class PaystackHelper {
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY ||'';
    this.baseUrl = 'https://api.paystack.co';

    if (!this.secretKey) {
      logger.error('⚠️ Paystack secret key not configured');
    }
  }

  /**
   * Initialize Paystack payment
   */
  async initializePayment(
    email: string,
    amount: number,
    reference: string,
    metadata?: any
  ): Promise<any> {
    try {
      logger.info(`💳 Initializing Paystack payment: ${reference} for ${email}`);

      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        {
          email,
          amount: Math.round(amount * 100), // Convert to kobo (Naira * 100)
          reference,
          metadata,
          currency: 'NGN',
        
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status) {
        logger.info(`✅ Paystack payment initialized: ${reference}`);
        return response.data.data;
      } else {
        logger.error(`❌ Paystack initialization failed: ${response.data.message}`);
        throw new Error(response.data.message || 'Payment initialization failed');
      }
    } catch (error: any) {
      logger.error('❌ Paystack initialization error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || error.message || 'Failed to initialize payment'
      );
    }
  }

  /**
   * Verify Paystack payment
   */
  async verifyPayment(reference: string): Promise<any> {
    try {
      logger.info(`🔍 Verifying Paystack payment: ${reference}`);

      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      if (response.data.status) {
        logger.info(`✅ Paystack payment verified: ${reference}`);
        return response.data.data;
      } else {
        logger.error(`❌ Paystack verification failed: ${response.data.message}`);
        throw new Error(response.data.message || 'Payment verification failed');
      }
    } catch (error: any) {
      logger.error('❌ Paystack verification error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || error.message || 'Failed to verify payment'
      );
    }
  }

  /**
   * Get list of banks
   */
  async getBanks(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/bank`, {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      });

      if (response.data.status) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch banks');
      }
    } catch (error: any) {
      logger.error('❌ Fetch banks error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch banks');
    }
  }

  /**
   * Verify bank account
   */
  async verifyBankAccount(accountNumber: string, bankCode: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      if (response.data.status) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Account verification failed');
      }
    } catch (error: any) {
      logger.error('❌ Verify bank account error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || error.message || 'Failed to verify bank account'
      );
    }
  }

  /**
   * Create transfer recipient
   */
  async createTransferRecipient(
    name: string,
    accountNumber: string,
    bankCode: string
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transferrecipient`,
        {
          type: 'nuban',
          name,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN',
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to create transfer recipient');
      }
    } catch (error: any) {
      logger.error('❌ Create transfer recipient error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || error.message || 'Failed to create transfer recipient'
      );
    }
  }

  /**
   * Initiate transfer
   */
  async initiateTransfer(
    amount: number,
    recipientCode: string,
    reference: string,
    reason?: string
  ): Promise<any> {
    try {
      logger.info(`💸 Initiating Paystack transfer: ${reference}`);

      const response = await axios.post(
        `${this.baseUrl}/transfer`,
        {
          source: 'balance',
          amount: Math.round(amount * 100), // Convert to kobo
          recipient: recipientCode,
          reference,
          reason: reason || 'Withdrawal',
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status) {
        logger.info(`✅ Paystack transfer initiated: ${reference}`);
        return response.data.data;
      } else {
        logger.error(`❌ Paystack transfer failed: ${response.data.message}`);
        throw new Error(response.data.message || 'Transfer initiation failed');
      }
    } catch (error: any) {
      logger.error('❌ Paystack transfer error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || error.message || 'Failed to initiate transfer'
      );
    }
  }

  /**
   * Verify transfer
   */
  async verifyTransfer(reference: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/transfer/verify/${reference}`, {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      });

      if (response.data.status) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Transfer verification failed');
      }
    } catch (error: any) {
      logger.error('❌ Verify transfer error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || error.message || 'Failed to verify transfer'
      );
    }
  }
}

export default new PaystackHelper();