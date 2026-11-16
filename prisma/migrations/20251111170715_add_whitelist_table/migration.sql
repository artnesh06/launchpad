-- CreateTable
CREATE TABLE "launchpad_whitelists" (
    "id" TEXT NOT NULL,
    "launchpadId" TEXT NOT NULL,
    "phaseId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "allocation" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "launchpad_whitelists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "launchpad_whitelists_launchpadId_phaseId_idx" ON "launchpad_whitelists"("launchpadId", "phaseId");

-- CreateIndex
CREATE UNIQUE INDEX "launchpad_whitelists_launchpadId_phaseId_address_key" ON "launchpad_whitelists"("launchpadId", "phaseId", "address");

-- AddForeignKey
ALTER TABLE "launchpad_whitelists" ADD CONSTRAINT "launchpad_whitelists_launchpadId_fkey" FOREIGN KEY ("launchpadId") REFERENCES "launchpads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
