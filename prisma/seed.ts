import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL as string),
});

const FOOD_NAMES = [
  '자극적인 음식',
  '기름진 음식',
  '카페인',
  '유제품',
  '식이섬유 충분',
];

async function main() {
  for (const name of FOOD_NAMES) {
    await prisma.food.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }

  await prisma.member.upsert({
    where: { id: 1 },
    create: {
      id: 1,
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
