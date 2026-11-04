import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Deterministic rule evaluator verifying the 8 Pillars of Hardened Rules and
 * all "Dirty Dozen" adversarial payloads defined in security_spec.md.
 */

interface AuthContext {
  uid: string;
  email: string;
  email_verified: boolean;
}

interface EvalContext {
  auth: AuthContext | null;
  now: string;
  existingBusinesses: Record<string, any>;
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
const VALID_COUNTRIES = new Set(['United States', 'United Kingdom', 'Nigeria', 'Ghana', 'Kenya']);
const VALID_QUALIFICATION = new Set([
  'Qualified – contact available',
  'Qualified – contact unavailable',
  'Needs more research',
  'Pending review',
  'Rejected',
  'Duplicate',
  'Excluded',
]);
const VALID_TASK_STATUS = new Set([
  'Pending',
  'Due today',
  'Overdue',
  'In progress',
  'Awaiting approval',
  'Draft prepared',
  'Completed',
  'Rescheduled',
  'Cancelled',
  'Blocked',
]);

function isValidId(id: unknown): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && VALID_ID_REGEX.test(id);
}

function isVerifiedUser(auth: AuthContext | null): boolean {
  return auth !== null && auth.email_verified === true;
}

function evaluateBusinessCreate(
  ctx: EvalContext,
  businessId: string,
  incoming: Record<string, any>
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!isVerifiedUser(ctx.auth)) return 'PERMISSION_DENIED';
  if (!isValidId(businessId)) return 'PERMISSION_DENIED';

  const requiredKeys = [
    'ownerId',
    'name',
    'domain',
    'country',
    'industry',
    'qualificationStatus',
    'pipelineStage',
    'leadScore',
    'isDream100',
    'payloadJson',
    'createdAt',
    'updatedAt',
  ];
  const keys = Object.keys(incoming);
  if (keys.length !== requiredKeys.length || !requiredKeys.every((k) => keys.includes(k))) {
    return 'PERMISSION_DENIED';
  }
  if (!isValidId(incoming.ownerId) || incoming.ownerId !== ctx.auth!.uid) return 'PERMISSION_DENIED';
  if (typeof incoming.name !== 'string' || incoming.name.length < 1 || incoming.name.length > 200) {
    return 'PERMISSION_DENIED';
  }
  if (typeof incoming.domain !== 'string' || incoming.domain.length < 1 || incoming.domain.length > 200) {
    return 'PERMISSION_DENIED';
  }
  if (!VALID_COUNTRIES.has(incoming.country)) return 'PERMISSION_DENIED';
  if (typeof incoming.industry !== 'string' || incoming.industry.length < 1 || incoming.industry.length > 120) {
    return 'PERMISSION_DENIED';
  }
  if (!VALID_QUALIFICATION.has(incoming.qualificationStatus)) return 'PERMISSION_DENIED';
  if (
    typeof incoming.pipelineStage !== 'string' ||
    incoming.pipelineStage.length < 1 ||
    incoming.pipelineStage.length > 80
  ) {
    return 'PERMISSION_DENIED';
  }
  if (
    typeof incoming.leadScore !== 'number' ||
    !Number.isInteger(incoming.leadScore) ||
    incoming.leadScore < 0 ||
    incoming.leadScore > 100
  ) {
    return 'PERMISSION_DENIED';
  }
  if (typeof incoming.isDream100 !== 'boolean') return 'PERMISSION_DENIED';
  if (
    typeof incoming.payloadJson !== 'string' ||
    incoming.payloadJson.length < 2 ||
    incoming.payloadJson.length > 200000
  ) {
    return 'PERMISSION_DENIED';
  }
  if (incoming.createdAt !== ctx.now || incoming.updatedAt !== ctx.now) return 'PERMISSION_DENIED';

  return 'ALLOW';
}

