/*
  Warnings:

  - A unique constraint covering the columns `[razorpayOrderId]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[razorpayPaymentId]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `orders` ADD COLUMN `razorpayOrderId` VARCHAR(191) NULL,
    ADD COLUMN `razorpayPaymentId` VARCHAR(191) NULL,
    MODIFY `status` ENUM('PENDING_PAYMENT', 'NEW', 'PREPARING', 'READY', 'SERVED', 'CANCELLED') NOT NULL DEFAULT 'NEW';

-- CreateIndex
CREATE UNIQUE INDEX `orders_razorpayOrderId_key` ON `orders`(`razorpayOrderId`);

-- CreateIndex
CREATE UNIQUE INDEX `orders_razorpayPaymentId_key` ON `orders`(`razorpayPaymentId`);
