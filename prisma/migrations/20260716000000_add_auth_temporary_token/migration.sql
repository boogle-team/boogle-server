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
