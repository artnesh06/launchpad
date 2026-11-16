-- CreateIndex
CREATE INDEX "activities_chainId_type_createdAt_idx" ON "activities"("chainId", "type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "activities_createdAt_idx" ON "activities"("createdAt" DESC);
