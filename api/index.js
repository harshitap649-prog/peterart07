// Vercel serverless function handler
// Set Vercel environment variable before requiring the app
process.env.VERCEL = '1';

let app;
try {
  app = require('../art-shop-app.js');
} catch (error) {
  console.error('Failed to load app:', error);
  // Return a simple error handler
  module.exports = (req, res) => {
    res.status(500).json({ 
      error: 'Server initialization failed', 
      message: error.message 
    });
  };
  throw error; // Re-throw to fail fast
}

// Export as Vercel serverless function
// Express app can be used directly as a request handler
module.exports = app;
