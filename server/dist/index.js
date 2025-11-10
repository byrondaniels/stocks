/**
 * Stock Analysis API Server
 * Main entry point for the Express application
 */
import "dotenv/config";
import cors from "cors";
import express from "express";
import { connectToDatabase } from "./db/index.js";
// Import routes
import insiderRoutes from "./routes/insider.routes.js";
import portfolioRoutes from "./routes/portfolio.routes.js";
import watchlistRoutes from "./routes/watchlist.routes.js";
import stockDataRoutes from "./routes/stock-data.routes.js";
import canslimRoutes from "./routes/canslim.routes.js";
import rsRoutes from "./routes/rs.routes.js";
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
    });
})
    .catch((error) => {
    console.error("Failed to connect to MongoDB. Server not started:", error);
    process.exit(1);
});
