const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.error('Usage: node make_admin.js <email>');
    console.error('   or: node make_admin.js <email> --create <firstName> <lastName> <password>');
    process.exit(1);
  }

  try {
    // Try to find existing user first
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      const user = await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN' }
      });
      console.log(`✅ Success! User ${user.email} has been promoted to ADMIN.`);
    } else if (process.argv[3] === '--create') {
      const firstName = process.argv[4] || 'Admin';
      const lastName  = process.argv[5] || 'User';
      const password  = process.argv[6] || 'Admin@12345';

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          passwordHash,
          role: 'ADMIN',
          isEmailVerified: true,
        }
      });
      console.log(`✅ Created new ADMIN account:`);
      console.log(`   Email:    ${user.email}`);
      console.log(`   Password: ${password}`);
      console.log(`   Login at: http://localhost:3000/admin/login`);
    } else {
      console.error(`❌ User with email "${email}" not found in the database.`);
      console.error('');
      console.error('To create a brand-new admin account, run:');
      console.error(`   node make_admin.js "${email}" --create FirstName LastName YourPassword`);
    }
  } catch (error) {
    console.error('❌ Error:', error.meta?.cause || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
