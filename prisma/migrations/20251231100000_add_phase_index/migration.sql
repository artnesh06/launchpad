-- AlterTable: Add phaseIndex column to launchpad_phases
-- First add as nullable to handle existing data
ALTER TABLE "launchpad_phases" ADD COLUMN "phaseIndex" INTEGER;

-- Update existing phases with phaseIndex based on createdAt order
WITH ranked_phases AS (
  SELECT 
    id,
    "launchpadId",
    ROW_NUMBER() OVER (PARTITION BY "launchpadId" ORDER BY "createdAt" ASC) - 1 as new_index
  FROM "launchpad_phases"
)
UPDATE "launchpad_phases" lp
SET "phaseIndex" = rp.new_index
FROM ranked_phases rp
WHERE lp.id = rp.id;

-- Make phaseIndex NOT NULL after populating data
ALTER TABLE "launchpad_phases" ALTER COLUMN "phaseIndex" SET NOT NULL;

-- Add unique constraint for launchpadId + phaseIndex
ALTER TABLE "launchpad_phases" ADD CONSTRAINT "launchpad_phases_launchpadId_phaseIndex_key" UNIQUE ("launchpadId", "phaseIndex");
