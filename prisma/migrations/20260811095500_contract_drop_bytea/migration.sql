-- AlterTable
ALTER TABLE "Image" DROP COLUMN "data",
ALTER COLUMN "storageKey" SET NOT NULL;

