-- CreateTable
CREATE TABLE "ChatHidden" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ChatHidden_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatHidden_userId_index" ON "ChatHidden"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatHidden_chatId_userId_key" ON "ChatHidden"("chatId", "userId");

-- AddForeignKey
ALTER TABLE "ChatHidden" ADD CONSTRAINT "ChatHidden_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatHidden" ADD CONSTRAINT "ChatHidden_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
