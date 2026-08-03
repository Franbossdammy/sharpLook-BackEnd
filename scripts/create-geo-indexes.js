const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://admin_db_user:0IdZs4KxhsnRAMdA@cluster0.u2w9pbh.mongodb.net/?appName=Cluster0';

async function run() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('\n========================================');
  console.log('  CREATING GEO INDEXES ON LIVE DB');
  console.log('========================================\n');

  // 1. 2dsphere on user location (for client proximity)
  try {
    await db.collection('users').createIndex(
      { 'location.coordinates': '2dsphere' },
      { sparse: true, name: 'user_location_2dsphere' }
    );
    console.log('✅ Created: users.location.coordinates (2dsphere)');
  } catch (e) {
    if (e.code === 85 || e.code === 86) {
      console.log('ℹ️  Already exists: users.location.coordinates (2dsphere)');
    } else {
      console.error('❌ Failed users.location.coordinates:', e.message);
    }
  }

  // 2. 2dsphere on vendor profile location (for vendor proximity / nearby search)
  try {
    await db.collection('users').createIndex(
      { 'vendorProfile.location.coordinates': '2dsphere' },
      { sparse: true, name: 'vendor_location_2dsphere' }
    );
    console.log('✅ Created: users.vendorProfile.location.coordinates (2dsphere)');
  } catch (e) {
    if (e.code === 85 || e.code === 86) {
      console.log('ℹ️  Already exists: users.vendorProfile.location.coordinates (2dsphere)');
    } else {
      console.error('❌ Failed users.vendorProfile.location.coordinates:', e.message);
    }
  }

  // List all indexes on users to confirm
  const indexes = await db.collection('users').indexes();
  console.log('\nAll indexes on users collection:');
  indexes.forEach(idx => console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`));

  console.log('\n========================================');
  console.log('  DONE');
  console.log('========================================\n');

  await client.close();
}

run().catch(err => {
  console.error('Script failed:', err.message);
  process.exit(1);
});
