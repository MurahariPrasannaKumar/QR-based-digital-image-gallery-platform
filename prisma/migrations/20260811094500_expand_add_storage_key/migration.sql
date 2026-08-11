-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "storageKey" TEXT,
ALTER COLUMN "data" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Image_storageKey_key" ON "Image"("storageKey");
