/*
  Warnings:

  - You are about to drop the column `plan` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCurrentPeriodEnd` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `stripePriceId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubscriptionId` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "BillingVendor" AS ENUM ('STRIPE');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED');

-- DropIndex
DROP INDEX "User_stripeCustomerId_key";

-- DropIndex
DROP INDEX "User_stripeSubscriptionId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "plan",
DROP COLUMN "stripeCurrentPeriodEnd",
DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripePriceId",
DROP COLUMN "stripeSubscriptionId";

-- DropEnum
DROP TYPE "Plan";

-- CreateTable
CREATE TABLE "SubscriptionPeriod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'PAID',
    "vendor" "BillingVendor",
    "vendorCustomerId" TEXT,
    "vendorSubscriptionId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "stripePriceId" TEXT,
    "interval" "BillingInterval" NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPeriod_stripeCheckoutSessionId_key" ON "SubscriptionPeriod"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "SubscriptionPeriod_userId_status_periodEnd_idx" ON "SubscriptionPeriod"("userId", "status", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPeriod_vendor_vendorSubscriptionId_periodEnd_key" ON "SubscriptionPeriod"("vendor", "vendorSubscriptionId", "periodEnd");

-- AddForeignKey
ALTER TABLE "SubscriptionPeriod" ADD CONSTRAINT "SubscriptionPeriod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
