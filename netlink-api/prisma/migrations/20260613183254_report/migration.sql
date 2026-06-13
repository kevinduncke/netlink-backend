/*
  Warnings:

  - You are about to drop the column `commentId` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `messageId` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `postId` on the `Report` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_commentId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_messageId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_postId_fkey";

-- AlterTable
ALTER TABLE "Report" DROP COLUMN "commentId",
DROP COLUMN "messageId",
DROP COLUMN "postId",
ADD COLUMN     "referenceId" TEXT;
