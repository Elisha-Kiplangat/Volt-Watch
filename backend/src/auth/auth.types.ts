import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: UserRole;
  institutionId: string | null;
}

export const ROLES_KEY = 'roles';