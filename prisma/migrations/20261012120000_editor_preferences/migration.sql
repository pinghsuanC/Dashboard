-- AlterTable
ALTER TABLE "User" DROP COLUMN "preferredFontSize",
DROP COLUMN "preferredTheme",
ADD COLUMN     "editorPreferences" JSONB NOT NULL DEFAULT '{}';
