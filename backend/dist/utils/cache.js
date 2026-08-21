"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cache_1 = __importDefault(require("node-cache"));
// stdTTL is the default time-to-live in seconds (5 minutes)
// checkperiod is the interval in seconds for checking and deleting expired keys (1 minute)
const appCache = new node_cache_1.default({ stdTTL: 300, checkperiod: 60 });
exports.default = appCache;
//# sourceMappingURL=cache.js.map