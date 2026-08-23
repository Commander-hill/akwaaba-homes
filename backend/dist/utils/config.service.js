"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateConfigCache = exports.getSystemConfig = void 0;
const prisma_1 = __importDefault(require("./prisma"));
let cachedConfig = null;
let lastFetch = 0;
const CACHE_TTL = 5000; // 5-second cache for high performance
const getSystemConfig = async () => {
    const now = Date.now();
    if (cachedConfig && (now - lastFetch < CACHE_TTL)) {
        return cachedConfig;
    }
    try {
        let config = await prisma_1.default.systemConfig.findUnique({ where: { id: 'GLOBAL' } });
        if (!config) {
            config = await prisma_1.default.systemConfig.create({ data: { id: 'GLOBAL' } });
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
const invalidateConfigCache = () => {
    cachedConfig = null;
    lastFetch = 0;
};
exports.invalidateConfigCache = invalidateConfigCache;
//# sourceMappingURL=config.service.js.map