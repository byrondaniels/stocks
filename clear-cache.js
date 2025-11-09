#!/usr/bin/env node
/**
 * Utility script to clear insider transaction cache from MongoDB
 * Usage: node clear-cache.js TICKER
 * Example: node clear-cache.js AAPL
 */

// Simple script without external dependencies

// No arguments needed - always clears entire collection

async function clearCache() {
  // Dynamic import for MongoDB
  const { MongoClient } = await import('mongodb');

  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27011/stocks';
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db();

    // Drop the entire insiderTransactions collection
    await db.collection('insiderTransactions').drop();
    console.log('✓ Cleared all insider transaction cache data');
    console.log('  The entire cache collection has been dropped and will be recreated on next use');
  } catch (error) {
    if (error.message.includes('ns not found')) {
      console.log('ℹ No insider transaction cache found (collection does not exist)');
    } else {
      console.error('✗ Failed to clear cache:', error.message);
      process.exit(1);
    }
  } finally {
    await client.close();
  }
}

clearCache().catch(err => {
  console.error('✗ Error:', err.message);
  process.exit(1);
});
