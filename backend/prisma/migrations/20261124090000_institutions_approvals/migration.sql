CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User"
    ADD COLUMN "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    ADD COLUMN "institutionId" TEXT;

ALTER TABLE "Device" ADD COLUMN "institutionId" TEXT;
ALTER TABLE "Report" ADD COLUMN "institutionId" TEXT;

CREATE UNIQUE INDEX "Institution_normalizedName_key" ON "Institution"("normalizedName");
CREATE INDEX "User_institutionId_role_approvalStatus_idx" ON "User"("institutionId", "role", "approvalStatus");
CREATE INDEX "Device_institutionId_updatedAt_idx" ON "Device"("institutionId", "updatedAt" DESC);
CREATE INDEX "Report_institutionId_createdAt_idx" ON "Report"("institutionId", "createdAt" DESC);

ALTER TABLE "User" ADD CONSTRAINT "User_institutionId_fkey"
    FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Device" ADD CONSTRAINT "Device_institutionId_fkey"
    FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_institutionId_fkey"
    FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
