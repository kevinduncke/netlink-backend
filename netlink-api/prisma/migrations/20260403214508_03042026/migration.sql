-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "isShared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sharedFromId" TEXT;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_sharedFromId_fkey" FOREIGN KEY ("sharedFromId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
