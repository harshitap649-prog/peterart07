const fs = require('fs');
const path = require('path');

// Function to convert dark theme to light theme
function convertToLightTheme(css) {
  // Replace dark backgrounds with light backgrounds
  css = css.replace(/background:#1a1a1a/g, 'background:#f9fafb');
  css = css.replace(/background:#0a0a0a/g, 'background:#ffffff');
  css = css.replace(/background:#2a2a2a/g, 'background:#e5e7eb');
  css = css.replace(/background:#1f1f1f/g, 'background:#f3f4f6');
  css = css.replace(/background:#111/g, 'background:#f9fafb');
  css = css.replace(/background:#0f0f0f/g, 'background:#f3f4f6');
  css = css.replace(/background:#000000/g, 'background:#ffffff');
  
  // Replace dark borders with light borders
  css = css.replace(/border:1px solid #2a2a2a/g, 'border:1px solid #e5e7eb');
  css = css.replace(/border:2px solid #2a2a2a/g, 'border:2px solid #e5e7eb');
  css = css.replace(/border:1px solid #3a3a3a/g, 'border:1px solid #d1d5db');
  css = css.replace(/border-bottom:1px solid #2a2a2a/g, 'border-bottom:1px solid #e5e7eb');
  css = css.replace(/border-bottom:2px solid #2a2a2a/g, 'border-bottom:2px solid #e5e7eb');
  css = css.replace(/border-top:1px solid #2a2a2a/g, 'border-top:1px solid #e5e7eb');
  css = css.replace(/border:1px solid #4a2a2a/g, 'border:1px solid #fee2e2');
  
  // Replace white text with dark text (but preserve white on gradient buttons)
  // First, protect gradient buttons by temporarily replacing them
  css = css.replace(/background:linear-gradient\([^)]+\)/g, (match) => {
    return match.replace(/#/g, '%%GRADIENT%%');
  });
  
  // Replace white text colors
  css = css.replace(/color:#fff(?![;]background)/g, 'color:#111827');
  css = css.replace(/color:#fff(?=;)/g, 'color:#111827');
  
  // Restore gradient markers
  css = css.replace(/%%GRADIENT%%/g, '#');
  
  // Replace specific dark text elements
  css = css.replace(/\.gallery-title\{[^}]*color:#fff/g, '.gallery-title{font-size:42px;font-weight:700;color:#111827');
  css = css.replace(/\.detail-title\{[^}]*color:#fff/g, '.detail-title{font-size:36px;font-weight:700;color:#111827');
  css = css.replace(/\.buy-product-title\{[^}]*color:#fff/g, '.buy-product-title{font-size:36px;font-weight:700;color:#111827');
  css = css.replace(/\.payment-preview-info h3\{[^}]*color:#fff/g, '.payment-preview-info h3{font-size:20px;font-weight:700;margin:0 0 8px;color:#111827');
  css = css.replace(/\.payment-preview-total\{[^}]*color:#fff/g, '.payment-preview-total{font-size:28px;font-weight:700;color:#111827');
  css = css.replace(/\.checkout-preview-info h3\{[^}]*color:#fff/g, '.checkout-preview-info h3{font-size:20px;font-weight:700;margin:0 0 8px;color:#111827');
  css = css.replace(/\.checkout-preview-total\{[^}]*color:#fff/g, '.checkout-preview-total{font-size:28px;font-weight:700;color:#111827');
  css = css.replace(/\.checkout-form-title\{[^}]*color:#fff/g, '.checkout-form-title{font-size:28px;font-weight:700;color:#111827');
  css = css.replace(/\.success-title\{[^}]*color:#fff/g, '.success-title{font-size:32px;font-weight:700;color:#111827');
  css = css.replace(/\.order-detail-value\{[^}]*color:#fff/g, '.order-detail-value{font-size:16px;color:#111827');
  css = css.replace(/\.help-title\{[^}]*color:#fff/g, '.help-title{font-size:42px;font-weight:700;color:#111827');
  css = css.replace(/\.help-form-title\{[^}]*color:#fff/g, '.help-form-title{font-size:28px;font-weight:700;color:#111827');
  css = css.replace(/\.help-info-card h3\{[^}]*color:#fff/g, '.help-info-card h3{font-size:20px;font-weight:700;color:#111827');
  css = css.replace(/\.admin-title\{[^}]*color:#fff/g, '.admin-title{font-size:36px;font-weight:700;color:#111827');
  css = css.replace(/\.section-title\{[^}]*color:#fff/g, '.section-title{font-size:24px;font-weight:700;color:#111827');
  css = css.replace(/\.artwork-title-admin\{[^}]*color:#fff/g, '.artwork-title-admin{font-size:18px;font-weight:600;color:#111827');
  css = css.replace(/\.order-section-title\{[^}]*color:#fff/g, '.order-section-title{font-size:22px;font-weight:700;color:#111827');
  css = css.replace(/\.support-message-subject-title\{[^}]*color:#fff/g, '.support-message-subject-title{font-size:20px;font-weight:700;color:#111827');
  css = css.replace(/\.form-label-admin\{[^}]*color:#fff/g, '.form-label-admin{display:flex;align-items:center;gap:10px;font-weight:600;color:#111827');
  css = css.replace(/\.user-email\{[^}]*color:#fff/g, '.user-email{font-size:18px;font-weight:600;color:#111827');
  css = css.replace(/\.comment-author\{[^}]*color:#fff/g, '.comment-author{font-weight:600;color:#111827');
  css = css.replace(/\.order-card-info h3\{[^}]*color:#fff/g, '.order-card-info h3{font-size:20px;font-weight:700;color:#111827');
  css = css.replace(/\.order-artwork-info h4\{[^}]*color:#fff/g, '.order-artwork-info h4{font-size:16px;font-weight:600;color:#111827');
  css = css.replace(/\.support-message-detail-value\{[^}]*color:#fff/g, '.support-message-detail-value{color:#111827');
  css = css.replace(/\.file-upload-text\{[^}]*color:#fff/g, '.file-upload-text{font-weight:600;color:#111827');
  css = css.replace(/\.empty-state h3\{[^}]*color:#fff/g, '.empty-state h3{font-size:20px;font-weight:600;color:#111827');
  css = css.replace(/\.no-search-results h3\{[^}]*color:#fff/g, '.no-search-results h3{font-size:24px;font-weight:600;color:#111827');
  css = css.replace(/\.comments-title\{[^}]*color:#fff/g, '.comments-title{font-size:28px;font-weight:700;color:#111827');
  css = css.replace(/\.payment-options-title\{[^}]*color:#fff/g, '.payment-options-title{font-size:28px;font-weight:700;color:#111827');
  css = css.replace(/\.payment-method-card h3\{[^}]*color:#fff/g, '.payment-method-card h3{margin:0 0 4px;font-size:18px;font-weight:600;color:#111827');
  css = css.replace(/\.logout-modal-title\{[^}]*color:#fff/g, '.logout-modal-title{font-size:28px;font-weight:700;color:#111827');
  css = css.replace(/\.stat-value\{[^}]*color:#fff/g, '.stat-value{font-size:32px;font-weight:700;color:#111827');
  css = css.replace(/\.buy-product-total\{[^}]*color:#fff/g, '.buy-product-total{font-size:36px;font-weight:700;color:#111827');
  
  // Replace header and nav colors
  css = css.replace(/header\{background:#1a1a1a/g, 'header{background:#f9fafb');
  css = css.replace(/header h1 a\{color:#fff/g, 'header h1 a{color:#111827');
  css = css.replace(/nav a\{color:#fff/g, 'nav a{color:#111827');
  
  // Replace search container colors
  css = css.replace(/\.gallery-search-container\{[^}]*background:#1a1a1a/g, '.gallery-search-container{position:relative;display:flex;align-items:center;background:#f9fafb');
  css = css.replace(/\.gallery-search-container:focus-within\{[^}]*background:#1f1f1f/g, '.gallery-search-container:focus-within{border-color:#d1d5db;box-shadow:0 6px 20px rgba(0,0,0,0.1);background:#ffffff');
  css = css.replace(/\.gallery-search-input\{[^}]*color:#fff/g, '.gallery-search-input{flex:1;background:transparent;border:none;outline:none;color:#111827');
  css = css.replace(/\.gallery-search-container:focus-within .search-icon\{color:#fff/g, '.gallery-search-container:focus-within .search-icon{color:#111827');
  css = css.replace(/\.search-clear-btn:hover\{[^}]*color:#fff/g, '.search-clear-btn:hover{background:#e5e7eb;color:#111827');
  
  // Replace filter button colors
  css = css.replace(/\.gallery-filter-btn:hover\{[^}]*color:#fff/g, '.gallery-filter-btn:hover{background:#e5e7eb;border-color:#d1d5db;transform:translateY(-2px);box-shadow:0 4px 8px rgba(0,0,0,0.1);color:#111827');
  
  // Replace link hover colors
  css = css.replace(/\.back-to-gallery:hover\{color:#fff/g, '.back-to-gallery:hover{color:#111827');
  css = css.replace(/\.back-to-gallery-link:hover\{color:#fff/g, '.back-to-gallery-link:hover{color:#111827');
  css = css.replace(/\.help-back-link:hover\{[^}]*color:#fff/g, '.help-back-link:hover{color:#111827;background:#f9fafb');
  css = css.replace(/\.admin-back-btn:hover\{[^}]*color:#fff/g, '.admin-back-btn:hover{background:transparent;color:#111827');
  css = css.replace(/\.back-link:hover\{color:#1a1a1a/g, '.back-link:hover{color:#111827');
  
  // Replace badge colors
  css = css.replace(/\.order-id-badge\{[^}]*color:#fff/g, '.order-id-badge{background:#e5e7eb;color:#111827');
  css = css.replace(/\.user-id-badge\{[^}]*color:#fff/g, '.user-id-badge{background:#e5e7eb;color:#111827');
  css = css.replace(/\.support-message-id-badge\{[^}]*color:#fff/g, '.support-message-id-badge{background:#e5e7eb;color:#111827');
  css = css.replace(/\.section-count\{[^}]*background:#2a2a2a/g, '.section-count{font-size:14px;color:#9ca3af;background:#e5e7eb');
  css = css.replace(/\.order-section-count\{[^}]*background:#2a2a2a/g, '.order-section-count{font-size:14px;color:#9ca3af;background:#e5e7eb');
  
  // Replace modal cancel button
  css = css.replace(/\.logout-modal-cancel\{[^}]*background:#2a2a2a/g, '.logout-modal-cancel{background:#e5e7eb;color:#111827');
  css = css.replace(/\.logout-modal-cancel\{[^}]*color:#fff/g, '.logout-modal-cancel{background:#e5e7eb;color:#111827');
  
  // Replace artwork title colors
  css = css.replace(/\.artwork-title a\{color:#fff/g, '.artwork-title a{color:#111827');
  
  // Replace admin subtitle
  css = css.replace(/\.admin-subtitle\{[^}]*color:rgba\(255,255,255,0\.7\)/g, '.admin-subtitle{font-size:16px;color:#6b7280');
  
  // Replace gradient backgrounds that go from dark to darker
  css = css.replace(/background:linear-gradient\(135deg,#1a1a1a 0%,#0a0a0a 100%\)/g, 'background:linear-gradient(135deg,#f9fafb 0%,#ffffff 100%)');
  css = css.replace(/background:linear-gradient\(135deg,#1a1a1a 0%,#000000 100%\)/g, 'background:linear-gradient(135deg,#f9fafb 0%,#ffffff 100%)');
  
  // Replace input/textarea backgrounds
  css = css.replace(/\.comment-input\{[^}]*background:#0a0a0a/g, '.comment-input{width:100%;padding:14px 16px;background:#ffffff');
  css = css.replace(/\.comment-char-count\{[^}]*background:#0a0a0a/g, '.comment-char-count{position:absolute;bottom:12px;right:12px;font-size:12px;color:#6b7280;background:#ffffff');
  css = css.replace(/\.comment-input\{[^}]*color:#fff/g, '.comment-input{width:100%;padding:14px 16px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;color:#111827');
  
  // Replace form input backgrounds
  css = css.replace(/\.form-input-admin\{[^}]*background:#0a0a0a/g, '.form-input-admin{padding:14px 18px;background:#ffffff');
  css = css.replace(/\.form-textarea-admin\{[^}]*background:#0a0a0a/g, '.form-textarea-admin{padding:14px 18px;background:#ffffff');
  css = css.replace(/\.form-input-admin\{[^}]*color:#fff/g, '.form-input-admin{padding:14px 18px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;font-size:15px;font-family:inherit;color:#111827');
  css = css.replace(/\.form-textarea-admin\{[^}]*color:#fff/g, '.form-textarea-admin{padding:14px 18px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;font-size:15px;font-family:inherit;color:#111827');
  
  // Replace file upload label
  css = css.replace(/\.file-upload-label\{[^}]*background:#0a0a0a/g, '.file-upload-label{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:48px 24px;background:#ffffff');
  css = css.replace(/\.file-upload-label:hover\{[^}]*background:#0f0f0f/g, '.file-upload-label:hover{border-color:#d1d5db;background:#f9fafb');
  css = css.replace(/\.file-upload-label:hover svg\{color:#fff/g, '.file-upload-label:hover svg{color:#111827');
  css = css.replace(/\.file-upload-text\{[^}]*color:#fff/g, '.file-upload-text{font-weight:600;color:#111827');
  
  // Replace quantity controls
  css = css.replace(/\.quantity-btn\{[^}]*background:#0a0a0a/g, '.quantity-btn{width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:#ffffff');
  css = css.replace(/\.quantity-btn:hover\{[^}]*background:#1a1a1a/g, '.quantity-btn:hover{background:#f9fafb');
  css = css.replace(/\.quantity-btn:disabled:hover\{[^}]*background:#0a0a0a/g, '.quantity-btn:disabled:hover{background:#ffffff');
  css = css.replace(/\.quantity-btn\{[^}]*color:#fff/g, '.quantity-btn{width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;color:#111827');
  css = css.replace(/\.quantity-input\{[^}]*background:#0a0a0a/g, '.quantity-input{width:80px;height:44px;text-align:center;background:#ffffff');
  css = css.replace(/\.quantity-input\{[^}]*color:#fff/g, '.quantity-input{width:80px;height:44px;text-align:center;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;color:#111827');
  
  // Replace form inputs
  css = css.replace(/\.form-group input\{[^}]*background:#0a0a0a/g, '.form-group input{padding:12px 16px;background:#ffffff');
  css = css.replace(/\.form-group textarea\{[^}]*background:#0a0a0a/g, '.form-group textarea{padding:12px 16px;background:#ffffff');
  css = css.replace(/\.form-group select\{[^}]*background:#0a0a0a/g, '.form-group select{padding:12px 16px;background:#ffffff');
  css = css.replace(/\.form-group input\{[^}]*color:#fff/g, '.form-group input{padding:12px 16px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;font-size:15px;font-family:inherit;transition:all 0.3s ease;width:100%;color:#111827');
  css = css.replace(/\.form-group textarea\{[^}]*color:#fff/g, '.form-group textarea{padding:12px 16px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;font-size:15px;font-family:inherit;transition:all 0.3s ease;width:100%;color:#111827');
  css = css.replace(/\.form-group select\{[^}]*color:#fff/g, '.form-group select{padding:12px 16px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;font-size:15px;font-family:inherit;transition:all 0.3s ease;width:100%;color:#111827');
  
  // Replace order status select
  css = css.replace(/\.order-status-select\{[^}]*background:#0a0a0a/g, '.order-status-select{padding:10px 16px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;font-weight:600;background:#ffffff');
  css = css.replace(/\.order-status-select\{[^}]*color:#fff/g, '.order-status-select{padding:10px 16px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;font-weight:600;background:#ffffff;color:#111827');
  
  // Replace payment method card
  css = css.replace(/\.payment-method-card\{[^}]*background:#0a0a0a/g, '.payment-method-card{display:flex;align-items:center;gap:20px;padding:24px;background:#ffffff');
  css = css.replace(/\.payment-method-card:hover\{[^}]*background:#1a1a1a/g, '.payment-method-card:hover{background:#f9fafb');
  css = css.replace(/\.payment-method-icon\{[^}]*background:#1a1a1a/g, '.payment-method-icon{width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:#f9fafb');
  css = css.replace(/\.payment-method-icon\{[^}]*color:#fff/g, '.payment-method-icon{width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:#f9fafb;border-radius:8px;color:#111827');
  
  // Replace media query body background
  css = css.replace(/@media\(max-width:768px\)\{body\{background:#0a0a0a/g, '@media(max-width:768px){body{background:#ffffff');
  
  return css;
}

// Convert styles.css
const stylesPath = path.join(__dirname, 'public', 'styles.css');
let stylesCss = fs.readFileSync(stylesPath, 'utf8');
stylesCss = convertToLightTheme(stylesCss);
fs.writeFileSync(stylesPath, stylesCss);
console.log('✅ Converted public/styles.css to light theme');

// Convert login.css
const loginPath = path.join(__dirname, 'public', 'login.css');
let loginCss = fs.readFileSync(loginPath, 'utf8');
loginCss = convertToLightTheme(loginCss);
// Fix specific login.css issues
loginCss = loginCss.replace(/\.divider::before, \.divider::after \{ content: ''; flex: 1; border-bottom: 1px solid #2a2a2a; \}/g, '.divider::before, .divider::after { content: \'\'; flex: 1; border-bottom: 1px solid #e5e7eb; }');
loginCss = loginCss.replace(/\.google-button:hover \{ background: #2a2a2a/g, '.google-button:hover { background: #e5e7eb');
loginCss = loginCss.replace(/\.error-message \{ display: flex; align-items: center; gap: 10px; background: #2a1a1a/g, '.error-message { display: flex; align-items: center; gap: 10px; background: #fee2e2');
loginCss = loginCss.replace(/\.error-message \{ display: flex; align-items: center; gap: 10px; background: #fee2e2[^}]*border: 1px solid #4a2a2a/g, '.error-message { display: flex; align-items: center; gap: 10px; background: #fee2e2; border: 1px solid #fecaca');
fs.writeFileSync(loginPath, loginCss);
console.log('✅ Converted public/login.css to light theme');

// Convert inline CSS in art-shop-app.js
const appPath = path.join(__dirname, 'art-shop-app.js');
let appJs = fs.readFileSync(appPath, 'utf8');

// Find and replace the stylesCss string
const stylesCssMatch = appJs.match(/const stylesCss = `([^`]+)`;/);
if (stylesCssMatch) {
  let inlineStyles = stylesCssMatch[1];
  inlineStyles = convertToLightTheme(inlineStyles);
  appJs = appJs.replace(/const stylesCss = `[^`]+`;/, `const stylesCss = \`${inlineStyles}\`;`);
  console.log('✅ Converted inline stylesCss in art-shop-app.js');
}

// Find and replace the loginCss string
const loginCssMatch = appJs.match(/const loginCss = `([^`]+)`;/);
if (loginCssMatch) {
  let inlineLoginCss = loginCssMatch[1];
  inlineLoginCss = convertToLightTheme(inlineLoginCss);
  // Fix specific login.css issues
  inlineLoginCss = inlineLoginCss.replace(/border-bottom: 1px solid #2a2a2a/g, 'border-bottom: 1px solid #e5e7eb');
  inlineLoginCss = inlineLoginCss.replace(/\.google-button:hover \{ background: #2a2a2a/g, '.google-button:hover { background: #e5e7eb');
  inlineLoginCss = inlineLoginCss.replace(/background: #2a1a1a/g, 'background: #fee2e2');
  inlineLoginCss = inlineLoginCss.replace(/border: 1px solid #4a2a2a/g, 'border: 1px solid #fecaca');
  appJs = appJs.replace(/const loginCss = `[^`]+`;/, `const loginCss = \`${inlineLoginCss}\`;`);
  console.log('✅ Converted inline loginCss in art-shop-app.js');
}

fs.writeFileSync(appPath, appJs);
console.log('✅ All files converted to light theme!');

