import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const directUrl = process.env.DIRECT_URL?.trim();
const prisma = directUrl
  ? new PrismaClient({ datasources: { db: { url: directUrl } } })
  : new PrismaClient();

async function main() {
  if (process.env.DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production') {
    const device = await prisma.device.upsert({
      where: { deviceId: 'ESP32-SIM-001' },
      update: {},
      create: {
        deviceId: 'ESP32-SIM-001',
        name: 'Development simulator',
        description: 'Development-only simulated telemetry. No physical protection controller is connected.',
        location: 'Development environment',
        deviceType: 'SIMULATOR',
        connectivityStatus: 'OFFLINE',
        protectionState: 'UNKNOWN',
      },
    });
    await prisma.deviceConfiguration.upsert({
      where: { deviceId: device.id },
      update: {},
      create: { deviceId: device.id },
    });

    const existing = await prisma.sensorReading.count({ where: { deviceId: device.id, source: 'SIMULATED' } });
    if (existing === 0) {
      const now = Date.now();
      await prisma.sensorReading.createMany({
        data: Array.from({ length: 48 }, (_, index) => ({
          deviceId: device.id,
          voltage: Number((239 + Math.sin(index / 4) * 2.4 + Math.cos(index / 7) * 1.1).toFixed(3)),
          current: Number((1.1 + Math.sin(index / 6) * 0.18).toFixed(3)),
          frequency: Number((50 + Math.sin(index / 9) * 0.04).toFixed(3)),
          source: 'SIMULATED' as const,
          recordedAt: new Date(now - (47 - index) * 60_000),
        })),
      });
    }
  }

  const users = [
    { role: UserRole.SUPER_ADMIN, prefix: 'SEED_SUPER_ADMIN', legacyPrefix: 'INITIAL_ADMIN', defaultName: 'System Administrator' },
    { role: UserRole.ADMIN, prefix: 'SEED_ADMIN', defaultName: 'System Administrator' },
    { role: UserRole.OPERATOR, prefix: 'SEED_OPERATOR', defaultName: 'System Operator' },
  ];
  const seededEmails = new Set<string>();

  for (const user of users) {
    const emailKey = `${user.prefix}_EMAIL`;
    const passwordKey = `${user.prefix}_PASSWORD`;
    const nameKey = `${user.prefix}_NAME`;
    const legacyEmail = user.legacyPrefix ? process.env[`${user.legacyPrefix}_EMAIL`] : undefined;
    const legacyPassword = user.legacyPrefix ? process.env[`${user.legacyPrefix}_PASSWORD`] : undefined;
    const email = process.env[emailKey]?.trim().toLowerCase() || legacyEmail?.trim().toLowerCase();
    const password = process.env[passwordKey] || legacyPassword;

    if (email === undefined && password === undefined) continue;
    if (!email || !password) throw new Error(`${emailKey} and ${passwordKey} must both be set.`);
    if (password.length < 12 || password.length > 72) throw new Error(`${passwordKey} must be 12-72 characters.`);
    if (seededEmails.has(email)) throw new Error(`Seed user email ${email} is configured for more than one role.`);
    seededEmails.add(email);

    const institutionName = user.role === UserRole.SUPER_ADMIN
      ? undefined
      : process.env[`${user.prefix}_INSTITUTION`]?.trim() || 'Example Institution';
    const normalizedName = institutionName?.toLowerCase();
    let institution = normalizedName
      ? await prisma.institution.findUnique({ where: { normalizedName } })
      : null;
    if (institutionName && !institution) {
      institution = await prisma.institution.create({ data: { name: institutionName, normalizedName: institutionName.toLowerCase() } });
    }

    const existingUser = await prisma.user.findUnique({ where: { email }, select: { role: true, institutionId: true } });
    if (existingUser && existingUser.role !== user.role) {
      throw new Error(`${emailKey} belongs to an existing user with a different role.`);
    }

    await prisma.user.upsert({
      where: { email },
      update: existingUser?.institutionId || !institution ? {} : { institutionId: institution.id },
      create: {
        fullName: process.env[nameKey]?.trim() || (user.legacyPrefix ? process.env[`${user.legacyPrefix}_NAME`]?.trim() : undefined) || user.defaultName,
        email,
        password: await bcrypt.hash(password, 12),
        role: user.role,
        approvalStatus: 'APPROVED',
        institutionId: institution?.id,
      },
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());