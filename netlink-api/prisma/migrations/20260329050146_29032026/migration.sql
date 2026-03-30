-- CreateEnum
CREATE TYPE "PostVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'ONLY_ME', 'SPECIFIC');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "location" TEXT,
ADD COLUMN     "visibility" "PostVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "_SpecificVisibility" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SpecificVisibility_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_SpecificVisibility_B_index" ON "_SpecificVisibility"("B");

-- AddForeignKey
ALTER TABLE "_SpecificVisibility" ADD CONSTRAINT "_SpecificVisibility_A_fkey" FOREIGN KEY ("A") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SpecificVisibility" ADD CONSTRAINT "_SpecificVisibility_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
