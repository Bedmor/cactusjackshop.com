// WhatsApp Configuration
// ===========================
// Update this file with your WhatsApp business number

// INSTRUCTIONS:
// 1. Replace the number below with your WhatsApp number
// 2. Format: Country code + number (no + sign, no spaces, no dashes)
// 3. Example for Turkey: 0555 123 4567 → 905551234567
// 4. Example for US: (555) 123-4567 → 15551234567

// ⚠️ CHANGE THIS NUMBER TO YOUR WHATSAPP BUSINESS NUMBER
const WHATSAPP_CONFIG = {
    // Your WhatsApp number (format: country code + number)
    number: '905550200605', // CHANGE THIS!

    // Optional: Custom message prefix
    messagePrefix: '🛍️ *Yeni Sipariş*\n\n',

    // Optional: Custom message suffix
    messageSuffix: '\n\nTeşekkürler!',

    // Optional: Enable/disable automatic cart clearing after WhatsApp redirect
    clearCartAfterRedirect: true,

    // Optional: Delay before showing cart clear confirmation (milliseconds)
    confirmDelay: 1000
};

// Export for use in shop.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WHATSAPP_CONFIG;
}
