const isProduction = process.env.NODE_ENV === 'production';

const ALLOWED_ORIGIN_SET = new Set(
  [
    process.env.FRONTEND_URL,
    ...(!isProduction ? ['http://localhost:3000', 'http://localhost:3001'] : []),
    'https://akwaaba-homes.vercel.app',
    'https://akwaaba-homes-three.vercel.app',
    'https://www.akwaabahomes.com',
    'https://akwaabahomes.com',
  ]
    .filter(Boolean)
    .map((url) => (url as string).replace(/\/$/, ''))
);

const PRIVATE_NETWORK_REGEX =
  /^(http:\/\/|https:\/\/)?(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/;

const OFFICIAL_VERCEL_PREVIEW_REGEX =
  /^https:\/\/(akwaaba-homes[a-z0-9-]*|[a-z0-9-]+-akwaaba-homes[a-z0-9-]*)\.vercel\.app$/;

/**
 * Validates whether an HTTP Origin belongs to the strict AkwaabaHomes allowlist.
 * Private network and localhost origins are only permitted outside production.
 */
export const isOriginAllowed = (origin?: string | null): boolean => {
  if (!origin) return false;
  const cleanOrigin = origin.replace(/\/$/, '');

  if (ALLOWED_ORIGIN_SET.has(cleanOrigin)) {
    return true;
  }

  if (!isProduction && PRIVATE_NETWORK_REGEX.test(cleanOrigin)) {
    return true;
  }

  if (OFFICIAL_VERCEL_PREVIEW_REGEX.test(cleanOrigin)) {
    return true;
  }

  return false;
};
