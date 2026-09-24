/*
  Warnings:

  - Added the required column `color` to the `ItemType` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ItemType" ADD COLUMN     "color" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Collection_userId_isFavorite_idx" ON "Collection"("userId", "isFavorite");
