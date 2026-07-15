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

-- AddForeignKey
ALTER TABLE `member_consent` ADD CONSTRAINT `member_consent_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `member`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill the latest sensitive-information state for existing members.
INSERT INTO `member_consent` (
    `user_id`,
    `consent_type`,
    `agreed`,
    `policy_version`,
    `agreed_at`,
    `withdrawn_at`
)
SELECT
    `id`,
    'SENSITIVE',
    CASE WHEN `sens_info` = 'Y' THEN TRUE ELSE FALSE END,
    'legacy',
    CASE WHEN `sens_info` = 'Y' THEN `reg_date` ELSE NULL END,
    NULL
FROM `member`;
