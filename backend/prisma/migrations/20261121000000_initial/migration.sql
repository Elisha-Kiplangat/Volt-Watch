CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'OPERATOR');
CREATE TYPE "ConnectivityStatus" AS ENUM ('ONLINE', 'OFFLINE', 'UNKNOWN');
CREATE TYPE "ProtectionState" AS ENUM ('STARTING', 'NORMAL', 'WARNING_UNDERVOLTAGE', 'WARNING_OVERVOLTAGE', 'TRIPPED_UNDERVOLTAGE', 'TRIPPED_OVERVOLTAGE', 'TRIPPED_POWER_FAILURE', 'TRIPPED_TRANSIENT', 'RECOVERY_PENDING', 'UNKNOWN');
CREATE TYPE "EventType" AS ENUM ('UNDERVOLTAGE', 'OVERVOLTAGE', 'TRANSIENT_SURGE', 'POWER_FAILURE', 'PROTECTION_TRIP', 'PROTECTION_RECOVERY', 'DEVICE_CONNECTED', 'DEVICE_DISCONNECTED', 'SYSTEM_WARNING');
CREATE TYPE "Severity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');
CREATE TYPE "MeasurementSource" AS ENUM ('DEVICE', 'SIMULATED');
CREATE TYPE "ConfigurationDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'ACKNOWLEDGED', 'FAILED');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "deviceType" TEXT NOT NULL DEFAULT 'SURGE_PROTECTOR',
    "firmwareVersion" TEXT,
    "ipAddress" TEXT,
    "connectivityStatus" "ConnectivityStatus" NOT NULL DEFAULT 'UNKNOWN',
    "protectionState" "ProtectionState" NOT NULL DEFAULT 'UNKNOWN',
    "lastSeenAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SensorReading" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "voltage" DECIMAL(8,3) NOT NULL,
    "current" DECIMAL(8,3),
    "frequency" DECIMAL(7,3),
    "power" DECIMAL(10,3),
    "source" "MeasurementSource" NOT NULL DEFAULT 'DEVICE',
    "recordedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SensorReading_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SurgeEvent" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "deduplicationKey" TEXT,
    "deviceId" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "description" TEXT NOT NULL,
    "voltage" DECIMAL(8,3),
    "eventTimestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SurgeEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "eventId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "acknowledgedById" TEXT,
    "assignedToId" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProtectionLog" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "previousState" "ProtectionState" NOT NULL,
    "currentState" "ProtectionState" NOT NULL,
    "tripReason" TEXT,
    "voltage" DECIMAL(8,3),
    "contactorCommand" BOOLEAN,
    "contactorFeedback" BOOLEAN,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProtectionLog_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DeviceConfiguration" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "lowVoltageThreshold" DECIMAL(8,3) NOT NULL DEFAULT 210,
    "criticalLowVoltageThreshold" DECIMAL(8,3) NOT NULL DEFAULT 180,
    "highVoltageThreshold" DECIMAL(8,3) NOT NULL DEFAULT 250,
    "criticalHighVoltageThreshold" DECIMAL(8,3) NOT NULL DEFAULT 270,
    "recoveryStableDuration" INTEGER NOT NULL DEFAULT 30,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deliveryStatus" "ConfigurationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DeviceConfiguration_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_userId_expiresAt_idx" ON "RefreshToken"("userId", "expiresAt");
CREATE UNIQUE INDEX "Device_deviceId_key" ON "Device"("deviceId");
CREATE INDEX "Device_connectivityStatus_isActive_idx" ON "Device"("connectivityStatus", "isActive");
CREATE INDEX "Device_protectionState_idx" ON "Device"("protectionState");
CREATE INDEX "Device_lastSeenAt_idx" ON "Device"("lastSeenAt");
CREATE INDEX "SensorReading_deviceId_recordedAt_idx" ON "SensorReading"("deviceId", "recordedAt" DESC);
CREATE INDEX "SensorReading_recordedAt_idx" ON "SensorReading"("recordedAt");
CREATE UNIQUE INDEX "SurgeEvent_deviceId_externalId_key" ON "SurgeEvent"("deviceId", "externalId");
CREATE UNIQUE INDEX "SurgeEvent_deviceId_deduplicationKey_key" ON "SurgeEvent"("deviceId", "deduplicationKey");
CREATE INDEX "SurgeEvent_eventTimestamp_idx" ON "SurgeEvent"("eventTimestamp" DESC);
CREATE INDEX "SurgeEvent_deviceId_eventType_eventTimestamp_idx" ON "SurgeEvent"("deviceId", "eventType", "eventTimestamp");
CREATE UNIQUE INDEX "Alert_eventId_key" ON "Alert"("eventId");
CREATE INDEX "Alert_status_severity_createdAt_idx" ON "Alert"("status", "severity", "createdAt" DESC);
CREATE INDEX "Alert_deviceId_status_idx" ON "Alert"("deviceId", "status");
CREATE INDEX "ProtectionLog_deviceId_recordedAt_idx" ON "ProtectionLog"("deviceId", "recordedAt" DESC);
CREATE UNIQUE INDEX "DeviceConfiguration_deviceId_key" ON "DeviceConfiguration"("deviceId");
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt" DESC);
CREATE INDEX "ActivityLog_entityType_entityId_createdAt_idx" ON "ActivityLog"("entityType", "entityId", "createdAt" DESC);
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt" DESC);

ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SensorReading" ADD CONSTRAINT "SensorReading_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SurgeEvent" ADD CONSTRAINT "SurgeEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SurgeEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProtectionLog" ADD CONSTRAINT "ProtectionLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeviceConfiguration" ADD CONSTRAINT "DeviceConfiguration_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;