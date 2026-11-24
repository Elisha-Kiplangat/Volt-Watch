import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from './auth.types';

export function institutionScope(user?: Pick<AuthenticatedUser, 'role' | 'institutionId'>) {
  if (!user || user.role === UserRole.SUPER_ADMIN) return undefined;
  return user.institutionId ?? '__no_institution__';
}
