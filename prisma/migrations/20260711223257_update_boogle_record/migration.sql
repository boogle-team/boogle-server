/*
  Legacy cleanup for databases created before the consolidated initial
  migration. Fresh databases already have the target boogle_record shape.
*/

SET @drop_boogle_record_memo = (
    SELECT IF(
        EXISTS(
            SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'boogle_record'
              AND COLUMN_NAME = 'memo'
        ),
        'ALTER TABLE `boogle_record` DROP COLUMN `memo`',
        'SELECT 1'
    )
);
PREPARE drop_boogle_record_memo_stmt FROM @drop_boogle_record_memo;
EXECUTE drop_boogle_record_memo_stmt;
DEALLOCATE PREPARE drop_boogle_record_memo_stmt;

SET @drop_boogle_record_auto_tags = (
    SELECT IF(
        EXISTS(
            SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'boogle_record'
              AND COLUMN_NAME = 'auto_tags'
        ),
        'ALTER TABLE `boogle_record` DROP COLUMN `auto_tags`',
        'SELECT 1'
    )
);
PREPARE drop_boogle_record_auto_tags_stmt FROM @drop_boogle_record_auto_tags;
EXECUTE drop_boogle_record_auto_tags_stmt;
DEALLOCATE PREPARE drop_boogle_record_auto_tags_stmt;

DROP TABLE IF EXISTS `boogle_tags`;
