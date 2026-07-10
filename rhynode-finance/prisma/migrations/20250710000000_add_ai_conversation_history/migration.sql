-- Create ai_conversations table
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- Create ai_messages table
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- Add foreign key with cascade delete
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX "ai_conversations_user_id_idx" ON "ai_conversations"("user_id");
CREATE INDEX "ai_conversations_organization_id_idx" ON "ai_conversations"("organization_id");
CREATE INDEX "ai_messages_conversation_id_idx" ON "ai_messages"("conversation_id");
CREATE INDEX "ai_messages_role_idx" ON "ai_messages"("role");
CREATE INDEX "ai_messages_created_at_idx" ON "ai_messages"("created_at");
