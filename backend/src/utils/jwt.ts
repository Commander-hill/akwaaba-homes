import jwt from 'jsonwebtoken';

const isProduction = process.env.NODE_ENV === 'production';
const rawJwtSecret = process.env.JWT_SECRET;
const rawRefreshSecret = process.env.REFRESH_JWT_SECRET;

if (isProduction && (!rawJwtSecret || rawJwtSecret.includes('dev') || rawJwtSecret.includes('fallback') || rawJwtSecret.length < 32)) {
  throw new Error('FATAL SECURITY ERROR: A secure, cryptographically random JWT_SECRET of at least 32 characters must be defined in production.');
}

const JWT_SECRET = rawJwtSecret || 'fallback-secret-key-for-dev-only-change-in-prod';
const REFRESH_JWT_SECRET = rawRefreshSecret || rawJwtSecret || 'fallback-refresh-secret-key-dev';

export const generateAccessToken = (payload: { id: string; role: string; tokenVersion?: number }) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' }); // 15 minutes
};

export const generateRefreshToken = (payload: { id: string; tokenVersion?: number }) => {
  return jwt.sign(payload, REFRESH_JWT_SECRET, { expiresIn: '7d' }); // 7 days
};

export const verifyAccessToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string) => {
  try {
    return jwt.verify(token, REFRESH_JWT_SECRET);
  } catch (error) {
    return null;
  }
};
