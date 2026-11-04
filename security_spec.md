# AdVibe Prospect Intelligence — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default-Deny Catch-All**: All paths not explicitly matched (`/{document=**}`) deny all reads and writes (`allow read, write: if false;`).
2. **Verified Identity & Ownership**: Every write operation requires a signed-in user with `request.auth.token.email_verified == true` and `incoming().ownerId == request.auth.uid`.
3. **Path Variable Hardening**: Every document ID (`businessId`, `taskId`, `draftId`, `adminId`) must satisfy `isValidId(id)` (`id is string && id.size() >= 1 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
4. **Relational Sync (Master Gate)**: A `FollowUpTaskRecord` (`/tasks/{taskId}`) or `CampaignDraftRecord` (`/drafts/{draftId}`) can only be created or updated if the referenced parent business (`/businesses/$(incoming().businessId)`) exists and its `ownerId == request.auth.uid`.
5. **Anti-Update-Gap & Immutable Fields**: All `update` rules invoke the full `isValid[Entity](incoming())` helper first, enforce `incoming().ownerId == existing().ownerId`, `incoming().createdAt == existing().createdAt`, `incoming().updatedAt == request.time`, and restrict modified keys via `affectedKeys().hasOnly(...)`.
6. **Query Enforcer (`allow list`)**: Every `allow list` rule enforces `resource.data.ownerId == request.auth.uid` directly on the resource without delegating to the client or performing `get()`/`exists()` inside `list`.

## 2. The "Dirty Dozen" Payloads (All Must Return `PERMISSION_DENIED`)
1. **Unauthenticated Write**: `auth = null`, creating `/businesses/biz-1`.
2. **Unverified Email Spoof**: `auth = { uid: 'u1', token: { email: 'shittu.cfm@gmail.com', email_verified: false } }`, creating `/businesses/biz-1`.
3. **Owner Spoofing on Create**: `auth.uid = 'u1'`, `payload.ownerId = 'u2'` on `/businesses/biz-1`.
4. **Shadow Field Injection on Create**: Valid `/businesses/biz-1` payload plus extra `"isSuperAdmin": true` key.
5. **Path ID Poisoning**: Creating `/businesses/invalid$id!with*spaces` or a 200-char ID.
6. **String Boundary Overflow ("Denial of Wallet")**: Creating `/businesses/biz-1` with `name` length > 200 chars.
7. **Invalid Enum Value**: Creating `/businesses/biz-1` with `country: "Atlantis"` or `leadScore: 150`.
8. **Orphaned Sub-Entity Write**: Creating `/tasks/task-1` referencing non-existent `/businesses/missing-biz`.
9. **Cross-Tenant Relational Write**: User `u1` creating `/tasks/task-1` referencing `/businesses/biz-owned-by-u2`.
10. **Immutable Field Mutation on Update**: Updating `ownerId` or `createdAt` on `/businesses/biz-1`.
11. **Value Poisoning on Update**: Updating `/tasks/task-1` `status` to a number `999` or unlisted string `"Hacked"`.
12. **Cross-Tenant PII Read / Blanket List**: User `u2` attempting `get` or `list` on `/businesses/biz-owned-by-u1`.