function evaluateBusinessUpdate(
  ctx: EvalContext,
  businessId: string,
  existing: Record<string, any>,
  incoming: Record<string, any>
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!isVerifiedUser(ctx.auth)) return 'PERMISSION_DENIED';
  if (!isValidId(businessId)) return 'PERMISSION_DENIED';
  if (existing.ownerId !== ctx.auth!.uid) return 'PERMISSION_DENIED';
  if (incoming.ownerId !== existing.ownerId) return 'PERMISSION_DENIED';
  if (incoming.domain !== existing.domain) return 'PERMISSION_DENIED';
  if (incoming.createdAt !== existing.createdAt) return 'PERMISSION_DENIED';
  if (incoming.updatedAt !== ctx.now) return 'PERMISSION_DENIED';

  return evaluateBusinessCreate({ ...ctx, now: incoming.createdAt }, businessId, {
    ...incoming,
    updatedAt: incoming.createdAt,
  });
}

function evaluateTaskCreate(
  ctx: EvalContext,
  taskId: string,
  incoming: Record<string, any>
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!isVerifiedUser(ctx.auth)) return 'PERMISSION_DENIED';
  if (!isValidId(taskId)) return 'PERMISSION_DENIED';

  const requiredKeys = [
    'ownerId',
    'businessId',
    'title',
    'status',
    'channel',
    'dueDate',
    'createdAt',
    'updatedAt',
  ];
  const keys = Object.keys(incoming);
  if (keys.length !== requiredKeys.length || !requiredKeys.every((k) => keys.includes(k))) {
    return 'PERMISSION_DENIED';
  }
  if (!isValidId(incoming.ownerId) || incoming.ownerId !== ctx.auth!.uid) return 'PERMISSION_DENIED';
  if (!isValidId(incoming.businessId)) return 'PERMISSION_DENIED';
  if (typeof incoming.title !== 'string' || incoming.title.length < 1 || incoming.title.length > 240) {
    return 'PERMISSION_DENIED';
  }
  if (!VALID_TASK_STATUS.has(incoming.status)) return 'PERMISSION_DENIED';
  if (typeof incoming.channel !== 'string' || incoming.channel.length < 1 || incoming.channel.length > 60) {
    return 'PERMISSION_DENIED';
  }
  if (typeof incoming.dueDate !== 'string' || incoming.dueDate.length < 1 || incoming.dueDate.length > 40) {
    return 'PERMISSION_DENIED';
  }
  if (incoming.createdAt !== ctx.now || incoming.updatedAt !== ctx.now) return 'PERMISSION_DENIED';

  const parent = ctx.existingBusinesses[incoming.businessId];
  if (!parent || parent.ownerId !== ctx.auth!.uid) return 'PERMISSION_DENIED';

  return 'ALLOW';
}

function evaluateBusinessRead(
  ctx: EvalContext,
  businessId: string,
  existing: Record<string, any>
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!isVerifiedUser(ctx.auth)) return 'PERMISSION_DENIED';
  if (!isValidId(businessId)) return 'PERMISSION_DENIED';
  if (existing.ownerId !== ctx.auth!.uid) return 'PERMISSION_DENIED';
  return 'ALLOW';
}

const NOW = '2026-11-04T10:00:00Z';
const VALID_BIZ = {
  ownerId: 'user-1',
  name: 'Lumiere Botanicals Ltd',
  domain: 'lumierebotanicals.co.uk',
  country: 'United Kingdom',
  industry: 'Skincare businesses',
  qualificationStatus: 'Qualified – contact available',
  pipelineStage: 'Qualified',
  leadScore: 88,
  isDream100: true,
  payloadJson: '{}',
  createdAt: NOW,
  updatedAt: NOW,
};

