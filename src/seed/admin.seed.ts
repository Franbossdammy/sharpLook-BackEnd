// import mongoose from 'mongoose';
import User from '../models/User';
import { UserRole, UserStatus } from '../types';

export const seedAdmin = async () => {
  try {
    const adminEmail = 'superadmin@lookreal.beauty';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Super Admin already exists');
      return;
    }

    const generateReferral = () =>
      Math.random().toString(36).substring(2, 10).toUpperCase();

    const admin = new User({
      firstName: 'LookReal',
      lastName: 'Admin',
      email: adminEmail,
      phone: '08100000001',
      password: 'LookReal@2026',
      role: UserRole.SUPER_ADMIN,
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
