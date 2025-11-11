const fs = require('fs');
const path = require('path');

// Read the main app file
const appPath = path.join(__dirname, 'art-shop-app.js');
let appContent = fs.readFileSync(appPath, 'utf8');

// Function to replace dark colors with light equivalents in minified CSS
function convertDarkToLight(css) {
  // Replace dark backgrounds with light
  css = css.replace(/background:#1a1a1a/g, 'background:#f9fafb');
  css = css.replace(/background:#0a0a0a/g, 'background:#ffffff');
  css = css.replace(/background:#2a2a2a/g, 'background:#e5e7eb');
  css = css.replace(/background:#1f1f1f/g, 'background:#f3f4f6');
  css = css.replace(/background:#111/g, 'background:#f9fafb');
  css = css.replace(/background:#0f0f0f/g, 'background:#f3f4f6');
  css = css.replace(/background:#000000/g, 'background:#ffffff');
  css = css.replace(/background:rgba\(0,0,0,0\.6\)/g, 'background:rgba(0,0,0,0.1)');
  css = css.replace(/background:rgba\(0,0,0,0\.8\)/g, 'background:rgba(0,0,0,0.15)');
  css = css.replace(/background:rgba\(0,0,0,0\.85\)/g, 'background:rgba(255,255,255,0.85)');
  
  // Replace dark borders with light
  css = css.replace(/border:1px solid #2a2a2a/g, 'border:1px solid #e5e7eb');
  css = css.replace(/border:1px solid #3a3a3a/g, 'border:1px solid #d1d5db');
  css = css.replace(/border:2px solid #2a2a2a/g, 'border:2px solid #e5e7eb');
  css = css.replace(/border-bottom:1px solid #2a2a2a/g, 'border-bottom:1px solid #e5e7eb');
  css = css.replace(/border-bottom:2px solid #2a2a2a/g, 'border-bottom:2px solid #e5e7eb');
  css = css.replace(/border-top:1px solid #2a2a2a/g, 'border-top:1px solid #e5e7eb');
  css = css.replace(/border:1px solid #4a2a2a/g, 'border:1px solid #fee2e2');
  
  // Replace white text on dark backgrounds with dark text
  // But preserve white text on gradient buttons
  css = css.replace(/color:#fff(?![^}]*gradient)/g, 'color:#111827');
  css = css.replace(/color:#fff(?![^}]*linear-gradient)/g, 'color:#111827');
  
  // Specific replacements for text colors that should remain light on certain elements
  // But we need to be careful - let's do more targeted replacements
  
  // Replace header colors
  css = css.replace(/header\{background:#1a1a1a;color:#fff/g, 'header{background:#f9fafb;color:#111827');
  css = css.replace(/header h1 a\{color:#fff/g, 'header h1 a{color:#111827');
  css = css.replace(/nav a\{color:#fff/g, 'nav a{color:#111827');
  
  // Replace gallery title colors
  css = css.replace(/\.gallery-title\{[^}]*color:#fff/g, '.gallery-title{font-size:42px;font-weight:700;color:#111827');
  css = css.replace(/\.gallery-search-container\{[^}]*background:#1a1a1a/g, '.gallery-search-container{position:relative;display:flex;align-items:center;background:#f9fafb');
  css = css.replace(/\.gallery-search-container:focus-within\{[^}]*background:#1f1f1f/g, '.gallery-search-container:focus-within{border-color:#d1d5db;box-shadow:0 6px 20px rgba(0,0,0,0.1);background:#ffffff');
  css = css.replace(/\.gallery-search-input\{[^}]*color:#fff/g, '.gallery-search-input{flex:1;background:transparent;border:none;outline:none;color:#111827');
  css = css.replace(/\.gallery-search-container:focus-within \.search-icon\{color:#fff/g, '.gallery-search-container:focus-within .search-icon{color:#111827');
  css = css.replace(/\.search-clear-btn:hover\{[^}]*color:#fff/g, '.search-clear-btn:hover{background:#e5e7eb;color:#111827');
  css = css.replace(/\.gallery-filter-btn\{[^}]*background:#1a1a1a/g, '.gallery-filter-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:#f9fafb');
  css = css.replace(/\.gallery-filter-btn:hover\{[^}]*color:#fff/g, '.gallery-filter-btn:hover{background:#e5e7eb;border-color:#d1d5db;transform:translateY(-2px);box-shadow:0 4px 8px rgba(0,0,0,0.1);color:#111827');
  css = css.replace(/\.search-clear-btn:hover\{[^}]*background:#2a2a2a/g, '.search-clear-btn:hover{background:#e5e7eb');
  
  // Replace artwork card colors
  css = css.replace(/\.artwork-card\{[^}]*background:#1a1a1a/g, '.artwork-card{background:#f9fafb');
  css = css.replace(/\.artwork-image-wrapper\{[^}]*background:#0a0a0a/g, '.artwork-image-wrapper{position:relative;width:100%;padding-top:100%;background:#ffffff');
  css = css.replace(/\.artwork-title a\{color:#fff/g, '.artwork-title a{color:#111827');
  css = css.replace(/\.no-search-results h3\{[^}]*color:#fff/g, '.no-search-results h3{font-size:24px;font-weight:600;color:#111827');
  css = css.replace(/\.empty-gallery h3\{[^}]*color:#fff/g, '.empty-gallery h3{font-size:24px;font-weight:600;color:#111827');
  
  // Replace order card colors
  css = css.replace(/\.order-card-gallery\{[^}]*background:#1a1a1a/g, '.order-card-gallery{display:flex;gap:24px;background:#f9fafb');
  css = css.replace(/\.order-card-image\{[^}]*background:#0a0a0a/g, '.order-card-image{width:120px;height:120px;flex-shrink:0;border-radius:12px;overflow:hidden;background:#ffffff');
  css = css.replace(/\.order-card-info h3\{[^}]*color:#fff/g, '.order-card-info h3{font-size:20px;font-weight:700;color:#111827');
  
  // Replace art detail colors
  css = css.replace(/\.art-detail-grid\{[^}]*background:linear-gradient\(135deg,#1a1a1a 0%,#0a0a0a 100%\)/g, '.art-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;background:linear-gradient(135deg,#f9fafb 0%,#ffffff 100%)');
  css = css.replace(/\.detail-title\{[^}]*color:#fff/g, '.detail-title{font-size:36px;font-weight:700;color:#111827');
  css = css.replace(/\.art-like-btn,\.art-share-btn\{[^}]*background:#1a1a1a/g, '.art-like-btn,.art-share-btn{display:flex;align-items:center;gap:8px;padding:12px 20px;background:#f9fafb');
  css = css.replace(/\.art-like-btn,\.art-share-btn\{[^}]*color:#fff/g, '.art-like-btn,.art-share-btn{display:flex;align-items:center;gap:8px;padding:12px 20px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;color:#111827');
  css = css.replace(/\.art-like-btn:hover,\.art-share-btn:hover\{[^}]*background:#2a2a2a/g, '.art-like-btn:hover,.art-share-btn:hover{background:#e5e7eb');
  css = css.replace(/\.back-to-gallery:hover\{color:#fff/g, '.back-to-gallery:hover{color:#111827');
  css = css.replace(/\.comments-title\{[^}]*color:#fff/g, '.comments-title{font-size:28px;font-weight:700;color:#111827');
  css = css.replace(/\.comment-form-wrapper\{[^}]*background:#1a1a1a/g, '.comment-form-wrapper{background:#f9fafb');
  css = css.replace(/\.comment-input\{[^}]*background:#0a0a0a/g, '.comment-input{width:100%;padding:14px 16px;background:#ffffff');
  css = css.replace(/\.comment-input\{[^}]*color:#fff/g, '.comment-input{width:100%;padding:14px 16px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;color:#111827');
  css = css.replace(/\.comment-char-count\{[^}]*background:#0a0a0a/g, '.comment-char-count{position:absolute;bottom:12px;right:12px;font-size:12px;color:#6b7280;background:#ffffff');
  css = css.replace(/\.comment-item\{[^}]*background:#1a1a1a/g, '.comment-item{display:flex;gap:16px;background:#f9fafb');
  css = css.replace(/\.comment-author\{[^}]*color:#fff/g, '.comment-author{font-weight:600;color:#111827');
  
  // Replace buy/checkout colors
  css = css.replace(/\.buy-product-details\{[^}]*background:linear-gradient\(135deg,#1a1a1a 0%,#0a0a0a 100%\)/g, '.buy-product-details{display:grid;grid-template-columns:1fr 1fr;gap:48px;background:linear-gradient(135deg,#f9fafb 0%,#ffffff 100%)');
  css = css.replace(/\.buy-product-title\{[^}]*color:#fff/g, '.buy-product-title{font-size:36px;font-weight:700;color:#111827');
  css = css.replace(/\.quantity-btn\{[^}]*background:#0a0a0a/g, '.quantity-btn{width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:#ffffff');
  css = css.replace(/\.quantity-btn\{[^}]*color:#fff/g, '.quantity-btn{width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;color:#111827');
  css = css.replace(/\.quantity-btn:hover\{[^}]*background:#1a1a1a/g, '.quantity-btn:hover{background:#f3f4f6');
  css = css.replace(/\.quantity-btn:disabled:hover\{[^}]*background:#0a0a0a/g, '.quantity-btn:disabled:hover{background:#ffffff');
  css = css.replace(/\.quantity-input\{[^}]*background:#0a0a0a/g, '.quantity-input{width:80px;height:44px;text-align:center;background:#ffffff');
  css = css.replace(/\.quantity-input\{[^}]*color:#fff/g, '.quantity-input{width:80px;height:44px;text-align:center;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;color:#111827');
  css = css.replace(/\.buy-product-total-section\{[^}]*background:#0a0a0a/g, '.buy-product-total-section{margin-bottom:32px;padding:20px;background:#ffffff');
  css = css.replace(/\.buy-product-total\{[^}]*color:#fff/g, '.buy-product-total{font-size:36px;font-weight:700;color:#111827');
  css = css.replace(/\.back-to-gallery-link:hover\{color:#fff/g, '.back-to-gallery-link:hover{color:#111827');
  css = css.replace(/\.payment-options-content\{[^}]*background:linear-gradient\(135deg,#1a1a1a 0%,#0a0a0a 100%\)/g, '.payment-options-content{display:grid;grid-template-columns:1fr 1.5fr;gap:40px;background:linear-gradient(135deg,#f9fafb 0%,#ffffff 100%)');
  css = css.replace(/\.payment-preview-info h3\{[^}]*color:#fff/g, '.payment-preview-info h3{font-size:20px;font-weight:700;margin:0 0 8px;color:#111827');
  css = css.replace(/\.payment-preview-total\{[^}]*color:#fff/g, '.payment-preview-total{font-size:28px;font-weight:700;color:#111827');
  css = css.replace(/\.payment-options-title\{[^}]*color:#fff/g, '.payment-options-title{font-size:28px;font-weight:700;color:#111827');
  css = css.replace(/\.payment-method-card\{[^}]*background:#0a0a0a/g, '.payment-method-card{display:flex;align-items:center;gap:20px;padding:24px;background:#ffffff');
  css = css.replace(/\.payment-method-card:hover\{[^}]*background:#1a1a1a/g, '.payment-method-card:hover{background:#f3f4f6');
  css = css.replace(/\.payment-method-icon\{[^}]*background:#1a1a1a/g, '.payment-method-icon{width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:#f9fafb');
  css = css.replace(/\.payment-method-icon\{[^}]*color:#fff/g, '.payment-method-icon{width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:#f9fafb;border-radius:8px;color:#111827');
  css = css.replace(/\.payment-method-card h3\{[^}]*color:#fff/g, '.payment-method-card h3{margin:0 0 4px;font-size:18px;font-weight:600;color:#111827');
  css = css.replace(/\.back-link:hover\{color:#1a1a1a/g, '.back-link:hover{color:#111827');
  css = css.replace(/\.checkout-content\{[^}]*background:linear-gradient\(135deg,#1a1a1a 0%,#0a0a0a 100%\)/g, '.checkout-content{display:grid;grid-template-columns:1fr 1.5fr;gap:40px;background:linear-gradient(135deg,#f9fafb 0%,#ffffff 100%)');
  css = css.replace(/\.checkout-preview-info h3\{[^}]*color:#fff/g, '.checkout-preview-info h3{font-size:20px;font-weight:700;margin:0 0 8px;color:#111827');
  css = css.replace(/\.checkout-preview-total\{[^}]*color:#fff/g, '.checkout-preview-total{font-size:28px;font-weight:700;color:#111827');
  css = css.replace(/\.checkout-form-title\{[^}]*color:#fff/g, '.checkout-form-title{font-size:28px;font-weight:700;color:#111827');
  css = css.replace(/\.form-group input,\.form-group textarea,\.form-group select\{[^}]*background:#0a0a0a/g, '.form-group input,.form-group textarea,.form-group select{padding:12px 16px;background:#ffffff');
  css = css.replace(/\.form-group input,\.form-group textarea,\.form-group select\{[^}]*color:#fff/g, '.form-group input,.form-group textarea,.form-group select{padding:12px 16px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;font-size:15px;font-family:inherit;transition:all 0.3s ease;width:100%;color:#111827');
  
  // Replace order success colors
  css = css.replace(/\.order-success-container\{[^}]*background:#0a0a0a/g, '.order-success-container{min-height:calc(100vh - 200px);display:flex;align-items:center;justify-content:center;padding:40px 24px;background:#ffffff');
  css = css.replace(/\.order-success-card\{[^}]*background:linear-gradient\(135deg,#1a1a1a 0%,#0a0a0a 100%\)/g, '.order-success-card{background:linear-gradient(135deg,#f9fafb 0%,#ffffff 100%)');
  css = css.replace(/\.success-title\{[^}]*color:#fff/g, '.success-title{font-size:32px;font-weight:700;color:#111827');
  css = css.replace(/\.order-details-box\{[^}]*background:#0a0a0a/g, '.order-details-box{background:#ffffff');
  css = css.replace(/\.order-detail-value\{[^}]*color:#fff/g, '.order-detail-value{font-size:16px;color:#111827');
  
  // Replace help page colors
  css = css.replace(/\.help-title\{[^}]*color:#fff/g, '.help-title{font-size:42px;font-weight:700;color:#111827');
  css = css.replace(/\.help-info-card\{[^}]*background:linear-gradient\(135deg,#1a1a1a 0%,#0a0a0a 100%\)/g, '.help-info-card{background:linear-gradient(135deg,#f9fafb 0%,#ffffff 100%)');
  css = css.replace(/\.help-info-card h3\{[^}]*color:#fff/g, '.help-info-card h3{font-size:20px;font-weight:700;color:#111827');
  css = css.replace(/\.help-form-card\{[^}]*background:linear-gradient\(135deg,#1a1a1a 0%,#0a0a0a 100%\)/g, '.help-form-card{background:linear-gradient(135deg,#f9fafb 0%,#ffffff 100%)');
  css = css.replace(/\.help-form-title\{[^}]*color:#fff/g, '.help-form-title{font-size:28px;font-weight:700;color:#111827');
  css = css.replace(/\.form-group label\{[^}]*color:#fff/g, '.form-group label{font-weight:600;color:#111827');
  css = css.replace(/\.form-input,\.form-textarea,\.form-input-disabled\{[^}]*background:#0a0a0a/g, '.form-input,.form-textarea,.form-input-disabled{width:100%;padding:14px 16px;background:#ffffff');
  css = css.replace(/\.form-input,\.form-textarea,\.form-input-disabled\{[^}]*color:#fff/g, '.form-input,.form-textarea,.form-input-disabled{width:100%;padding:14px 16px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;color:#111827');
  css = css.replace(/\.form-input:focus,\.form-textarea:focus\{[^}]*background:#111/g, '.form-input:focus,.form-textarea:focus{outline:none;border-color:#d1d5db;background:#ffffff');
  css = css.replace(/\.form-input-disabled\{[^}]*background:#0f0f0f/g, '.form-input-disabled{opacity:0.6;cursor:not-allowed;background:#f3f4f6');
  css = css.replace(/\.help-back-link:hover\{[^}]*background:#1a1a1a/g, '.help-back-link:hover{color:#111827;background:#f3f4f6');
  css = css.replace(/\.help-back-link:hover\{color:#fff/g, '.help-back-link:hover{color:#111827');
  
  // Replace admin colors
  css = css.replace(/\.admin-container\{[^}]*background:#0a0a0a/g, '.admin-container{max-width:1400px;margin:0 auto;padding:24px;background:#ffffff');
  css = css.replace(/\.admin-header\{[^}]*background:linear-gradient\(135deg,#1a1a1a 0%,#000000 100%\)/g, '.admin-header{background:linear-gradient(135deg,#f9fafb 0%,#ffffff 100%)');
  css = css.replace(/\.admin-title\{[^}]*color:#fff/g, '.admin-title{font-size:36px;font-weight:700;color:#111827');
  css = css.replace(/\.admin-subtitle\{[^}]*color:rgba\(255,255,255,0\.7\)/g, '.admin-subtitle{font-size:16px;color:rgba(17,24,39,0.7)');
  css = css.replace(/\.logout-modal-overlay\{[^}]*background:rgba\(0,0,0,0\.85\)/g, '.logout-modal-overlay{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.85)');
  css = css.replace(/\.logout-modal-content\{[^}]*background:linear-gradient\(135deg,#1a1a1a 0%,#0a0a0a 100%\)/g, '.logout-modal-content{background:linear-gradient(135deg,#f9fafb 0%,#ffffff 100%)');
  css = css.replace(/\.logout-modal-title\{[^}]*color:#fff/g, '.logout-modal-title{font-size:28px;font-weight:700;color:#111827');
  css = css.replace(/\.logout-modal-cancel\{[^}]*background:#2a2a2a/g, '.logout-modal-cancel{background:#e5e7eb');
  css = css.replace(/\.logout-modal-cancel\{[^}]*color:#fff/g, '.logout-modal-cancel{display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 28px;border-radius:12px;font-weight:600;font-size:15px;cursor:pointer;transition:all 0.3s ease;border:none;min-width:140px;background:#e5e7eb;color:#111827');
  css = css.replace(/\.logout-modal-cancel:hover\{[^}]*background:#3a3a3a/g, '.logout-modal-cancel:hover{background:#d1d5db');
  css = css.replace(/\.stat-card\{[^}]*background:#1a1a1a/g, '.stat-card{background:#f9fafb');
  css = css.replace(/\.stat-value\{[^}]*color:#fff/g, '.stat-value{font-size:32px;font-weight:700;color:#111827');
  css = css.replace(/\.admin-action-btn\{[^}]*color:#fff/g, '.admin-action-btn{display:inline-flex;align-items:center;gap:10px;padding:14px 28px;color:#111827');
  css = css.replace(/\.user-card\{[^}]*background:#1a1a1a/g, '.user-card{display:flex;align-items:center;gap:20px;background:#f9fafb');
  css = css.replace(/\.user-email\{[^}]*color:#fff/g, '.user-email{font-size:18px;font-weight:600;color:#111827');
  css = css.replace(/\.user-id-badge\{[^}]*background:#2a2a2a/g, '.user-id-badge{background:#e5e7eb');
  css = css.replace(/\.user-id-badge\{[^}]*color:#fff/g, '.user-id-badge{background:#e5e7eb;color:#111827');
  css = css.replace(/\.admin-back-btn:hover\{color:#fff/g, '.admin-back-btn:hover{background:transparent;color:#111827');
  css = css.replace(/\.admin-section\{[^}]*background:#1a1a1a/g, '.admin-section{background:#f9fafb');
  css = css.replace(/\.section-title\{[^}]*color:#fff/g, '.section-title{font-size:24px;font-weight:700;color:#111827');
  css = css.replace(/\.section-count\{[^}]*background:#2a2a2a/g, '.section-count{font-size:14px;color:#9ca3af;background:#e5e7eb');
  css = css.replace(/\.empty-state h3\{[^}]*color:#fff/g, '.empty-state h3{font-size:20px;font-weight:600;color:#111827');
  css = css.replace(/\.artwork-card-admin\{[^}]*background:#1a1a1a/g, '.artwork-card-admin{background:#f9fafb');
  css = css.replace(/\.artwork-image-admin\{[^}]*background:#0a0a0a/g, '.artwork-image-admin{width:100%;height:200px;overflow:hidden;background:#ffffff');
  css = css.replace(/\.artwork-title-admin\{[^}]*color:#fff/g, '.artwork-title-admin{font-size:18px;font-weight:600;color:#111827');
  css = css.replace(/\.order-card\{[^}]*background:#1a1a1a/g, '.order-card{background:#f9fafb');
  css = css.replace(/\.order-id-badge\{[^}]*background:#2a2a2a/g, '.order-id-badge{background:#e5e7eb');
  css = css.replace(/\.order-id-badge\{[^}]*color:#fff/g, '.order-id-badge{background:#e5e7eb;color:#111827');
  css = css.replace(/\.order-detail-value\{[^}]*color:#fff/g, '.order-detail-value{color:#111827');
  css = css.replace(/\.order-artwork-info h4\{[^}]*color:#fff/g, '.order-artwork-info h4{font-size:16px;font-weight:600;color:#111827');
  css = css.replace(/\.order-artwork-image\{[^}]*background:#0a0a0a/g, '.order-artwork-image{width:100%;height:120px;object-fit:cover;border-radius:8px;background:#ffffff');
  css = css.replace(/\.order-payment-badge\{[^}]*background:#2a2a2a/g, '.order-payment-badge{background:#e5e7eb');
  css = css.replace(/\.order-status-select\{[^}]*background:#0a0a0a/g, '.order-status-select{padding:10px 16px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;font-weight:600;background:#ffffff');
  css = css.replace(/\.order-status-select\{[^}]*color:#fff/g, '.order-status-select{padding:10px 16px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;font-weight:600;background:#ffffff;color:#111827');
  css = css.replace(/\.order-filter-btn\{[^}]*background:#1a1a1a/g, '.order-filter-btn{display:flex;align-items:center;gap:8px;padding:12px 24px;background:#f9fafb');
  css = css.replace(/\.order-filter-btn:hover\{[^}]*background:#2a2a2a/g, '.order-filter-btn:hover{background:#e5e7eb');
  css = css.replace(/\.order-status-section\{[^}]*background:#1a1a1a/g, '.order-status-section{background:#f9fafb');
  css = css.replace(/\.order-section-title\{[^}]*color:#fff/g, '.order-section-title{font-size:22px;font-weight:700;color:#111827');
  css = css.replace(/\.order-section-count\{[^}]*background:#2a2a2a/g, '.order-section-count{font-size:14px;color:#9ca3af;background:#e5e7eb');
  css = css.replace(/\.support-message-card\{[^}]*background:#1a1a1a/g, '.support-message-card{background:#f9fafb');
  css = css.replace(/\.support-message-id-badge\{[^}]*background:#2a2a2a/g, '.support-message-id-badge{background:#e5e7eb');
  css = css.replace(/\.support-message-id-badge\{[^}]*color:#fff/g, '.support-message-id-badge{background:#e5e7eb;color:#111827');
  css = css.replace(/\.support-message-detail-value\{[^}]*color:#fff/g, '.support-message-detail-value{color:#111827');
  css = css.replace(/\.support-message-subject-title\{[^}]*color:#fff/g, '.support-message-subject-title{font-size:20px;font-weight:700;color:#111827');
  css = css.replace(/\.admin-form-container\{[^}]*background:#1a1a1a/g, '.admin-form-container{background:#f9fafb');
  css = css.replace(/\.form-error\{[^}]*background:#2a1a1a/g, '.form-error{display:flex;align-items:center;gap:12px;padding:16px 20px;background:#fee2e2');
  css = css.replace(/\.form-label-admin\{[^}]*color:#fff/g, '.form-label-admin{display:flex;align-items:center;gap:10px;font-weight:600;color:#111827');
  css = css.replace(/\.form-input-admin,\.form-textarea-admin\{[^}]*background:#0a0a0a/g, '.form-input-admin,.form-textarea-admin{padding:14px 18px;background:#ffffff');
  css = css.replace(/\.form-input-admin,\.form-textarea-admin\{[^}]*color:#fff/g, '.form-input-admin,.form-textarea-admin{padding:14px 18px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;font-size:15px;font-family:inherit;color:#111827');
  css = css.replace(/\.file-upload-label\{[^}]*background:#0a0a0a/g, '.file-upload-label{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:48px 24px;background:#ffffff');
  css = css.replace(/\.file-upload-label:hover\{[^}]*background:#0f0f0f/g, '.file-upload-label:hover{border-color:#d1d5db;background:#f3f4f6');
  css = css.replace(/\.file-upload-label:hover svg\{color:#fff/g, '.file-upload-label:hover svg{color:#111827');
  css = css.replace(/\.file-upload-text\{[^}]*color:#fff/g, '.file-upload-text{font-weight:600;color:#111827');
  css = css.replace(/\.cancel-btn:hover\{[^}]*background:#1a1a1a/g, '.cancel-btn:hover{background:#f3f4f6');
  css = css.replace(/\.cancel-btn:hover\{color:#fff/g, '.cancel-btn:hover{background:#f3f4f6;border-color:#d1d5db;color:#111827');
  
  // Replace media query dark backgrounds
  css = css.replace(/body\{background:#0a0a0a/g, 'body{background:#ffffff');
  
  return css;
}

// Extract and convert stylesCss
const stylesCssMatch = appContent.match(/const stylesCss = `([^`]+)`/);
if (stylesCssMatch) {
  const originalStylesCss = stylesCssMatch[1];
  const convertedStylesCss = convertDarkToLight(originalStylesCss);
  appContent = appContent.replace(/const stylesCss = `[^`]+`/, `const stylesCss = \`${convertedStylesCss}\``);
  console.log('Converted stylesCss');
}

// Extract and convert loginCss
const loginCssMatch = appContent.match(/const loginCss = `([^`]+)`/);
if (loginCssMatch) {
  const originalLoginCss = loginCssMatch[1];
  const convertedLoginCss = convertDarkToLight(originalLoginCss);
  appContent = appContent.replace(/const loginCss = `[^`]+`/, `const loginCss = \`${convertedLoginCss}\``);
  console.log('Converted loginCss');
}

// Write back to file
fs.writeFileSync(appPath, appContent, 'utf8');
console.log('Conversion complete!');

