// Copy this file to routes.local.js and update with your recipient emails and function URLs.
// routes.local.js is gitignored and will be loaded automatically by server.js if present.
module.exports = [
  // Relative paths are appended to FUNCTIONS_DOMAIN from .env
  { recipient: 'you@yourdomain.com', url: '/backend/your-function' },
  { recipient: 'test@yourdomain.com', url: '/backend/test-endpoint' },

  // Full URLs bypass FUNCTIONS_DOMAIN entirely
  { recipient: 'other@yourdomain.com', url: 'https://your-other-domain-1234-dev.twil.io/backend/your-function' }
];
