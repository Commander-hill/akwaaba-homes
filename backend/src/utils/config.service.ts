import prisma from './prisma';

let cachedConfig: any = null;
let lastFetch = 0;
const CACHE_TTL = 5000; // 5-second cache for high performance

export const getSystemConfig = async () => {
  const now = Date.now();
  if (cachedConfig && (now - lastFetch < CACHE_TTL)) {
    return cachedConfig;
  }

  try {
    let config = await prisma.systemConfig.findUnique({ where: { id: 'GLOBAL' } });
    if (!config) {
      config = await prisma.systemConfig.create({ data: { id: 'GLOBAL' } });
    }
    cachedConfig = config;
    lastFetch = now;
    return config;
  } catch (error) {
    console.error('Error reading SystemConfig from DB:', error);
    return {
      id: 'GLOBAL',
      ghanaCardVerificationEnabled: true,
      bookingGracePeriodHours: 48,
      platformCommissionPercent: 5.0,
      roommateFinderEnabled: true,
      maintenanceMode: false,
    };
  }
};

export const invalidateConfigCache = () => {
  cachedConfig = null;
  lastFetch = 0;
};
