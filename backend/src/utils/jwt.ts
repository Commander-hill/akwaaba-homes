import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-dev-only-change-in-prod';
const REFRESH_JWT_SECRET = process.env.REFRESH_JWT_SECRET || 'fallback-refresh-secret-key-prod';

export const generateAccessToken = (payload: { id: string; role: string }) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' }); // 15 minutes
};

export const generateRefreshToken = (payload: { id: string }) => {
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
