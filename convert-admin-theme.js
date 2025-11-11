const fs = require('fs');

// Read the CSS file
let css = fs.readFileSync('public/styles.css', 'utf8');

// Admin container and header
css = css.replace(/\.admin-container\{[^}]*background:#0a0a0a/g, '.admin-container{max-width:1400px;margin:0 auto;padding:24px;background:#ffffff');
css = css.replace(/\.admin-header\{[^}]*background:linear-gradient\(135deg,#1a1a1a 0%,#000000 100%\)/g, '.admin-header{background:linear-gradient(135deg,#f9fafb 0%,#ffffff 100%)');
css = css.replace(/\.admin-title\{[^}]*color:#fff/g, '.admin-title{font-size:36px;font-weight:700;color:#111827');
css = css.replace(/\.admin-subtitle\{[^}]*color:rgba\(255,255,255,0\.7\)/g, '.admin-subtitle{font-size:16px;color:rgba(17,24,39,0.7)');

// Stat cards
css = css.replace(/\.stat-card\{[^}]*background:#1a1a1a/g, '.stat-card{background:#f9fafb');
css = css.replace(/\.stat-value\{[^}]*color:#fff/g, '.stat-value{font-size:32px;font-weight:700;color:#111827');
css = css.replace(/\.stat-card\{[^}]*border:1px solid #2a2a2a/g, '.stat-card{background:#f9fafb;border-radius:16px;padding:24px;box-shadow:0 4px 12px rgba(0,0,0,0.1);display:flex;align-items:center;gap:20px;transition:all 0.3s ease;border:1px solid #e5e7eb');

// Admin action buttons
css = css.replace(/\.admin-action-btn\{[^}]*color:#fff/g, '.admin-action-btn{display:inline-flex;align-items:center;gap:10px;padding:14px 28px;color:#111827');
css = css.replace(/\.admin-action-btn\{[^}]*border:1px solid #2a2a2a/g, '.admin-action-btn{display:inline-flex;align-items:center;gap:10px;padding:14px 28px;color:#111827;text-decoration:none;border-radius:12px;font-weight:600;font-size:16px;transition:all 0.3s ease;box-shadow:0 4px 14px rgba(0,0,0,0.1);border:1px solid #e5e7eb');

// Admin sections
css = css.replace(/\.admin-section\{[^}]*background:#1a1a1a/g, '.admin-section{background:#f9fafb');
css = css.replace(/\.section-title\{[^}]*color:#fff/g, '.section-title{font-size:24px;font-weight:700;color:#111827');
css = css.replace(/\.section-count\{[^}]*background:#2a2a2a/g, '.section-count{font-size:14px;color:#6b7280;background:#e5e7eb');
css = css.replace(/\.section-header\{[^}]*border-bottom:2px solid #2a2a2a/g, '.section-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e5e7eb');

// User cards
css = css.replace(/\.user-card\{[^}]*background:#1a1a1a/g, '.user-card{display:flex;align-items:center;gap:20px;background:#f9fafb');
css = css.replace(/\.user-email\{[^}]*color:#fff/g, '.user-email{font-size:18px;font-weight:600;color:#111827');
css = css.replace(/\.user-id-badge\{[^}]*background:#2a2a2a;color:#fff/g, '.user-id-badge{background:#e5e7eb;color:#111827');
css = css.replace(/\.user-id-badge\{[^}]*border:1px solid #3a3a3a/g, '.user-id-badge{background:#e5e7eb;color:#111827;padding:6px 14px;border-radius:8px;font-weight:600;font-size:14px;border:1px solid #d1d5db');

// Artwork cards admin
css = css.replace(/\.artwork-card-admin\{[^}]*background:#1a1a1a/g, '.artwork-card-admin{background:#f9fafb');
css = css.replace(/\.artwork-title-admin\{[^}]*color:#fff/g, '.artwork-title-admin{font-size:18px;font-weight:600;color:#111827');
css = css.replace(/\.artwork-image-admin\{[^}]*background:#0a0a0a/g, '.artwork-image-admin{width:100%;height:200px;overflow:hidden;background:#ffffff');

// Order cards
css = css.replace(/\.order-card\{[^}]*background:#1a1a1a/g, '.order-card{background:#f9fafb');
css = css.replace(/\.order-detail-value\{[^}]*color:#fff/g, '.order-detail-value{color:#111827');
css = css.replace(/\.order-artwork-info h4\{[^}]*color:#fff/g, '.order-artwork-info h4{font-size:16px;font-weight:600;color:#111827');
css = css.replace(/\.order-id-badge\{[^}]*background:#2a2a2a;color:#fff/g, '.order-id-badge{background:#e5e7eb;color:#111827');
css = css.replace(/\.order-id-badge\{[^}]*border:1px solid #3a3a3a/g, '.order-id-badge{background:#e5e7eb;color:#111827;padding:6px 14px;border-radius:8px;font-weight:600;font-size:14px;border:1px solid #d1d5db');
css = css.replace(/\.order-artwork-image\{[^}]*background:#0a0a0a/g, '.order-artwork-image{width:100%;height:120px;object-fit:cover;border-radius:8px;background:#ffffff');

// Order status sections
css = css.replace(/\.order-status-section\{[^}]*background:#1a1a1a/g, '.order-status-section{background:#f9fafb');
css = css.replace(/\.order-section-title\{[^}]*color:#fff/g, '.order-section-title{font-size:22px;font-weight:700;color:#111827');
css = css.replace(/\.order-section-count\{[^}]*background:#2a2a2a/g, '.order-section-count{font-size:14px;color:#6b7280;background:#e5e7eb');
css = css.replace(/\.order-status-select\{[^}]*background:#0a0a0a;color:#fff/g, '.order-status-select{padding:10px 16px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;font-weight:600;background:#ffffff;color:#111827');

// Support message cards
css = css.replace(/\.support-message-card\{[^}]*background:#1a1a1a/g, '.support-message-card{background:#f9fafb');
css = css.replace(/\.support-message-detail-value\{[^}]*color:#fff/g, '.support-message-detail-value{color:#111827');
css = css.replace(/\.support-message-subject-title\{[^}]*color:#fff/g, '.support-message-subject-title{font-size:20px;font-weight:700;color:#111827');
css = css.replace(/\.support-message-id-badge\{[^}]*background:#2a2a2a;color:#fff/g, '.support-message-id-badge{background:#e5e7eb;color:#111827');
css = css.replace(/\.support-message-id-badge\{[^}]*border:1px solid #3a3a3a/g, '.support-message-id-badge{background:#e5e7eb;color:#111827;padding:6px 14px;border-radius:8px;font-weight:600;font-size:14px;border:1px solid #d1d5db');

// Admin form container
css = css.replace(/\.admin-form-container\{[^}]*background:#1a1a1a/g, '.admin-form-container{background:#f9fafb');
css = css.replace(/\.form-label-admin\{[^}]*color:#fff/g, '.form-label-admin{display:flex;align-items:center;gap:10px;font-weight:600;color:#111827');
css = css.replace(/\.form-input-admin\{[^}]*background:#0a0a0a/g, '.form-input-admin{padding:14px 18px;background:#ffffff');
css = css.replace(/\.form-textarea-admin\{[^}]*background:#0a0a0a/g, '.form-textarea-admin{padding:14px 18px;background:#ffffff');
css = css.replace(/\.form-input-admin\{[^}]*color:#fff/g, '.form-input-admin{padding:14px 18px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;font-size:15px;font-family:inherit;color:#111827');
css = css.replace(/\.form-textarea-admin\{[^}]*color:#fff/g, '.form-textarea-admin{padding:14px 18px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;font-size:15px;font-family:inherit;color:#111827');
css = css.replace(/\.file-upload-label\{[^}]*background:#0a0a0a/g, '.file-upload-label{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:48px 24px;background:#ffffff');
css = css.replace(/\.file-upload-label:hover\{[^}]*background:#0f0f0f/g, '.file-upload-label:hover{border-color:#9ca3af;background:#f3f4f6');
css = css.replace(/\.file-upload-text\{[^}]*color:#fff/g, '.file-upload-text{font-weight:600;color:#111827');
css = css.replace(/\.file-upload-label:hover svg\{color:#fff/g, '.file-upload-label:hover svg{color:#111827');

// Empty state
css = css.replace(/\.empty-state h3\{[^}]*color:#fff/g, '.empty-state h3{font-size:20px;font-weight:600;color:#111827');

// Borders - convert dark borders to light
css = css.replace(/\.admin-header\{[^}]*border:1px solid #2a2a2a/g, '.admin-header{background:linear-gradient(135deg,#f9fafb 0%,#ffffff 100%);border-radius:16px;padding:32px;margin-bottom:32px;box-shadow:0 8px 24px rgba(0,0,0,0.1);border:1px solid #e5e7eb');
css = css.replace(/\.admin-section\{[^}]*border:1px solid #2a2a2a/g, '.admin-section{background:#f9fafb;border-radius:16px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,0.1);border:1px solid #e5e7eb');
css = css.replace(/\.user-card\{[^}]*border:1px solid #2a2a2a/g, '.user-card{display:flex;align-items:center;gap:20px;background:#f9fafb;border-radius:12px;padding:24px;border:1px solid #e5e7eb');
css = css.replace(/\.artwork-card-admin\{[^}]*border:1px solid #2a2a2a/g, '.artwork-card-admin{background:#f9fafb;border-radius:12px;overflow:hidden;transition:all 0.3s ease;border:1px solid #e5e7eb');
css = css.replace(/\.order-card\{[^}]*border:1px solid #2a2a2a/g, '.order-card{background:#f9fafb;border-radius:12px;padding:24px;border:1px solid #e5e7eb');
css = css.replace(/\.order-header\{[^}]*border-bottom:1px solid #2a2a2a/g, '.order-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #e5e7eb');
css = css.replace(/\.order-actions\{[^}]*border-top:1px solid #2a2a2a/g, '.order-actions{margin-top:16px;padding-top:16px;border-top:1px solid #e5e7eb');
css = css.replace(/\.order-status-select\{[^}]*border:1px solid #2a2a2a/g, '.order-status-select{padding:10px 16px;border:1px solid #e5e7eb');
css = css.replace(/\.order-status-section\{[^}]*border:1px solid #2a2a2a/g, '.order-status-section{background:#f9fafb;border-radius:16px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,0.1);border:1px solid #e5e7eb');
css = css.replace(/\.order-section-header\{[^}]*border-bottom:1px solid #2a2a2a/g, '.order-section-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #e5e7eb');
css = css.replace(/\.support-message-card\{[^}]*border:1px solid #2a2a2a/g, '.support-message-card{background:#f9fafb;border-radius:12px;padding:24px;border:1px solid #e5e7eb');
css = css.replace(/\.support-message-header\{[^}]*border-bottom:1px solid #2a2a2a/g, '.support-message-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #e5e7eb');
css = css.replace(/\.support-message-subject\{[^}]*border-bottom:1px solid #2a2a2a/g, '.support-message-subject{margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #e5e7eb');
css = css.replace(/\.admin-form-container\{[^}]*border:1px solid #2a2a2a/g, '.admin-form-container{background:#f9fafb;border-radius:16px;padding:40px;box-shadow:0 4px 12px rgba(0,0,0,0.1);border:1px solid #e5e7eb');
css = css.replace(/\.form-input-admin:focus\{[^}]*border-color:#3a3a3a/g, '.form-input-admin:focus{outline:none;border-color:#9ca3af');
css = css.replace(/\.form-textarea-admin:focus\{[^}]*border-color:#3a3a3a/g, '.form-textarea-admin:focus{outline:none;border-color:#9ca3af');
css = css.replace(/\.file-upload-label\{[^}]*border:2px dashed #2a2a2a/g, '.file-upload-label{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:48px 24px;background:#ffffff;border:2px dashed #e5e7eb');
css = css.replace(/\.file-upload-label:hover\{[^}]*border-color:#3a3a3a/g, '.file-upload-label:hover{border-color:#9ca3af');
css = css.replace(/\.form-actions\{[^}]*border-top:1px solid #2a2a2a/g, '.form-actions{display:flex;gap:16px;margin-top:8px;padding-top:24px;border-top:1px solid #e5e7eb');
css = css.replace(/\.cancel-btn\{[^}]*border:1px solid #2a2a2a/g, '.cancel-btn{display:flex;align-items:center;justify-content:center;padding:16px 32px;background:transparent;color:#6b7280;border:1px solid #e5e7eb');
css = css.replace(/\.cancel-btn:hover\{[^}]*color:#fff/g, '.cancel-btn:hover{background:#f3f4f6;border-color:#9ca3af;color:#111827');
css = css.replace(/\.admin-back-btn:hover\{[^}]*color:#fff/g, '.admin-back-btn:hover{background:transparent;color:#111827');

// Hover states - convert dark hover borders to light
css = css.replace(/\.stat-card:hover\{[^}]*border-color:#3a3a3a/g, '.stat-card:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(0,0,0,0.15);border-color:#9ca3af');
css = css.replace(/\.admin-action-btn:hover\{[^}]*border-color:#3a3a3a/g, '.admin-action-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.15);border-color:#9ca3af');
css = css.replace(/\.user-card:hover\{[^}]*border-color:#3a3a3a/g, '.user-card:hover{border-color:#9ca3af');
css = css.replace(/\.artwork-card-admin:hover\{[^}]*border-color:#3a3a3a/g, '.artwork-card-admin:hover{border-color:#9ca3af');
css = css.replace(/\.order-card:hover\{[^}]*border-color:#3a3a3a/g, '.order-card:hover{border-color:#9ca3af');
css = css.replace(/\.support-message-card:hover\{[^}]*border-color:#3a3a3a/g, '.support-message-card:hover{border-color:#9ca3af');

// Order filter buttons
css = css.replace(/\.order-filter-btn\{[^}]*background:#1a1a1a/g, '.order-filter-btn{display:flex;align-items:center;gap:8px;padding:12px 24px;background:#f9fafb');
css = css.replace(/\.order-filter-btn:hover\{[^}]*background:#2a2a2a/g, '.order-filter-btn:hover{background:#e5e7eb');
css = css.replace(/\.order-filter-btn\{[^}]*border:1px solid #2a2a2a/g, '.order-filter-btn{display:flex;align-items:center;gap:8px;padding:12px 24px;background:#f9fafb;color:#6b7280;border:1px solid #e5e7eb');
css = css.replace(/\.order-filter-btn:hover\{[^}]*border-color:#3a3a3a/g, '.order-filter-btn:hover{border-color:#9ca3af');
css = css.replace(/\.order-payment-badge\{[^}]*background:#2a2a2a/g, '.order-payment-badge{background:#e5e7eb');

// Logout modal
css = css.replace(/\.logout-modal-overlay\{[^}]*background:rgba\(0,0,0,0\.85\)/g, '.logout-modal-overlay{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.85)');
css = css.replace(/\.logout-modal-content\{[^}]*background:linear-gradient\(135deg,#1a1a1a 0%,#0a0a0a 100%\)/g, '.logout-modal-content{background:linear-gradient(135deg,#f9fafb 0%,#ffffff 100%)');
css = css.replace(/\.logout-modal-cancel\{[^}]*background:#2a2a2a;color:#fff/g, '.logout-modal-cancel{background:#e5e7eb;color:#111827');
css = css.replace(/\.logout-modal-cancel:hover\{[^}]*background:#3a3a3a/g, '.logout-modal-cancel:hover{background:#d1d5db');

// Focus states
css = css.replace(/\.form-input-admin:focus\{[^}]*box-shadow:0 0 0 3px rgba\(255,255,255,0\.05\)/g, '.form-input-admin:focus{outline:none;border-color:#9ca3af;box-shadow:0 0 0 3px rgba(102,126,234,0.1)');
css = css.replace(/\.form-textarea-admin:focus\{[^}]*box-shadow:0 0 0 3px rgba\(255,255,255,0\.05\)/g, '.form-textarea-admin:focus{outline:none;border-color:#9ca3af;box-shadow:0 0 0 3px rgba(102,126,234,0.1)');
css = css.replace(/\.form-file-input:focus\+\.file-upload-label\{[^}]*outline:2px solid #3a3a3a/g, '.form-file-input:focus+.file-upload-label{outline:2px solid #9ca3af');

// Media query for mobile
css = css.replace(/@media\(max-width:768px\)\{body\{background:#0a0a0a/g, '@media(max-width:768px){body{background:#ffffff');

// Write the updated CSS
fs.writeFileSync('public/styles.css', css);
console.log('Admin theme converted to light successfully!');

