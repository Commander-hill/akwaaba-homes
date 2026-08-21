"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    // Wipe everything to avoid foreign key issues
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.review.deleteMany();
    await prisma.leaseAgreement.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.maintenanceTicket.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.session.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.roommateProfile.deleteMany();
    await prisma.property.deleteMany();
    const result = await prisma.user.deleteMany({
        where: {
            role: {
                not: 'ADMIN'
            }
        }
    });
    console.log(`Successfully deleted ${result.count} non-admin users and all their associated data.`);
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=delete_users.js.map