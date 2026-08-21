"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptData = exports.encryptData = void 0;
const crypto_1 = __importDefault(require("crypto"));
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto_1.default.randomBytes(32).toString('hex'); // Fallback for safety, though keys should be persistent
const ALGORITHM = 'aes-256-cbc';
// Helper to ensure key is exactly 32 bytes
const getKeyBuffer = () => {
    let key = Buffer.from(ENCRYPTION_KEY, 'hex');
    if (key.length !== 32) {
        // If it's not a valid 32-byte hex, hash the string to get 32 bytes
        key = crypto_1.default.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    }
    return key;
};
const encryptData = (text) => {
    if (!text)
        return text;
    try {
        const iv = crypto_1.default.randomBytes(16);
        const cipher = crypto_1.default.createCipheriv(ALGORITHM, getKeyBuffer(), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return `${iv.toString('hex')}:${encrypted}`;
    }
    catch (error) {
        console.error('Encryption error:', error);
        return text; // Fallback to raw text if encryption fails (better than losing data, though risky. In strict environments, throw error.)
    }
};
exports.encryptData = encryptData;
const decryptData = (text) => {
    if (!text)
        return text;
    if (!text.includes(':'))
        return text; // If it doesn't look like an encrypted string (iv:cipher), return as is (for backwards compatibility)
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, getKeyBuffer(), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString('utf8');
    }
    catch (error) {
        console.error('Decryption error:', error);
        return '*** ENCRYPTED DATA CORRUPTED ***';
    }
};
exports.decryptData = decryptData;
//# sourceMappingURL=crypto.js.map