import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { createRequirePermission } from '../../src/server/auth/authorization.js';
import type { ActorResolver, AuthenticatedActor } from '../../src/server/auth/types.js';
import { hashPolicyContent } from '../../src/server/policy/hash.js';
import { canTransitionPolicyVersion } from '../../src/server/policy/workflow.js';
import { InsforgeVerifiedIdentityProvider } from '../../src/server/auth/insforge-provider.js';

const actor: AuthenticatedActor = {
  userId: '11111111-1111-4111-8111-111111111111',
  legacyIdentity: 'reviewer@example.test',
  roles: ['reviewer'],
  permissions: ['policy.read', 'policy.review'],
  source: 'auth',
};

function request(): Request {
  return {} as Request;
}

function requestWithHeaders(headers: Record<string, string>): Request {
  return { header: (name: string) => headers[name.toLowerCase()] } as unknown as Request;
}

function response() {
  const result: { statusCode?: number; body?: unknown; next: boolean } = { next: false };
  const response = {
    status(code: number) { result.statusCode = code; return response; },
    json(body: unknown) { result.body = body; return response; },
  } as unknown as Response;
  return { response, result };
}

async function testAuthorization() {
  const resolver: ActorResolver = { resolve: async () => null };
  const unauthenticated = response();
  await createRequirePermission(resolver, 'policy.approve')(request(), unauthenticated.response, () => { unauthenticated.result.next = true; });
  assert.equal(unauthenticated.result.statusCode, 401);

  const noPermission: ActorResolver = { resolve: async () => ({ ...actor, permissions: ['policy.read'] }) };
  const forbidden = response();
  await createRequirePermission(noPermission, 'policy.approve')(request(), forbidden.response, () => { forbidden.result.next = true; });
  assert.equal(forbidden.result.statusCode, 403);

  const allowed: ActorResolver = { resolve: async () => actor };
  const permitted = response();
  await createRequirePermission(allowed, 'policy.review')(request(), permitted.response, () => { permitted.result.next = true; });
  assert.equal(permitted.result.next, true);

  let receivedToken: string | null = null;
  const provider = new InsforgeVerifiedIdentityProvider('https://example.invalid', 'anon-test', (token) => {
    receivedToken = token;
    if (token === 'invalid-token') {
      return { auth: { getCurrentUser: async () => ({ data: { user: null }, error: new Error('invalid token') }) } } as never;
    }
    return { auth: { getCurrentUser: async () => ({ data: { user: { id: 'verified-user', email: 'verified@example.test' } }, error: null }) } } as never;
  });
  const verified = await provider.resolve(requestWithHeaders({ authorization: 'Bearer real-token' }));
  assert.deepEqual(verified, { userId: 'verified-user', legacyIdentity: 'verified@example.test' });
  assert.equal(receivedToken, 'real-token');
  assert.equal(await provider.resolve(requestWithHeaders({ authorization: 'Bearer invalid-token' })), null);
  assert.equal(await provider.resolve(requestWithHeaders({ 'x-user-id': 'forged-user', 'x-role': 'admin' })), null);
}

function testHash() {
  const base = {
    sourceText: ' Norma 1\r\n',
    numerals: [{ code: '2', title: 'Dos', text: 'Texto', orderIndex: 2, processArea: null, effectiveFrom: null, effectiveTo: null }],
  };
  assert.equal(hashPolicyContent(base), hashPolicyContent({ ...base, numerals: [...base.numerals] }));
  assert.notEqual(hashPolicyContent(base), hashPolicyContent({ ...base, sourceText: 'Norma distinta', numerals: base.numerals }));
  assert.equal(canTransitionPolicyVersion('DRAFT', 'REVIEW'), true);
  assert.equal(canTransitionPolicyVersion('REVIEW', 'ACTIVE'), false);
  assert.equal(canTransitionPolicyVersion('ACTIVE', 'RETIRED'), true);
}

await testAuthorization();
testHash();
console.log('F1 RBAC/policy tests: 9/9 aprobadas');
