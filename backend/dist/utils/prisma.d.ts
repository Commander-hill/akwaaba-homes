import 'dotenv/config';
/**
 * Hardened Prisma client:
 * 1. Enforces an upper bound (500 rows) on findMany queries to prevent unbounded OOM / DoS reads.
 * 2. Logs slow database queries exceeding 2,000ms for operational visibility.
 */
declare const prisma: import("@prisma/client/runtime/library").DynamicClientExtensionThis<import(".prisma/client").Prisma.TypeMap<import("@prisma/client/runtime/library").InternalArgs & {
    result: {};
    model: {};
    query: {};
    client: {};
}, import(".prisma/client").Prisma.PrismaClientOptions>, import(".prisma/client").Prisma.TypeMapCb, {
    result: {};
    model: {};
    query: {};
    client: {};
}, {}>;
export default prisma;
//# sourceMappingURL=prisma.d.ts.map