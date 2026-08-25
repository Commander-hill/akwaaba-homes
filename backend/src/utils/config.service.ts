import prisma from './prisma';
import { emitToAll } from '../socket';
import { notifyMaintenanceEnded } from './notification.service';

let cachedConfig: any = null;
let lastFetch = 0;
const CACHE_TTL = 5000; // 5-second cache for high performance

export const getSystemConfig = async () => {
  const now = Date.now();
  if (cachedConfig && (now - lastFetch < CACHE_TTL)) {
    if (cachedConfig.maintenanceMode && cachedConfig.maintenanceEndTime && new Date() >= new Date(cachedConfig.maintenanceEndTime)) {
      return await autoDeactivateMaintenance();
    }
    return cachedConfig;
  }

  try {
    let config = await prisma.systemConfig.findUnique({ where: { id: 'GLOBAL' } });
    if (!config) {
      config = await prisma.systemConfig.create({ data: { id: 'GLOBAL' } });
    }

    if (config.maintenanceMode && config.maintenanceEndTime && new Date() >= new Date(config.maintenanceEndTime)) {
      config = await autoDeactivateMaintenance();
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

const autoDeactivateMaintenance = async () => {
  try {
    const updated = await prisma.systemConfig.update({
      where: { id: 'GLOBAL' },
      data: { maintenanceMode: false, maintenanceEndTime: null }
    });
    cachedConfig = updated;
    lastFetch = Date.now();

    try {
      emitToAll('config_updated', updated);
    } catch (e) {
      console.error('Failed to emit config_updated socket event', e);
    }

    // Trigger email notifications to all subscribers
    notifyMaintenanceEnded().catch(err => console.error('Error sending maintenance ended emails:', err));

    return updated;
  } catch (err) {
    console.error('Error auto-deactivating maintenance mode:', err);
    return cachedConfig;
  }
};

export const invalidateConfigCache = () => {
  cachedConfig = null;
  lastFetch = 0;
};
