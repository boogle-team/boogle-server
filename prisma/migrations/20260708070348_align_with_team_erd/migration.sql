-- CreateTable
CREATE TABLE `member` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `login_id` VARCHAR(20) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `nickname` VARCHAR(40) NOT NULL,
    `profile_img` VARCHAR(255) NULL,
    `email` VARCHAR(255) NOT NULL,
    `name` VARCHAR(20) NOT NULL,
    `gender` VARCHAR(1) NULL,
    `age` INTEGER NULL,
    `age_group` TINYINT NULL,
    `baseline_type` VARCHAR(1) NULL,
    `birth` VARCHAR(20) NULL,
    `sens_info` VARCHAR(1) NOT NULL,
    `reg_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(1) NOT NULL,
    `delete_date` DATETIME(3) NULL,
    `subscription` VARCHAR(1) NOT NULL,
    `subscription_date` DATETIME(3) NULL,
    `record_alarm` VARCHAR(1) NULL,
    `report_alarm` VARCHAR(1) NULL,
    `warn_alarm` VARCHAR(1) NULL,

    UNIQUE INDEX `member_login_id_key`(`login_id`),
    UNIQUE INDEX `member_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `life_record` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `reg_date` DATETIME(3) NOT NULL,
    `sleep` VARCHAR(1) NULL,
    `stress` VARCHAR(1) NULL,
    `water` VARCHAR(1) NULL,
    `meal_regular` VARCHAR(1) NULL,
    `memo` VARCHAR(255) NULL,
    `auto_tags` VARCHAR(255) NULL,
    `sleep_time` TINYINT NULL,
    `exercise` VARCHAR(1) NULL,
    `caffeine` VARCHAR(1) NULL,
    `medicine` VARCHAR(1) NULL,
    `outing` VARCHAR(1) NULL,
    `hormone` VARCHAR(1) NULL,
    `status` VARCHAR(1) NOT NULL DEFAULT 'A',
    `update_time` DATETIME(3) NULL,

    UNIQUE INDEX `life_record_user_id_reg_date_key`(`user_id`, `reg_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tags` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(40) NOT NULL,

    UNIQUE INDEX `tags_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `life_tags` (
    `tag_id` BIGINT NOT NULL,
    `life_id` BIGINT NOT NULL,

    PRIMARY KEY (`tag_id`, `life_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `food` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(20) NOT NULL,

    UNIQUE INDEX `food_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `life_food_tag` (
    `life_id` BIGINT NOT NULL,
    `food_id` INTEGER NOT NULL,

    PRIMARY KEY (`life_id`, `food_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `life_record` ADD CONSTRAINT `life_record_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `member`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `life_tags` ADD CONSTRAINT `life_tags_tag_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `life_tags` ADD CONSTRAINT `life_tags_life_id_fkey` FOREIGN KEY (`life_id`) REFERENCES `life_record`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `life_food_tag` ADD CONSTRAINT `life_food_tag_life_id_fkey` FOREIGN KEY (`life_id`) REFERENCES `life_record`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `life_food_tag` ADD CONSTRAINT `life_food_tag_food_id_fkey` FOREIGN KEY (`food_id`) REFERENCES `food`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
