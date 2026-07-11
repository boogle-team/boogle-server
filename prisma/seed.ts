import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL as string),
});

const FOODS = [
  { id: 1, name: '자극적인 음식' },
  { id: 2, name: '기름진 음식' },
  { id: 3, name: '카페인' },
  { id: 4, name: '유제품' },
  { id: 5, name: '식이섬유 충분' },
];

const MEDICINES = [
  { id: 1, name: '감기약' },
  { id: 2, name: '항생제' },
  { id: 3, name: '유산균' },
  { id: 4, name: '철분제' },
  { id: 5, name: '변비약' },
  { id: 6, name: '기타' },
];

async function main() {
  for (const food of FOODS) {
    await prisma.food.upsert({
      where: { id: food.id },
      create: food,
      update: { name: food.name },
    });
  }

  for (const medicine of MEDICINES) {
    await prisma.medicine.upsert({
      where: { id: medicine.id },
      create: medicine,
      update: { name: medicine.name },
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
