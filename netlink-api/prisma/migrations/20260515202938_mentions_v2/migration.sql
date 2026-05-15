-- AlterTable
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Mention" ADD COLUMN     "fromUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
