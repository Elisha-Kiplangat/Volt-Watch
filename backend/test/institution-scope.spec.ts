import assert from 'node:assert/strict';
import test from 'node:test';
import { UserRole } from '@prisma/client';
import { institutionScope } from '../src/auth/institution-scope';

test('institution-scoped access', async (t) => {
  await t.test('limits admins and operators to their assigned institution', () => {
    assert.equal(institutionScope({ role: UserRole.ADMIN, institutionId: 'institution-a' }), 'institution-a');
    assert.equal(institutionScope({ role: UserRole.OPERATOR, institutionId: 'institution-b' }), 'institution-b');
  });

  await t.test('does not scope super administrators', () => {
    assert.equal(institutionScope({ role: UserRole.SUPER_ADMIN, institutionId: null }), undefined);
  });

  await t.test('does not grant institution-less users access to unassigned records', () => {
    assert.equal(institutionScope({ role: UserRole.ADMIN, institutionId: null }), '__no_institution__');
  });
});
