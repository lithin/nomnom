-- Align ChatSession/ChatMessage id and foreign-key columns with production,
-- where they are UUID. No-op on production (already uuid); converts text -> uuid
-- on fresh/dev databases. The foreign keys referencing ChatSession.id are
-- dropped before the type change and recreated afterwards.

-- DropForeignKey
ALTER TABLE "Recipe" DROP CONSTRAINT "Recipe_chatSessionId_fkey";
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_chatId_fkey";

-- AlterColumn types (text -> uuid; no-op where already uuid)
ALTER TABLE "ChatSession" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "ChatMessage" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "ChatMessage" ALTER COLUMN "chatId" TYPE UUID USING "chatId"::uuid;
ALTER TABLE "Recipe" ALTER COLUMN "chatSessionId" TYPE UUID USING "chatSessionId"::uuid;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "ChatSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
