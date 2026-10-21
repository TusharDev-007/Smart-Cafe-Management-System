-- Add the column as nullable, backfill existing orders with secure random tokens, then lock it down
ALTER TABLE `orders` ADD COLUMN `publicToken` VARCHAR(191) NULL;
UPDATE `orders` SET `publicToken` = LOWER(HEX(RANDOM_BYTES(16)));
ALTER TABLE `orders` MODIFY `publicToken` VARCHAR(191) NOT NULL;
CREATE UNIQUE INDEX `orders_publicToken_key` ON `orders`(`publicToken`);