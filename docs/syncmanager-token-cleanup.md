# SyncManager Token Management Cleanup

## Issue

The SyncManager was caching the auth token in a private property (`this.token`) and requiring initialization via `initialize(token)` method. This was redundant since:

1. The token is already stored in localStorage
2. The token can be refreshed by useAuth hook, making cached copies stale
3. Reading directly from localStorage ensures we always use the latest token

## Changes Made

### 1. SyncManager.ts

**Removed:**

- `private token: string = ""` property
- `initialize(token: string)` method

**Updated:**
All API calls now read token directly from localStorage:

```typescript
// Before
Authorization: `Bearer ${this.token}`;

// After
const currentToken = localStorage.getItem("auth_token");
if (!currentToken) {
  throw new Error("No auth token available");
}
Authorization: `Bearer ${currentToken}`;
```

**Methods Updated:**

- `addQueryOptimistic()` - Line ~250
- `assignQueryOptimistic()` - Line ~330
- `updateQueryOptimistic()` - Line ~395
- `deleteQueryOptimistic()` - Admin path (Line ~470) and Non-admin path (Line ~540)
- `approveDeleteOptimistic()` - Line ~560
- `rejectDeleteOptimistic()` - Line ~630
- `updateStatusOptimistic()` - Line ~800

### 2. queryStore.ts

**Removed:**

- `syncManager.initialize(token)` call from `initialize()` method (Line ~167)

The store's `initialize()` method now only calls `syncManager.loadAllData()` without passing a token.

### 3. useAuth.ts

**No changes needed** - This file never called `initialize()`, it only passed tokens to queryStore's `initialize()`.

## Benefits

1. **Always Fresh Token**: Every API call reads the latest token from localStorage, ensuring refreshed tokens are used immediately
2. **Simpler Code**: No need to manage token state in SyncManager
3. **No Stale Data**: Eliminates risk of using cached expired tokens
4. **Consistent Pattern**: Matches how `fetchAndUpdateCache()` already worked (it was reading from localStorage)

## Verification

✅ All TypeScript diagnostics passing
✅ No remaining `this.token` references in SyncManager
✅ No remaining `syncManager.initialize()` calls in codebase
✅ All 8 API methods updated to read from localStorage

## Testing Checklist

- [ ] Login flow works correctly
- [ ] Token refresh updates localStorage and subsequent API calls use new token
- [ ] All CRUD operations (add, assign, edit, delete, approve, reject) work
- [ ] Status updates work correctly
- [ ] Background refresh continues to work
- [ ] Logout clears everything properly
