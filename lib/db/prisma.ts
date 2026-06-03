import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

let prisma: PrismaClient;

if (connectionString) {
  try {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
    console.log('Prisma Client connected to PostgreSQL');
  } catch (error) {
    console.warn(`Failed to connect to PostgreSQL, using fallback mode: ${error}`);
    prisma = new PrismaClient();
  }
} else {
  console.warn('DATABASE_URL is not set. Using fallback mode.');
  prisma = new PrismaClient();
}

export default prisma;
export { prisma };