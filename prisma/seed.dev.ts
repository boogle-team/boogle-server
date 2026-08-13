import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';
import { seedReferenceData } from './seed-data';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run the seed script');
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(databaseUrl),
});

async function main() {
  await seedReferenceData(prisma);

  await prisma.member.upsert({
    where: { id: 1n },
    create: {
      id: 1n,
      loginId: 'test_user',
      password: 'test_password',
      nickname: '테스트유저',
      email: 'test@boogle.dev',
      name: '테스트',
      sensInfo: 'N',
      status: 'A',
      subscription: 'N',
    },
    update: {},
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
