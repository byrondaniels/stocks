/**
 * Stock Analysis API Server
 * Main entry point for the Express application
 */

import "dotenv/config";
import cors from "cors";
import express from "express";
import { connectToDatabase } from "./db/index.ts";

// Import routes
import insiderRoutes from "./routes/insider.routes.ts";
import portfolioRoutes from "./routes/portfolio.routes.ts";
import watchlistRoutes from "./routes/watchlist.routes.ts";
import stockDataRoutes from "./routes/stock-data.routes.ts";
import canslimRoutes from "./routes/canslim.routes.ts";
import rsRoutes from "./routes/rs.routes.ts";
import searchRoutes from "./routes/search.routes.ts";
import marketHealthRoutes from "./routes/market-health.routes.ts";

const PORT = process.env.PORT || 3001;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mount routes
app.use("/api/insiders", insiderRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/stock", stockDataRoutes);
app.use("/api/canslim", canslimRoutes);
app.use("/api/rs", rsRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/market-health", marketHealthRoutes);

// Connect to MongoDB and start server
connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Stock API listening on port ${PORT}`);
      console.log(`Available endpoints:`);
      console.log(`  - /api/insiders       - SEC insider transactions`);
      console.log(`  - /api/portfolio      - Portfolio management`);
      console.log(`  - /api/watchlist      - Watchlist management`);
      console.log(`  - /api/stock          - Stock data & prices`);
      console.log(`  - /api/canslim        - CANSLIM scoring`);
      console.log(`  - /api/rs             - RS Rating (Relative Strength)`);
      console.log(`  - /api/search         - Search history`);
      console.log(`  - /api/market-health  - Market health indicators`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB. Server not started:", error);
    process.exit(1);
  });
