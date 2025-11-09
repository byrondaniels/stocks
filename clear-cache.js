#!/usr/bin/env node
/**
 * Utility script to clear insider transaction cache from MongoDB
 * Usage: node clear-cache.js TICKER
 * Example: node clear-cache.js AAPL
 */

const ticker = process.argv[2];
if (!ticker) {
  console.error('Usage: node clear-cache.js TICKER');
  console.error('Example: node clear-cache.js AAPL');
  process.exit(1);
}

async function clearCache() {
  // Dynamic import for MongoDB
  const { MongoClient } = await import('mongodb');

  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27011/stocks';
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db();
    const upperTicker = ticker.toUpperCase();

    // Clear from the insidertransactions collection
    const result = await db.collection('insidertransactions').deleteOne({
      ticker: upperTicker
    });

    if (result.deletedCount > 0) {
      console.log(`✓ Cleared cache for ${upperTicker}`);
      console.log('  Next lookup will fetch fresh data from SEC with the updated parser');
    } else {
      console.log(`ℹ No cached data found for ${upperTicker}`);
      console.log('  The ticker may not have been looked up yet, or cache already expired');
    }
  } catch (error) {
    console.error('✗ Failed to clear cache:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

clearCache().catch(err => {
  console.error('✗ Error:', err.message);
  process.exit(1);
});
