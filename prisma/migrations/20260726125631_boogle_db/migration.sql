-- CreateTable
CREATE TABLE `member` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `login_id` VARCHAR(20) NULL,
    `password` VARCHAR(255) NULL,
    `nickname` VARCHAR(10) NULL,
    `profile_img` VARCHAR(255) NULL,
    `profile_image_key` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `name` VARCHAR(20) NULL,
    `gender` CHAR(1) NULL,
    `age` INTEGER NULL,
    `age_group` TINYINT NULL,
    `baseline_type` CHAR(1) NULL,
    `birth` VARCHAR(20) NULL,
    `sens_info` CHAR(1) NOT NULL DEFAULT 'F',
    `reg_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` CHAR(1) NOT NULL DEFAULT 'A',
    `delete_date` DATETIME(3) NULL,
    `subscription` CHAR(1) NOT NULL DEFAULT 'N',
    `subscription_date` DATETIME(3) NULL,
    `record_alarm` CHAR(1) NULL DEFAULT 'Y',
    `report_alarm` CHAR(1) NULL DEFAULT 'Y',
    `warn_alarm` CHAR(1) NULL DEFAULT 'Y',

    UNIQUE INDEX `member_login_id_key`(`login_id`),
    UNIQUE INDEX `member_nickname_key`(`nickname`),
    UNIQUE INDEX `member_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alarm` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category` CHAR(1) NOT NULL,
    `title` VARCHAR(40) NOT NULL,
    `content` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alarm_map` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NULL,
    `alarm_id` INTEGER NULL,
    `reg_date` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_read` CHAR(1) NULL DEFAULT 'N',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_account` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `provider` CHAR(1) NOT NULL,
    `provider_id` VARCHAR(255) NOT NULL,
    `email` VARCHAR(40) NULL,
    `reg_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `social_account_index_0`(`provider`, `provider_id`),
    UNIQUE INDEX `social_account_index_1`(`user_id`, `provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_token` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `token_hash` VARCHAR(64) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `reg_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_token_token_hash_key`(`token_hash`),
    INDEX `refresh_token_user_id_idx`(`user_id`),
    INDEX `refresh_token_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `member_consent` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `consent_type` VARCHAR(20) NOT NULL,
    `agreed` BOOLEAN NOT NULL DEFAULT false,
    `policy_version` VARCHAR(20) NOT NULL,
    `agreed_at` DATETIME(3) NULL,
    `withdrawn_at` DATETIME(3) NULL,
    `reg_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `member_consent_user_type_id_idx`(`user_id`, `consent_type`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_temporary_token` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `token_hash` VARCHAR(64) NOT NULL,
    `token_type` VARCHAR(20) NOT NULL,
    `payload` JSON NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `reg_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `auth_temporary_token_token_hash_key`(`token_hash`),
    INDEX `auth_temporary_token_type_expires_idx`(`token_type`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `boogle_record` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `reg_date` DATETIME(3) NOT NULL,
    `has_bowel` BOOLEAN NOT NULL DEFAULT false,
    `stool_bristol` TINYINT NULL,
    `stool_simple` CHAR(1) NULL,
    `bowel_feeling` CHAR(1) NULL,
    `stomach` CHAR(1) NULL,
    `distension` CHAR(1) NULL,
    `remaining_feeling` CHAR(1) NULL,
    `urgency` CHAR(1) NULL,
    `taken_time` TINYINT NULL,
    `amount` CHAR(1) NULL,
    `color` CHAR(1) NULL,
    `status` CHAR(1) NOT NULL DEFAULT 'A',
    `update_date` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `life_record` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `reg_date` DATETIME(3) NOT NULL,
    `sleep` CHAR(1) NULL,
    `stress` CHAR(1) NULL,
    `water` CHAR(1) NULL,
    `water_intake` TINYINT NULL,
    `meal_regular` CHAR(1) NULL,
    `memo` VARCHAR(255) NULL,
    `auto_tags` VARCHAR(255) NULL,
    `sleep_time` TINYINT NULL,
    `exercise` CHAR(1) NULL,
    `caffeine` CHAR(1) NULL,
    `outing` CHAR(1) NULL,
    `hormone` CHAR(1) NULL,
    `status` CHAR(1) NOT NULL DEFAULT 'A',
    `update_time` DATETIME(3) NULL,

    UNIQUE INDEX `life_record_index_2`(`user_id`, `reg_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `medicine` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(20) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `medicine_map` (
    `medicine_id` INTEGER NOT NULL,
    `life_record_id` BIGINT NOT NULL,

    PRIMARY KEY (`medicine_id`, `life_record_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `life_tags` (
    `tag_id` BIGINT NOT NULL,
    `life_id` BIGINT NOT NULL,

    PRIMARY KEY (`tag_id`, `life_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tags` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(40) NOT NULL,

    UNIQUE INDEX `tags_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `weekly_record` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `reg_date` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `user_id` BIGINT NULL,
    `week_start_date` DATE NOT NULL,
    `bowel_count` INTEGER NULL,
    `interval_avg` INTEGER NULL,
    `completion_score` DOUBLE NULL,

    UNIQUE INDEX `weekly_record_index_3`(`user_id`, `week_start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monthly_record` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `reg_date` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `user_id` BIGINT NULL,
    `month_start_date` DATE NOT NULL,
    `bowel_count` INTEGER NULL,
    `interval_avg` INTEGER NULL,
    `state` INTEGER NULL,
    `completion_score` DOUBLE NULL,
    `condition_score` INTEGER NULL,
    `user_type` CHAR(1) NULL,

    UNIQUE INDEX `monthly_record_index_4`(`user_id`, `month_start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monthly_rule_result` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `month_start_date` DATE NOT NULL,
    `rule_code` VARCHAR(40) NOT NULL,
    `value` DOUBLE NOT NULL,
    `reg_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_date` DATETIME(3) NOT NULL,

    UNIQUE INDEX `monthly_rule_result_user_month_rule_uq`(`user_id`, `month_start_date`, `rule_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `life_food_tag` (
    `life_id` BIGINT NOT NULL,
    `food_id` INTEGER NOT NULL,

    PRIMARY KEY (`life_id`, `food_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `food` (
    `id` INTEGER NOT NULL,
    `name` VARCHAR(20) NOT NULL,

    UNIQUE INDEX `food_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `guide` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `summary` VARCHAR(255) NOT NULL,
    `category` CHAR(1) NOT NULL,
    `regDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_date` DATETIME(3) NULL,
    `status` CHAR(1) NOT NULL DEFAULT 'A',

    UNIQUE INDEX `guide_category_title_uq`(`category`, `title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `guide_content` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `guide_id` INTEGER NOT NULL,
    `subtitle` VARCHAR(255) NULL,
    `content` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `guide_advice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `guide_id` INTEGER NOT NULL,
    `content` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `guide_feedback` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `guide_id` INTEGER NOT NULL,
    `feedback` CHAR(1) NOT NULL,
    `reg_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_date` DATETIME(3) NULL,

    UNIQUE INDEX `guide_feedback_index_5`(`user_id`, `guide_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `alarm_map` ADD CONSTRAINT `alarm_map_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `member`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alarm_map` ADD CONSTRAINT `alarm_map_alarm_id_fkey` FOREIGN KEY (`alarm_id`) REFERENCES `alarm`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `social_account` ADD CONSTRAINT `social_account_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `member`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_token` ADD CONSTRAINT `refresh_token_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `member`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_consent` ADD CONSTRAINT `member_consent_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `member`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `boogle_record` ADD CONSTRAINT `boogle_record_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `member`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `life_record` ADD CONSTRAINT `life_record_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `member`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medicine_map` ADD CONSTRAINT `medicine_map_medicine_id_fkey` FOREIGN KEY (`medicine_id`) REFERENCES `medicine`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medicine_map` ADD CONSTRAINT `medicine_map_life_record_id_fkey` FOREIGN KEY (`life_record_id`) REFERENCES `life_record`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `life_tags` ADD CONSTRAINT `life_tags_tag_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `life_tags` ADD CONSTRAINT `life_tags_life_id_fkey` FOREIGN KEY (`life_id`) REFERENCES `life_record`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weekly_record` ADD CONSTRAINT `weekly_record_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `member`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monthly_record` ADD CONSTRAINT `monthly_record_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `member`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monthly_rule_result` ADD CONSTRAINT `monthly_rule_result_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `member`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `life_food_tag` ADD CONSTRAINT `life_food_tag_life_id_fkey` FOREIGN KEY (`life_id`) REFERENCES `life_record`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `life_food_tag` ADD CONSTRAINT `life_food_tag_food_id_fkey` FOREIGN KEY (`food_id`) REFERENCES `food`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `guide_content` ADD CONSTRAINT `guide_content_guide_id_fkey` FOREIGN KEY (`guide_id`) REFERENCES `guide`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `guide_advice` ADD CONSTRAINT `guide_advice_guide_id_fkey` FOREIGN KEY (`guide_id`) REFERENCES `guide`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `guide_feedback` ADD CONSTRAINT `guide_feedback_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `member`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `guide_feedback` ADD CONSTRAINT `guide_feedback_guide_id_fkey` FOREIGN KEY (`guide_id`) REFERENCES `guide`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `boogle_record`
  ADD CONSTRAINT `chk_has_bowel_stool_bristol`
  CHECK (
    (`has_bowel` = 0 AND `stool_bristol` IS NULL)
    OR
    (`has_bowel` = 1 AND `stool_bristol` BETWEEN 1 AND 7)
 );