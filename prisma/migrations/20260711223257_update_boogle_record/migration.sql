/*
  Warnings:

  - You are about to drop the column `auto_tags` on the `boogle_record` table. All the data in the column will be lost.
  - You are about to drop the column `memo` on the `boogle_record` table. All the data in the column will be lost.
  - You are about to drop the `boogle_tags` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `boogle_tags` DROP FOREIGN KEY `boogle_tags_boogle_id_fkey`;

-- DropForeignKey
ALTER TABLE `boogle_tags` DROP FOREIGN KEY `boogle_tags_tag_id_fkey`;

-- AlterTable
ALTER TABLE `boogle_record` DROP COLUMN `auto_tags`,
    DROP COLUMN `memo`;

-- DropTable
DROP TABLE `boogle_tags`;
