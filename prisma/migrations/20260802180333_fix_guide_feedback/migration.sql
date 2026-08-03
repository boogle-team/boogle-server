/*
  Warnings:

  - A unique constraint covering the columns `[user_id,guide_id,week_start_date]` on the table `guide_feedback` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `week_start_date` to the `guide_feedback` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `guide_feedback` DROP FOREIGN KEY `guide_feedback_user_id_fkey`;

-- DropIndex
DROP INDEX `guide_feedback_index_5` ON `guide_feedback`;

-- AlterTable
ALTER TABLE `guide_feedback` ADD COLUMN `week_start_date` DATE NOT NULL;

-- CreateIndex
CREATE INDEX `guide_feedback_user_week_idx` ON `guide_feedback`(`user_id`, `week_start_date`);

-- CreateIndex
CREATE UNIQUE INDEX `guide_feedback_user_guide_week_uq` ON `guide_feedback`(`user_id`, `guide_id`, `week_start_date`);

-- AddForeignKey
ALTER TABLE `boogle_record` ADD CONSTRAINT `boogle_record_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `member`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
