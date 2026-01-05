import mongoose from 'mongoose';
import Offer from '../models/Offer';
import dotenv from "dotenv"

dotenv.config()
const MONGO_URI = process.env.MONGODB_URI|| 'mongodb://localhost:27017/sharplook';

async function migrateOffers() {
  try {
    console.log('🚀 Starting migration: Add serviceType to offers');
    console.log('=====================================');
    
    // Connect to database
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to database');

    // Count offers without serviceType
    const offersToMigrate = await Offer.countDocuments({
      serviceType: { $exists: false },
      isDeleted: { $ne: true }
    });

    if (offersToMigrate === 0) {
      console.log('✅ All offers already have serviceType field. No migration needed.');
      await mongoose.disconnect();
      return;
    }

    console.log(`📊 Found ${offersToMigrate} offers to migrate`);
    console.log('');

    // Strategy: All existing offers have location (based on your current model)
    // So we set them all to 'both' to be safe
    
    const result = await Offer.updateMany(
      {
        serviceType: { $exists: false },
        isDeleted: { $ne: true }
      },
      {
        $set: {
          serviceType: 'both', // Safe default - offers flexibility
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} offers to serviceType: 'both'`);

    // Verify migration
    const remaining = await Offer.countDocuments({
      serviceType: { $exists: false },
      isDeleted: { $ne: true }
    });

    if (remaining === 0) {
      console.log('');
      console.log('✅ Migration completed successfully!');
      console.log('=====================================');
      console.log('📊 Summary:');
      console.log(`   - Total offers migrated: ${result.modifiedCount}`);
      console.log(`   - All set to: 'both' (flexible)`);
      console.log('');
      console.log('💡 Note: Existing offers set to "both" for flexibility.');
      console.log('   New offers will require explicit serviceType selection.');
    } else {
      console.warn(`⚠️ Warning: ${remaining} offers still missing serviceType`);
    }

    // Show sample of migrated data
    const samples = await Offer.find({
      isDeleted: { $ne: true }
    })
      .select('title serviceType location.city status')
      .limit(5)
      .sort({ createdAt: -1 });

    if (samples.length > 0) {
      console.log('');
      console.log('📝 Sample migrated offers:');
      samples.forEach((offer, i) => {
        console.log(`   ${i + 1}. ${offer.title}`);
        console.log(`      - Service Type: ${offer.serviceType}`);
        console.log(`      - Location: ${offer.location?.city || 'N/A'}`);
        console.log(`      - Status: ${offer.status}`);
      });
    }

    console.log('');
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
    console.log('=====================================');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  migrateOffers();
}

export default migrateOffers;