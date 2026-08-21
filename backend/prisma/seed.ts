import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

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
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      emailVerified: true,
      profileCompleted: true
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