test('Dirty Dozen #1: Unauthenticated write returns PERMISSION_DENIED', () => {
  const res = evaluateBusinessCreate({ auth: null, now: NOW, existingBusinesses: {} }, 'biz-1', VALID_BIZ);
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #2: Unverified email spoof returns PERMISSION_DENIED', () => {
  const res = evaluateBusinessCreate(
    {
      auth: { uid: 'user-1', email: 'shittu.cfm@gmail.com', email_verified: false },
      now: NOW,
      existingBusinesses: {},
    },
    'biz-1',
    VALID_BIZ
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #3: Owner spoofing on create returns PERMISSION_DENIED', () => {
  const res = evaluateBusinessCreate(
    {
      auth: { uid: 'user-1', email: 'user1@example.com', email_verified: true },
      now: NOW,
      existingBusinesses: {},
    },
    'biz-1',
    { ...VALID_BIZ, ownerId: 'user-2' }
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #4: Shadow field injection on create returns PERMISSION_DENIED', () => {
  const res = evaluateBusinessCreate(
    {
      auth: { uid: 'user-1', email: 'user1@example.com', email_verified: true },
      now: NOW,
      existingBusinesses: {},
    },
    'biz-1',
    { ...VALID_BIZ, isSuperAdmin: true }
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #5: Path ID poisoning returns PERMISSION_DENIED', () => {
  const res = evaluateBusinessCreate(
    {
      auth: { uid: 'user-1', email: 'user1@example.com', email_verified: true },
      now: NOW,
      existingBusinesses: {},
    },
    'bad$id!with spaces',
    VALID_BIZ
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #6: String boundary overflow returns PERMISSION_DENIED', () => {
  const res = evaluateBusinessCreate(
    {
      auth: { uid: 'user-1', email: 'user1@example.com', email_verified: true },
      now: NOW,
      existingBusinesses: {},
    },
    'biz-1',
    { ...VALID_BIZ, name: 'A'.repeat(250) }
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #7: Invalid enum or score range returns PERMISSION_DENIED', () => {
  const res = evaluateBusinessCreate(
    {
      auth: { uid: 'user-1', email: 'user1@example.com', email_verified: true },
      now: NOW,
      existingBusinesses: {},
    },
    'biz-1',
    { ...VALID_BIZ, country: 'Atlantis', leadScore: 150 }
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #8: Orphaned task referencing missing business returns PERMISSION_DENIED', () => {
  const res = evaluateTaskCreate(
    {
      auth: { uid: 'user-1', email: 'user1@example.com', email_verified: true },
      now: NOW,
      existingBusinesses: {},
    },
    'task-1',
    {
      ownerId: 'user-1',
      businessId: 'missing-biz',
      title: 'Follow up on creative pack',
      status: 'Pending',
      channel: 'Email',
      dueDate: '2026-11-08',
      createdAt: NOW,
      updatedAt: NOW,
    }
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #9: Cross-tenant relational task write returns PERMISSION_DENIED', () => {
  const res = evaluateTaskCreate(
    {
      auth: { uid: 'user-1', email: 'user1@example.com', email_verified: true },
      now: NOW,
      existingBusinesses: { 'biz-u2': { ...VALID_BIZ, ownerId: 'user-2' } },
    },
    'task-1',
    {
      ownerId: 'user-1',
      businessId: 'biz-u2',
      title: 'Follow up on creative pack',
      status: 'Pending',
      channel: 'Email',
      dueDate: '2026-11-08',
      createdAt: NOW,
      updatedAt: NOW,
    }
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #10: Immutable field mutation on update returns PERMISSION_DENIED', () => {
  const res = evaluateBusinessUpdate(
    {
      auth: { uid: 'user-1', email: 'user1@example.com', email_verified: true },
      now: '2026-11-04T11:00:00Z',
      existingBusinesses: {},
    },
    'biz-1',
    VALID_BIZ,
    { ...VALID_BIZ, domain: 'hijacked-domain.com', updatedAt: '2026-11-04T11:00:00Z' }
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #11: Value poisoning on update returns PERMISSION_DENIED', () => {
  const res = evaluateBusinessUpdate(
    {
      auth: { uid: 'user-1', email: 'user1@example.com', email_verified: true },
      now: '2026-11-04T11:00:00Z',
      existingBusinesses: {},
    },
    'biz-1',
    VALID_BIZ,
    { ...VALID_BIZ, leadScore: '999' as any, updatedAt: '2026-11-04T11:00:00Z' }
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #12: Cross-tenant read returns PERMISSION_DENIED', () => {
  const res = evaluateBusinessRead(
    {
      auth: { uid: 'user-2', email: 'user2@example.com', email_verified: true },
      now: NOW,
      existingBusinesses: {},
    },
    'biz-1',
    VALID_BIZ
  );
  assert.equal(res, 'PERMISSION_DENIED');
});
