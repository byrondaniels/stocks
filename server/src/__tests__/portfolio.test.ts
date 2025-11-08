import request from 'supertest';
import express from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Portfolio } from '../db/models.js';

// Create a mock for getCurrentPrice
const mockGetCurrentPrice = async (ticker: string) => ({
  ticker,
  price: 150.00,
  timestamp: new Date().toISOString()
});

let mongoServer: MongoMemoryServer;
let app: express.Application;

beforeAll(async () => {
  // Start in-memory MongoDB server with a specific MongoDB version
  mongoServer = await MongoMemoryServer.create({
    binary: {
      version: '6.0.9'
    }
  });
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri);

  // Import the app (needs to be after MongoDB is connected)
  // For testing, we'll create a minimal app with just the portfolio routes
  const { default: cors } = await import('cors');

  app = express();
  app.use(cors());
  app.use(express.json());

  const TICKER_REGEX = /^[A-Z]{1,5}(\.[A-Z0-9]{1,4})?$/;
  const getCurrentPrice = mockGetCurrentPrice;

  // Add portfolio routes (copied from index.ts for testing isolation)
  app.get('/api/portfolio', async (req, res) => {
    try {
      const portfolioItems = await Portfolio.find({}).lean();

      const portfolioWithMetrics = await Promise.all(
        portfolioItems.map(async (item) => {
          try {
            const priceData = await getCurrentPrice(item.ticker);
            const currentPrice = priceData.price;
            const profitLoss = (currentPrice - item.purchasePrice) * item.shares;
            const profitLossPercent = ((currentPrice - item.purchasePrice) / item.purchasePrice) * 100;

            return {
              ticker: item.ticker,
              shares: item.shares,
              purchasePrice: item.purchasePrice,
              purchaseDate: item.purchaseDate.toISOString(),
              currentPrice,
              profitLoss: parseFloat(profitLoss.toFixed(2)),
              profitLossPercent: parseFloat(profitLossPercent.toFixed(2)),
            };
          } catch (error) {
            return {
              ticker: item.ticker,
              shares: item.shares,
              purchasePrice: item.purchasePrice,
              purchaseDate: item.purchaseDate.toISOString(),
            };
          }
        })
      );

      res.json(portfolioWithMetrics);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to retrieve portfolio data.' });
    }
  });

  app.get('/api/portfolio/:ticker', async (req, res) => {
    const ticker = req.params.ticker.trim().toUpperCase();

    if (!ticker || !TICKER_REGEX.test(ticker)) {
      res.status(400).json({
        error: 'Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.',
      });
      return;
    }

    try {
      const portfolioItem = await Portfolio.findOne({ ticker }).lean();

      if (!portfolioItem) {
        res.status(404).json({ error: `Stock ${ticker} not found in portfolio.` });
        return;
      }

      try {
        const priceData = await getCurrentPrice(ticker);
        const currentPrice = priceData.price;
        const profitLoss = (currentPrice - portfolioItem.purchasePrice) * portfolioItem.shares;
        const profitLossPercent = ((currentPrice - portfolioItem.purchasePrice) / portfolioItem.purchasePrice) * 100;

        res.json({
          ticker: portfolioItem.ticker,
          shares: portfolioItem.shares,
          purchasePrice: portfolioItem.purchasePrice,
          purchaseDate: portfolioItem.purchaseDate.toISOString(),
          currentPrice,
          profitLoss: parseFloat(profitLoss.toFixed(2)),
          profitLossPercent: parseFloat(profitLossPercent.toFixed(2)),
        });
      } catch (error) {
        res.json({
          ticker: portfolioItem.ticker,
          shares: portfolioItem.shares,
          purchasePrice: portfolioItem.purchasePrice,
          purchaseDate: portfolioItem.purchaseDate.toISOString(),
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to retrieve stock from portfolio.' });
    }
  });

  app.post('/api/portfolio', async (req, res) => {
    const { ticker: rawTicker, shares, purchasePrice, purchaseDate } = req.body;

    if (!rawTicker || shares === undefined || purchasePrice === undefined || !purchaseDate) {
      res.status(400).json({
        error: 'Missing required fields: ticker, shares, purchasePrice, purchaseDate.',
      });
      return;
    }

    const ticker = rawTicker.trim().toUpperCase();

    if (!TICKER_REGEX.test(ticker)) {
      res.status(400).json({
        error: 'Invalid ticker format. Please use 1-5 uppercase letters with optional .suffix.',
      });
      return;
    }

    if (typeof shares !== 'number' || shares <= 0) {
      res.status(400).json({ error: 'Shares must be a positive number.' });
      return;
    }

    if (typeof purchasePrice !== 'number' || purchasePrice <= 0) {
      res.status(400).json({ error: 'Purchase price must be a positive number.' });
      return;
    }

    const date = new Date(purchaseDate);
    if (isNaN(date.getTime())) {
      res.status(400).json({ error: 'Invalid purchase date. Please use ISO date format (YYYY-MM-DD).' });
      return;
    }

    try {
      const existing = await Portfolio.findOne({ ticker });
      if (existing) {
        res.status(409).json({
          error: `Stock ${ticker} already exists in portfolio. Use PUT to update.`,
        });
        return;
      }

      const newPortfolioItem = new Portfolio({
        ticker,
        shares,
        purchasePrice,
        purchaseDate: date,
      });

      await newPortfolioItem.save();

      res.status(201).json({
        ticker: newPortfolioItem.ticker,
        shares: newPortfolioItem.shares,
        purchasePrice: newPortfolioItem.purchasePrice,
        purchaseDate: newPortfolioItem.purchaseDate.toISOString(),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to add stock to portfolio.' });
    }
  });

  app.put('/api/portfolio/:ticker', async (req, res) => {
    const ticker = req.params.ticker.trim().toUpperCase();
    const { shares, purchasePrice, purchaseDate } = req.body;

    if (!ticker || !TICKER_REGEX.test(ticker)) {
      res.status(400).json({
        error: 'Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.',
      });
      return;
    }

    const updateFields: any = {};

    if (shares !== undefined) {
      if (typeof shares !== 'number' || shares <= 0) {
        res.status(400).json({ error: 'Shares must be a positive number.' });
        return;
      }
      updateFields.shares = shares;
    }

    if (purchasePrice !== undefined) {
      if (typeof purchasePrice !== 'number' || purchasePrice <= 0) {
        res.status(400).json({ error: 'Purchase price must be a positive number.' });
        return;
      }
      updateFields.purchasePrice = purchasePrice;
    }

    if (purchaseDate !== undefined) {
      const date = new Date(purchaseDate);
      if (isNaN(date.getTime())) {
        res.status(400).json({ error: 'Invalid purchase date. Please use ISO date format (YYYY-MM-DD).' });
        return;
      }
      updateFields.purchaseDate = date;
    }

    if (Object.keys(updateFields).length === 0) {
      res.status(400).json({
        error: 'No fields to update. Provide shares, purchasePrice, or purchaseDate.',
      });
      return;
    }

    try {
      const updatedItem = await Portfolio.findOneAndUpdate(
        { ticker },
        { $set: updateFields },
        { new: true, runValidators: true }
      );

      if (!updatedItem) {
        res.status(404).json({ error: `Stock ${ticker} not found in portfolio.` });
        return;
      }

      res.json({
        ticker: updatedItem.ticker,
        shares: updatedItem.shares,
        purchasePrice: updatedItem.purchasePrice,
        purchaseDate: updatedItem.purchaseDate.toISOString(),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to update stock in portfolio.' });
    }
  });

  app.delete('/api/portfolio/:ticker', async (req, res) => {
    const ticker = req.params.ticker.trim().toUpperCase();

    if (!ticker || !TICKER_REGEX.test(ticker)) {
      res.status(400).json({
        error: 'Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.',
      });
      return;
    }

    try {
      const deletedItem = await Portfolio.findOneAndDelete({ ticker });

      if (!deletedItem) {
        res.status(404).json({ error: `Stock ${ticker} not found in portfolio.` });
        return;
      }

      res.json({
        message: `Stock ${ticker} removed from portfolio.`,
        ticker: deletedItem.ticker,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to remove stock from portfolio.' });
    }
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear the portfolio collection before each test
  await Portfolio.deleteMany({});
});

describe('Portfolio API', () => {
  describe('POST /api/portfolio', () => {
    it('should add a new stock to portfolio', async () => {
      const newStock = {
        ticker: 'AAPL',
        shares: 100,
        purchasePrice: 120.50,
        purchaseDate: '2024-01-15',
      };

      const response = await request(app)
        .post('/api/portfolio')
        .send(newStock)
        .expect(201);

      expect(response.body).toMatchObject({
        ticker: 'AAPL',
        shares: 100,
        purchasePrice: 120.50,
      });
      expect(response.body.purchaseDate).toBeDefined();
    });

    it('should reject adding stock with missing fields', async () => {
      const invalidStock = {
        ticker: 'AAPL',
        shares: 100,
        // missing purchasePrice and purchaseDate
      };

      const response = await request(app)
        .post('/api/portfolio')
        .send(invalidStock)
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
    });

    it('should reject invalid ticker format', async () => {
      const invalidStock = {
        ticker: 'INVALID123',
        shares: 100,
        purchasePrice: 120.50,
        purchaseDate: '2024-01-15',
      };

      const response = await request(app)
        .post('/api/portfolio')
        .send(invalidStock)
        .expect(400);

      expect(response.body.error).toContain('Invalid ticker format');
    });

    it('should reject negative shares', async () => {
      const invalidStock = {
        ticker: 'AAPL',
        shares: -100,
        purchasePrice: 120.50,
        purchaseDate: '2024-01-15',
      };

      const response = await request(app)
        .post('/api/portfolio')
        .send(invalidStock)
        .expect(400);

      expect(response.body.error).toContain('Shares must be a positive number');
    });

    it('should reject negative purchase price', async () => {
      const invalidStock = {
        ticker: 'AAPL',
        shares: 100,
        purchasePrice: -120.50,
        purchaseDate: '2024-01-15',
      };

      const response = await request(app)
        .post('/api/portfolio')
        .send(invalidStock)
        .expect(400);

      expect(response.body.error).toContain('Purchase price must be a positive number');
    });

    it('should reject invalid date format', async () => {
      const invalidStock = {
        ticker: 'AAPL',
        shares: 100,
        purchasePrice: 120.50,
        purchaseDate: 'invalid-date',
      };

      const response = await request(app)
        .post('/api/portfolio')
        .send(invalidStock)
        .expect(400);

      expect(response.body.error).toContain('Invalid purchase date');
    });

    it('should reject duplicate ticker', async () => {
      const stock = {
        ticker: 'AAPL',
        shares: 100,
        purchasePrice: 120.50,
        purchaseDate: '2024-01-15',
      };

      // Add stock first time
      await request(app).post('/api/portfolio').send(stock).expect(201);

      // Try to add same ticker again
      const response = await request(app)
        .post('/api/portfolio')
        .send(stock)
        .expect(409);

      expect(response.body.error).toContain('already exists in portfolio');
    });

    it('should normalize ticker to uppercase', async () => {
      const stock = {
        ticker: 'aapl',
        shares: 100,
        purchasePrice: 120.50,
        purchaseDate: '2024-01-15',
      };

      const response = await request(app)
        .post('/api/portfolio')
        .send(stock)
        .expect(201);

      expect(response.body.ticker).toBe('AAPL');
    });
  });

  describe('GET /api/portfolio', () => {
    it('should return empty array when portfolio is empty', async () => {
      const response = await request(app).get('/api/portfolio').expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all stocks in portfolio with profit/loss calculations', async () => {
      // Add multiple stocks
      await Portfolio.create([
        { ticker: 'AAPL', shares: 100, purchasePrice: 120.50, purchaseDate: new Date('2024-01-15') },
        { ticker: 'MSFT', shares: 50, purchasePrice: 300.00, purchaseDate: new Date('2024-02-01') },
      ]);

      const response = await request(app).get('/api/portfolio').expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        ticker: 'AAPL',
        shares: 100,
        purchasePrice: 120.50,
      });
      expect(response.body[0].currentPrice).toBe(150.00);
      expect(response.body[0].profitLoss).toBe(2950.00); // (150 - 120.50) * 100
      expect(response.body[0].profitLossPercent).toBeCloseTo(24.48, 1);
    });
  });

  describe('GET /api/portfolio/:ticker', () => {
    beforeEach(async () => {
      await Portfolio.create({
        ticker: 'AAPL',
        shares: 100,
        purchasePrice: 120.50,
        purchaseDate: new Date('2024-01-15'),
      });
    });

    it('should return stock details with profit/loss', async () => {
      const response = await request(app).get('/api/portfolio/AAPL').expect(200);

      expect(response.body).toMatchObject({
        ticker: 'AAPL',
        shares: 100,
        purchasePrice: 120.50,
      });
      expect(response.body.currentPrice).toBe(150.00);
      expect(response.body.profitLoss).toBe(2950.00);
    });

    it('should return 404 for non-existent ticker', async () => {
      const response = await request(app).get('/api/portfolio/TSLA').expect(404);

      expect(response.body.error).toContain('not found in portfolio');
    });

    it('should reject invalid ticker format', async () => {
      const response = await request(app).get('/api/portfolio/INVALID123').expect(400);

      expect(response.body.error).toContain('Invalid ticker');
    });

    it('should handle lowercase ticker', async () => {
      const response = await request(app).get('/api/portfolio/aapl').expect(200);

      expect(response.body.ticker).toBe('AAPL');
    });
  });

  describe('PUT /api/portfolio/:ticker', () => {
    beforeEach(async () => {
      await Portfolio.create({
        ticker: 'AAPL',
        shares: 100,
        purchasePrice: 120.50,
        purchaseDate: new Date('2024-01-15'),
      });
    });

    it('should update shares', async () => {
      const response = await request(app)
        .put('/api/portfolio/AAPL')
        .send({ shares: 150 })
        .expect(200);

      expect(response.body.shares).toBe(150);
      expect(response.body.purchasePrice).toBe(120.50); // unchanged
    });

    it('should update purchase price', async () => {
      const response = await request(app)
        .put('/api/portfolio/AAPL')
        .send({ purchasePrice: 130.00 })
        .expect(200);

      expect(response.body.purchasePrice).toBe(130.00);
      expect(response.body.shares).toBe(100); // unchanged
    });

    it('should update multiple fields', async () => {
      const response = await request(app)
        .put('/api/portfolio/AAPL')
        .send({
          shares: 200,
          purchasePrice: 135.00,
          purchaseDate: '2024-03-01'
        })
        .expect(200);

      expect(response.body.shares).toBe(200);
      expect(response.body.purchasePrice).toBe(135.00);
    });

    it('should return 404 for non-existent ticker', async () => {
      const response = await request(app)
        .put('/api/portfolio/TSLA')
        .send({ shares: 50 })
        .expect(404);

      expect(response.body.error).toContain('not found in portfolio');
    });

    it('should reject negative values', async () => {
      const response = await request(app)
        .put('/api/portfolio/AAPL')
        .send({ shares: -50 })
        .expect(400);

      expect(response.body.error).toContain('positive number');
    });

    it('should reject empty update', async () => {
      const response = await request(app)
        .put('/api/portfolio/AAPL')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('No fields to update');
    });
  });

  describe('DELETE /api/portfolio/:ticker', () => {
    beforeEach(async () => {
      await Portfolio.create({
        ticker: 'AAPL',
        shares: 100,
        purchasePrice: 120.50,
        purchaseDate: new Date('2024-01-15'),
      });
    });

    it('should delete stock from portfolio', async () => {
      const response = await request(app)
        .delete('/api/portfolio/AAPL')
        .expect(200);

      expect(response.body.message).toContain('removed from portfolio');
      expect(response.body.ticker).toBe('AAPL');

      // Verify it's actually deleted
      const portfolioCheck = await Portfolio.findOne({ ticker: 'AAPL' });
      expect(portfolioCheck).toBeNull();
    });

    it('should return 404 for non-existent ticker', async () => {
      const response = await request(app)
        .delete('/api/portfolio/TSLA')
        .expect(404);

      expect(response.body.error).toContain('not found in portfolio');
    });

    it('should reject invalid ticker format', async () => {
      const response = await request(app)
        .delete('/api/portfolio/INVALID123')
        .expect(400);

      expect(response.body.error).toContain('Invalid ticker');
    });
  });
});
