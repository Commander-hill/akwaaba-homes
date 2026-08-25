import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default accounts...');
  
  const adminEmail = (process.env.ADMIN_EMAIL || 'israelboateng5@gmail.com').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Israel@40';
  const hashedPasswordAdmin = await bcrypt.hash(adminPassword, 10);

  // Upsert Admin account
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: hashedPasswordAdmin,
      isEmailVerified: true,
      role: 'ADMIN'
    },
    create: {
      email: adminEmail,
      passwordHash: hashedPasswordAdmin,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      isEmailVerified: true
    }
  });

  console.log(`✅ Admin account ready! Email: ${adminEmail} | Password: ${adminPassword}`);

  // Upsert Demo Landlord account (carefreechelsea5@gmail.com)
  const userEmail = 'carefreechelsea5@gmail.com';
  const userPassword = 'Password123!';
  const hashedPasswordUser = await bcrypt.hash(userPassword, 10);

  await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      passwordHash: hashedPasswordUser,
      isEmailVerified: true,
    },
    create: {
      email: userEmail,
      passwordHash: hashedPasswordUser,
      firstName: 'Carefree',
      lastName: 'Chelsea',
      role: 'LANDLORD',
      isEmailVerified: true
    }
  });

  console.log(`✅ Landlord account ready! Email: ${userEmail} | Password: ${userPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
