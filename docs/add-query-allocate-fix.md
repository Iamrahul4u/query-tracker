# Add Query "Allocate To" Bug Fix

## Date: February 4, 2026

## Bug Description

When adding a new query with "Allocate To" field set, the query was supposed to go directly to Bucket B with assignment fields populated. However, the SyncManager was hardcoding the status to "A", causing the query to appear in Bucket A (Unassigned) instead.

## Root Cause

**File:** `app/managers/SyncManager.ts` (line ~280)

**Problem:**

```typescript
const newQuery: any = {
  "Query ID": tempId,
  "Query Description": queryData["Query Description"] || "",
  "Query Type": queryData["Query Type"] || "New",
  Status: "A",  // ← HARDCODED - ignores queryData.Status
  "Added By": currentUserEmail,
  "Added Date Time": now,
  "Assigned To": "",  // ← Empty even if queryData has it
  "Assigned By": "",  // ← Empty even if queryData has it
  "Assignment Date Time": "",  // ← Empty even if queryData has it
```

The AddQueryModal correctly sets these fields:

```typescript
if (allocateTo) {
  newQueryData.Status = "B";
  newQueryData["Assigned To"] = allocateTo;
  newQueryData["Assigned By"] = currentUser?.Email || "";
  newQueryData["Assignment Date Time"] = now;
}
```

But SyncManager was ignoring them and hardcoding to "A".

## Fix Applied

**Changed:**

```typescript
const newQuery: any = {
  "Query ID": tempId,
  "Query Description": queryData["Query Description"] || "",
  "Query Type": queryData["Query Type"] || "New",
  Status: queryData.Status || "A",  // ← Use provided status or default to "A"
  "Added By": currentUserEmail,
  "Added Date Time": now,
  "Assigned To": queryData["Assigned To"] || "",  // ← Use provided value
  "Assigned By": queryData["Assigned By"] || "",  // ← Use provided value
  "Assignment Date Time": queryData["Assignment Date Time"] || "",  // ← Use provided value
```

## Impact

### Before Fix:

1. User adds query with "Allocate To" set to "John"
2. Query appears in Bucket A (Unassigned)
3. Assignment fields are empty
4. User has to manually assign the query

### After Fix:

1. User adds query with "Allocate To" set to "John"
2. Query appears in Bucket B (Pending Proposal)
3. Assignment fields populated:
   - Assigned To: John
   - Assigned By: Current User
   - Assignment Date Time: Current timestamp
4. Query is immediately assigned as intended

## Testing

### Test Case 1: Add Query Without Allocate To

1. Open Add Query modal
2. Enter description and type
3. Leave "Allocate To" empty
4. Click "Add Query"
5. **Expected:** Query appears in Bucket A (Unassigned)
6. **Result:** ✅ Works correctly

### Test Case 2: Add Query With Allocate To

1. Open Add Query modal
2. Enter description and type
3. Select a user in "Allocate To"
4. Click "Add Query"
5. **Expected:** Query appears in Bucket B with assignment fields
6. **Result:** ✅ Now works correctly (was broken before)

### Test Case 3: Multi-Add With Same User

1. Add first query with "Allocate To" set
2. Click "Add +" to add another
3. "Allocate To" field persists with same user
4. Add second query
5. **Expected:** Both queries in Bucket B assigned to same user
6. **Result:** ✅ Now works correctly

## Related Files

- `app/managers/SyncManager.ts` - Fixed status and assignment field handling
- `app/components/AddQueryModal.tsx` - Already correctly passing data
- `app/api/queries/route.ts` - Backend handles the data correctly

## Verification Checklist

- [x] Status respects `queryData.Status` if provided
- [x] Assignment fields respect `queryData` values if provided
- [x] Default behavior (no allocate) still works (Status = "A")
- [x] TypeScript diagnostics passing
- [x] No breaking changes to existing functionality

## Status

✅ **FIXED** - Add Query with "Allocate To" now works correctly
