import prisma from './prisma';
import { emitToAll } from '../socket';
import { notifyMaintenanceEnded } from './notification.service';

let cachedConfig: any = null;
let lastFetch = 0;
const CACHE_TTL = 5000; // 5-second cache for high performance

export const getSystemConfig = async () => {
  const now = Date.now();
  if (cachedConfig && (now - lastFetch < CACHE_TTL)) {
    const nowDate = new Date(now);
    if (cachedConfig.maintenanceMode && cachedConfig.maintenanceEndTime && nowDate >= new Date(cachedConfig.maintenanceEndTime)) {
      return await autoDeactivateMaintenance();
    }
    if (!cachedConfig.maintenanceMode && cachedConfig.maintenanceScheduled && cachedConfig.maintenanceStartTime && nowDate >= new Date(cachedConfig.maintenanceStartTime)) {
      if (!cachedConfig.maintenanceEndTime || nowDate < new Date(cachedConfig.maintenanceEndTime)) {
        return await autoActivateScheduledMaintenance();
      }
    }
    return cachedConfig;
  }

  try {
    let config = await prisma.systemConfig.findUnique({ where: { id: 'GLOBAL' } });
    if (!config) {
      config = await prisma.systemConfig.create({ data: { id: 'GLOBAL' } });
    }

    const nowDate = new Date();
    if (config.maintenanceMode && config.maintenanceEndTime && nowDate >= new Date(config.maintenanceEndTime)) {
      config = await autoDeactivateMaintenance();
    } else if (!config.maintenanceMode && config.maintenanceScheduled && config.maintenanceStartTime && nowDate >= new Date(config.maintenanceStartTime)) {
      if (!config.maintenanceEndTime || nowDate < new Date(config.maintenanceEndTime)) {
        config = await autoActivateScheduledMaintenance();
      }
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
      maintenanceEndTime: null,
      maintenanceStartTime: null,
      maintenanceScheduled: false,
      maintenanceTitle: 'Scheduled Platform Maintenance',
      maintenanceMessage: 'AkwaabaHomes is currently undergoing scheduled maintenance to upgrade our infrastructure and improve your rental experience. We will be back online shortly.',
      maintenanceScope: 'GLOBAL',
      maintenanceContactEmail: 'support@akwaabahomes.com',
      maintenanceContactPhone: '+233 24 000 0000',
    };
  }
};

const autoActivateScheduledMaintenance = async () => {
  try {
    const updated = await prisma.systemConfig.update({
      where: { id: 'GLOBAL' },
      data: {
        maintenanceMode: true,
        maintenanceScheduled: false,
      }
    });
    cachedConfig = updated;
    lastFetch = Date.now();

    try {
      emitToAll('config_updated', updated);
    } catch (e) {
      console.error('Failed to emit config_updated socket event', e);
    }

    return updated;
  } catch (err) {
    console.error('Error auto-activating scheduled maintenance mode:', err);
    return cachedConfig;
  }
};

const autoDeactivateMaintenance = async () => {
  try {
    const updated = await prisma.systemConfig.update({
      where: { id: 'GLOBAL' },
      data: {
        maintenanceMode: false,
        maintenanceScheduled: false,
        maintenanceEndTime: null,
        maintenanceStartTime: null
      }
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
