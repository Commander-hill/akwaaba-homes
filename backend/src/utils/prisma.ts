import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: process.env.DATABASE_URL ? {
    db: {
      url: process.env.DATABASE_URL
    }
  } : undefined
});

export default prisma;
