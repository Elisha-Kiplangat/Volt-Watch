CREATE TYPE "ReportType" AS ENUM ('ELECTRICAL_MONITORING', 'VOLTAGE_ANOMALY', 'SURGE_EVENT', 'PROTECTION_TRIP', 'DEVICE_PERFORMANCE', 'ALERT_SUMMARY');

CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "deviceId" TEXT,
    "requestedById" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Report_reportType_createdAt_idx" ON "Report"("reportType", "createdAt" DESC);
CREATE INDEX "Report_deviceId_periodFrom_periodTo_idx" ON "Report"("deviceId", "periodFrom", "periodTo");
CREATE INDEX "Report_requestedById_createdAt_idx" ON "Report"("requestedById", "createdAt" DESC);

ALTER TABLE "Report" ADD CONSTRAINT "Report_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;