"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient({
    datasources: process.env.DATABASE_URL ? {
        db: {
            url: process.env.DATABASE_URL
        }
    } : undefined
});
exports.default = prisma;
//# sourceMappingURL=prisma.js.map