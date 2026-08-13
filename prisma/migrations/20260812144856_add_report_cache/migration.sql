/*
  Warnings:

  - Added the required column `calculated_through_date` to the `monthly_record` table without a default value. This is not possible if the table is not empty.
  - Added the required column `update_date` to the `monthly_record` table without a default value. This is not possible if the table is not empty.
  - Made the column `user_id` on table `monthly_record` required. This step will fail if there are existing NULL values in that column.
  - Made the column `bowel_count` on table `monthly_record` required. This step will fail if there are existing NULL values in that column.
  - Made the column `interval_avg` on table `monthly_record` required. This step will fail if there are existing NULL values in that column.
  - Made the column `state` on table `monthly_record` required. This step will fail if there are existing NULL values in that column.
  - Made the column `completion_score` on table `monthly_record` required. This step will fail if there are existing NULL values in that column.
  - Made the column `condition_score` on table `monthly_record` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user_type` on table `monthly_record` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `calculated_through_date` to the `weekly_record` table without a default value. This is not possible if the table is not empty.
  - Added the required column `update_date` to the `weekly_record` table without a default value. This is not possible if the table is not empty.
  - Made the column `user_id` on table `weekly_record` required. This step will fail if there are existing NULL values in that column.
  - Made the column `bowel_count` on table `weekly_record` required. This step will fail if there are existing NULL values in that column.
  - Made the column `interval_avg` on table `weekly_record` required. This step will fail if there are existing NULL values in that column.
  - Made the column `completion_score` on table `weekly_record` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `monthly_record` DROP FOREIGN KEY `monthly_record_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `weekly_record` DROP FOREIGN KEY `weekly_record_user_id_fkey`;

-- AlterTable
ALTER TABLE `monthly_record` ADD COLUMN `bowel_days` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `calculated_through_date` DATE NOT NULL,
    ADD COLUMN `is_finalized` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `recorded_days` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `rhythm_score` DOUBLE NOT NULL DEFAULT 50,
    ADD COLUMN `state_score` DOUBLE NOT NULL DEFAULT 50,
    ADD COLUMN `update_date` DATETIME(3) NOT NULL,
    MODIFY `user_id` BIGINT NOT NULL,
    MODIFY `bowel_count` INTEGER NOT NULL DEFAULT 0,
    MODIFY `interval_avg` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `state` INTEGER NOT NULL DEFAULT 3,
    MODIFY `completion_score` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `condition_score` INTEGER NOT NULL DEFAULT 0,
    MODIFY `user_type` CHAR(1) NOT NULL DEFAULT 'N';

-- AlterTable
ALTER TABLE `weekly_record` ADD COLUMN `calculated_through_date` DATE NOT NULL,
    ADD COLUMN `is_finalized` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `recorded_days` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `update_date` DATETIME(3) NOT NULL,
    MODIFY `user_id` BIGINT NOT NULL,
    MODIFY `bowel_count` INTEGER NOT NULL DEFAULT 0,
    MODIFY `interval_avg` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `completion_score` DOUBLE NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE `weekly_record` ADD CONSTRAINT `weekly_record_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `member`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monthly_record` ADD CONSTRAINT `monthly_record_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `member`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
