import { PrismaClient } from '../src/generated/prisma/client';

export const FOODS = [
  { id: 1, name: '음주' },
  { id: 2, name: '야식' },
  { id: 3, name: '자극적인 음식' },
  { id: 4, name: '기름진 음식' },
  { id: 5, name: '유제품' },
  { id: 6, name: '채소·잡곡' },
];

export const MEDICINES = [
  { id: 1, name: '감기약' },
  { id: 2, name: '항생제' },
  { id: 3, name: '유산균' },
  { id: 4, name: '철분제' },
  { id: 5, name: '변비약' },
  { id: 6, name: '해당 없음' },
];

export async function seedReferenceData(prisma: PrismaClient) {
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
}
