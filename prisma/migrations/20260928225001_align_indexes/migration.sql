-- DropIndex
DROP INDEX "Collection_userId_idx";

-- DropIndex
DROP INDEX "Item_userId_createdAt_idx";

-- DropIndex
DROP INDEX "ItemType_userId_idx";

-- DropIndex
DROP INDEX "Tag_userId_idx";

-- CreateIndex
CREATE INDEX "Item_userId_updatedAt_idx" ON "Item"("userId", "updatedAt");
