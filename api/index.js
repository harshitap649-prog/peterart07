// Vercel serverless function handler
// Set Vercel environment variable before requiring the app
process.env.VERCEL = '1';

const app = require('../art-shop-app.js');

// Export as Vercel serverless function
module.exports = (req, res) => {
  return app(req, res);
};
