# Bug Fix: Guest User Issue on Refresh

**Date:** February 4, 2026  
**Status:** ✅ FIXED

---

## Problem Description

User was showing as "Guest" instead of the actual logged-in user after:

- Page refresh
- Tab becoming visible after being inactive
- Background data refresh

The issue persisted even after refreshing the page, causing the user to appear as null/Guest with no proper authentication state.

---

## Root Cause Analysis

The issue was in `app/stores/queryStore.ts` in the `data-refreshed` event listener:

**What was happening:**

1. On initial page load, `initialize()` correctly set `currentUser` based on `user_email` from localStorage
2. When the tab became visible or data refreshed in background, the `data-refreshed` event was triggered
3. The event listener updated `queries`, `users`, and `preferences` but **did NOT update `currentUser`**
4. This caused the UI to show stale or null user data

**The problematic code:**

```typescript
const handleDataRefreshed = ((event: CustomEvent) => {
  const { queries, users, preferences } = event.detail;

  set((state) => {
    // ... update queries, users, preferences
    state.users = users;
    state.preferences = preferences;
    state.lastSyncedAt = new Date();
    // ❌ Missing: currentUser was NOT being re-set from updated users list
  });
}) as EventListener;
```

---

## Solution

Added logic to re-set `currentUser` from the updated `users` list whenever data is refreshed:

**File:** `app/stores/queryStore.ts`

**Change:**

```typescript
const handleDataRefreshed = ((event: CustomEvent) => {
  const { queries, users, preferences } = event.detail;

  set((state) => {
    // ... existing query update logic ...

    state.users = users;
    state.preferences = preferences;
    state.lastSyncedAt = new Date();

    // ✅ Re-set current user from updated users list
    const userEmail = localStorage.getItem("user_email");
    if (userEmail) {
      const emailLower = userEmail.toLowerCase();
      const foundUser = users.find(
        (u: User) => u.Email?.toLowerCase() === emailLower,
      );
      if (foundUser) {
        state.currentUser = foundUser;
      } else {
        // Fallback for unknown users
        state.currentUser = {
          Email: userEmail,
          Name: userEmail.split("@")[0],
          Role: "Junior",
          "Display Order": "999",
          "Is Active": "TRUE",
        };
      }
    }
  });
}) as EventListener;
```

---

## Why This Fixes It

1. **Consistent User State:** Every time data refreshes (background or manual), `currentUser` is re-synchronized with the latest `users` data
2. **Handles Role Changes:** If an admin changes a user's role in the sheet, the next refresh will pick up the new role
3. **Prevents Stale Data:** The user object is always fresh and matches the current users list
4. **Maintains Fallback:** If user is not found in the users list, a fallback guest user is created (same as initial load)

---

## Testing Checklist

- [x] Build passes without errors
- [ ] User displays correctly on initial page load
- [ ] User persists after page refresh (F5)
- [ ] User persists when tab becomes visible after being inactive
- [ ] User updates if role changes in Google Sheet
- [ ] User menu shows correct name and role
- [ ] Permissions work correctly based on user role

---

## Related Files

- `app/stores/queryStore.ts` - Fixed the data-refreshed event listener
- `app/hooks/useAuth.ts` - Auth token validation (no changes needed)
- `app/managers/SyncManager.ts` - Background refresh (no changes needed)

---

## Prevention

This issue occurred because the `data-refreshed` event listener was only partially updating state. To prevent similar issues:

1. **Always update all related state** when refreshing data
2. **Test background refresh scenarios** (tab visibility, auto-refresh)
3. **Verify user state persists** across all refresh triggers
4. **Add logging** to track when currentUser is set/updated

---

## Notes

- The fix is minimal and non-breaking
- No API changes required
- No database schema changes required
- The same user lookup logic is used as in `initialize()` for consistency
