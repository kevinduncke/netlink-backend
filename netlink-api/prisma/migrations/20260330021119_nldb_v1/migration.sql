-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "disableComments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hideLikes" BOOLEAN NOT NULL DEFAULT false;
