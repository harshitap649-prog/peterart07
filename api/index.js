// Vercel serverless function handler
// Set Vercel environment variable before requiring the app
process.env.VERCEL = '1';

// Add better error logging
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

let app;
try {
  console.log('Loading art-shop-app.js...');
  app = require('../art-shop-app.js');
  console.log('App loaded successfully');
} catch (error) {
  console.error('Failed to load app:', error);
  console.error('Error stack:', error.stack);
  // Return a simple error handler that shows the actual error
  module.exports = (req, res) => {
    res.status(500).json({ 
      error: 'Server initialization failed', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  };
}

// Export as Vercel serverless function
// Express app can be used directly as a request handler
if (app) {
  module.exports = app;
} else {
  module.exports = (req, res) => {
    res.status(500).json({ error: 'App not initialized' });
  };
}
