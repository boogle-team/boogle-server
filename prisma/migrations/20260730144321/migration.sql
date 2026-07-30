/*
  Warnings:

  - You are about to alter the column `stomach` on the `boogle_record` table. The data in that column could be lost. The data in that column will be cast from `Char(1)` to `Int`.

*/
-- AlterTable
ALTER TABLE `boogle_record` ADD COLUMN `bowel_movement_at` DATETIME(3) NULL,
    MODIFY `stomach` INTEGER NULL;
