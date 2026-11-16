-- CreateIndex for case-insensitive creator lookups
CREATE INDEX "launchpads_creator_lower_idx" ON "launchpads"(LOWER("creator"));
