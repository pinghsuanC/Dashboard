-- Ending access early moves periodEnd instead; nothing ever set this column.
ALTER TABLE "SubscriptionPeriod" DROP COLUMN "revokedAt";
