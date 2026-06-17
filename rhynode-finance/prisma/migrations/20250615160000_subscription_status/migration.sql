-- AlterTable
ALTER TABLE "detected_subscriptions" ADD COLUMN "canceled_at" TIMESTAMP(3);
ALTER TABLE "detected_subscriptions" ADD COLUMN "cancellation_url" TEXT;

-- CreateIndex
CREATE INDEX "detected_subscriptions_user_id_status_idx" ON "detected_subscriptions"("user_id", "status");
