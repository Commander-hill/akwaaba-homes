"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding default Admin account...');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@akwaabahomes.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AkwaabaAdmin2026!';
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail }
    });
    if (existingAdmin) {
        console.log(`Admin account (${adminEmail}) already exists. Skipping.`);
        return;
    }
    // Create admin
    const hashedPassword = await bcrypt_1.default.hash(adminPassword, 10);
    await prisma.user.create({
        data: {
            email: adminEmail,
            passwordHash: hashedPassword,
            firstName: 'System',
            lastName: 'Administrator',
            role: 'ADMIN',
            isEmailVerified: true
        }
    });
    console.log(`✅ Admin account created successfully!`);
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`⚠️ Please change this password immediately after logging in.`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map