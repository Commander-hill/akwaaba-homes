"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateConfigCache = exports.getSystemConfig = void 0;
const prisma_1 = __importDefault(require("./prisma"));
const socket_1 = require("../socket");
const notification_service_1 = require("./notification.service");
let cachedConfig = null;
let lastFetch = 0;
const CACHE_TTL = 5000; // 5-second cache for high performance
const getSystemConfig = async () => {
    const now = Date.now();
    if (cachedConfig && (now - lastFetch < CACHE_TTL)) {
        if (cachedConfig.maintenanceMode && cachedConfig.maintenanceEndTime && new Date() >= new Date(cachedConfig.maintenanceEndTime)) {
            return await autoDeactivateMaintenance();
        }
        return cachedConfig;
    }
    try {
        let config = await prisma_1.default.systemConfig.findUnique({ where: { id: 'GLOBAL' } });
        if (!config) {
            config = await prisma_1.default.systemConfig.create({ data: { id: 'GLOBAL' } });
        }
        if (config.maintenanceMode && config.maintenanceEndTime && new Date() >= new Date(config.maintenanceEndTime)) {
            config = await autoDeactivateMaintenance();
        }
        cachedConfig = config;
        lastFetch = now;
        return config;
    }
    catch (error) {
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
exports.getSystemConfig = getSystemConfig;
const autoDeactivateMaintenance = async () => {
    try {
        const updated = await prisma_1.default.systemConfig.update({
            where: { id: 'GLOBAL' },
            data: { maintenanceMode: false, maintenanceEndTime: null }
        });
        cachedConfig = updated;
        lastFetch = Date.now();
        try {
            (0, socket_1.emitToAll)('config_updated', updated);
        }
        catch (e) {
            console.error('Failed to emit config_updated socket event', e);
        }
        // Trigger email notifications to all subscribers
        (0, notification_service_1.notifyMaintenanceEnded)().catch(err => console.error('Error sending maintenance ended emails:', err));
        return updated;
    }
    catch (err) {
        console.error('Error auto-deactivating maintenance mode:', err);
        return cachedConfig;
    }
};
const invalidateConfigCache = () => {
    cachedConfig = null;
    lastFetch = 0;
};
exports.invalidateConfigCache = invalidateConfigCache;
//# sourceMappingURL=config.service.js.map