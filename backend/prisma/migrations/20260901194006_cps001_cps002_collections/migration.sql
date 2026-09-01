/*
  Warnings:

  - You are about to drop the column `amount` on the `Collection` table. All the data in the column will be lost.
  - You are about to drop the column `collectedById` on the `Collection` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `Collection` table. All the data in the column will be lost.
  - Added the required column `memberId` to the `Collection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentAmount` to the `Collection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentDate` to the `Collection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentMethod` to the `Collection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentReference` to the `Collection` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'GCASH', 'BANK_TRANSFER', 'CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "Collection" DROP CONSTRAINT "Collection_collectedById_fkey";

-- AlterTable
ALTER TABLE "Collection" DROP COLUMN "amount",
DROP COLUMN "collectedById",
DROP COLUMN "date",
ADD COLUMN     "memberId" TEXT NOT NULL,
ADD COLUMN     "paymentAmount" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "paymentDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL,
ADD COLUMN     "paymentReference" TEXT NOT NULL,
ADD COLUMN     "proofOfPaymentName" TEXT,
ADD COLUMN     "proofOfPaymentPath" TEXT,
ADD COLUMN     "status" "CollectionStatus" NOT NULL DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
