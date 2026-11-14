"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const MAX_FIND_MANY_ROWS = 500;
const SLOW_QUERY_THRESHOLD_MS = 2000;
const basePrisma = new client_1.PrismaClient({
    datasources: process.env.DATABASE_URL
        ? {
            db: {
                url: process.env.DATABASE_URL,
            },
        }
        : undefined,
});
/**
 * Hardened Prisma client:
 * 1. Enforces an upper bound (500 rows) on findMany queries to prevent unbounded OOM / DoS reads.
 * 2. Logs slow database queries exceeding 2,000ms for operational visibility.
 */
const prisma = basePrisma.$extends({
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                if (operation === 'findMany') {
                    const mutableArgs = (args || {});
                    if (typeof mutableArgs.take !== 'number' || mutableArgs.take > MAX_FIND_MANY_ROWS || mutableArgs.take <= 0) {
                        mutableArgs.take = MAX_FIND_MANY_ROWS;
                    }
                    args = mutableArgs;
                }
                const start = Date.now();
                const result = await query(args);
                const durationMs = Date.now() - start;
                if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
                    console.warn(`[DB SLOW QUERY] ${model}.${operation} took ${durationMs}ms`);
                }
                return result;
            },
        },
    },
});
exports.default = prisma;
//# sourceMappingURL=prisma.js.map