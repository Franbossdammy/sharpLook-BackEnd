// import mongoose from 'mongoose';
import User from '../models/User';
import { UserRole, UserStatus } from '../types';

export const seedAdmin = async () => {
  try {
    const adminEmail = 'admin@example.com';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Admin already exists');
      return;
    }

    const generateReferral = () =>
      Math.random().toString(36).substring(2, 10).toUpperCase();

    const admin = new User({
      firstName: 'Super',
      lastName: 'Admin',
      email: adminEmail,
      phone: '0000000000',
      password: 'Admin@1234',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      isPhoneVerified: true,
      referralCode: generateReferral(),
      isVendor: false,
      walletBalance: 0,
    });

    await admin.save();
    console.log('Admin account created successfully');
  } catch (error) {
    console.error('Failed to seed admin:', error);
  }
};
