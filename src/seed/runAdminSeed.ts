import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { seedAdmin } from './admin.seed';

dotenv.config();

(async () => {
  try {
    await mongoose.connect("mongodb+srv://kayskidadenusi:Luv2laf11_@cluster0.oo04lin.mongodb.net/?appName=Cluster0");
    console.log('Database connected');

    await seedAdmin();

    await mongoose.connection.close();
    console.log('Database connection closed');

    process.exit(0);
  } catch (error) {
    console.error('Error running seed:', error);
    process.exit(1);
  }
})();
