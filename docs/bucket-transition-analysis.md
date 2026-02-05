# Bucket Transition Analysis - Field Clearing Logic

## Date: February 4, 2026

## Purpose

Analyze whether the current field clearing logic makes sense when moving queries between buckets.

---

## Current Backward Transition Logic

### Moving to A (Unassigned)

**Clears:**

- `Assigned To`
- `Assigned By`
- `Assignment Date Time`
- `Remarks`
- `Proposal Sent Date Time`
- `Whats Pending`
- `Entered In SF Date Time`
- `Event ID in SF`
- `Event Title in SF`
- `Discarded Date Time`

**Analysis:** ✅ **CORRECT**

- Bucket A = Unassigned, so clearing assignment fields makes sense
- Clearing all future workflow fields (proposal, SF, discard) is correct
- This is a "reset to initial state" operation

---

### Moving to B (Pending Proposal)

**Clears:**

- `Proposal Sent Date Time`
- `Whats Pending`
- `Entered In SF Date Time`
- `Event ID in SF`
- `Event Title in SF`
- `Discarded Date Time`

**Analysis:** ✅ **CORRECT**

- Bucket B = Assigned but proposal not sent yet
- Keeps assignment fields (Assigned To, Assigned By, Assignment Date Time, Remarks)
- Clears proposal and SF fields that haven't happened yet
- Makes sense for "back to assigned" state

---

### Moving to C or D (Proposal Sent)

**Clears:**

- `Entered In SF Date Time`
- `Event ID in SF`
- `Event Title in SF`
- `Discarded Date Time`

**Analysis:** ✅ **CORRECT**

- Bucket C/D = Proposal sent but not in Salesforce yet
- Keeps assignment and proposal fields
- Clears SF fields that haven't happened yet
- Makes sense for "back to proposal sent" state

---

### Moving to E or F (In Salesforce)

**Clears:**

- `Discarded Date Time`

**Analysis:** ✅ **CORRECT**

- Bucket E/F = In Salesforce
- Keeps all workflow fields (assignment, proposal, SF)
- Only clears discard date
- Makes sense for "back from discarded" state

---

## Potential Issues Identified

### Issue 1: Moving from G (Discarded) to Earlier Buckets

**Scenario:** Query in G (Discarded) → Move to C (Proposal Sent)

**Current Behavior:**

- Clears: `Entered In SF Date Time`, `Event ID in SF`, `Event Title in SF`, `Discarded Date Time`
- **PROBLEM:** If the query was previously in E/F (had SF data), moving to G then back to C loses SF data

**Is this correct?**

- ❓ **DEBATABLE** - Depends on business logic:
  - **Option A:** Discard = "Start over", so clearing SF data makes sense
  - **Option B:** Discard = "Pause", so SF data should be preserved

**Recommendation:** ✅ **CURRENT LOGIC IS ACCEPTABLE**

- Discarding typically means "this didn't work out"
- If moving back to C, it's likely a new attempt, so clearing SF data is reasonable
- If SF data needs to be preserved, user should move to E/F instead of C

---

### Issue 2: Moving from H (Deleted) to Earlier Buckets

**Scenario:** Query in H (Deleted - Pending Approval) → Admin rejects → Returns to previous status

**Current Behavior:**

- Uses `Previous Status` field to restore
- Sets `Delete Rejected = "true"` to show "Del-Rej" indicator
- **Does NOT clear any workflow fields**

**Is this correct?**

- ✅ **YES** - Rejection should restore the query to its exact previous state
- All workflow data (assignment, proposal, SF) should be preserved
- This is correctly implemented in `handleRejectDelete`

---

### Issue 3: Forward Transitions - Auto-fill Logic

**Current Behavior:**

- Moving to C/D: Auto-fills `Proposal Sent Date Time` if empty
- Moving to E/F: Auto-fills `Entered In SF Date Time` if empty
- Moving to G: Auto-fills `Discarded Date Time`
- Moving to H: Auto-fills `Delete Requested Date Time`

**Is this correct?**

- ✅ **YES** - Auto-filling dates for forward transitions makes sense
- Captures when the query entered that stage
- Prevents missing date data

---

## Edge Cases to Consider

### Edge Case 1: Rapid Status Changes

**Scenario:** A → B → C → B → C

**Current Behavior:**

- A → B: Assigns user, sets Assignment Date Time
- B → C: Sets Proposal Sent Date Time
- C → B: **CLEARS** Proposal Sent Date Time
- B → C: **RE-FILLS** Proposal Sent Date Time with NEW timestamp

**Is this correct?**

- ❓ **DEBATABLE**
  - **Pro:** New timestamp reflects when proposal was actually sent (after going back)
  - **Con:** Loses original proposal sent date

**Recommendation:** ✅ **CURRENT LOGIC IS ACCEPTABLE**

- If user moves back to B, it implies proposal wasn't actually sent
- New timestamp when moving to C again is more accurate

---

### Edge Case 2: Moving from E/F to C/D

**Scenario:** Query in E (Partial Proposal + In SF) → Move to C (Proposal Sent)

**Current Behavior:**

- Clears: `Entered In SF Date Time`, `Event ID in SF`, `Event Title in SF`
- Keeps: `Proposal Sent Date Time`, `Whats Pending`

**Is this correct?**

- ✅ **YES** - If moving from E to C, it means:
  - Query is no longer in Salesforce
  - SF data should be cleared
  - Proposal data should be kept (still sent)

---

### Edge Case 3: Moving from D to C

**Scenario:** Query in D (Proposal Sent Partially) → Move to C (Proposal Sent Full)

**Current Behavior:**

- No fields cleared (both are "Proposal Sent" stage)
- Only status changes

**Is this correct?**

- ✅ **YES** - Both C and D are at the same workflow stage
- No data should be lost

---

### Edge Case 4: Adding New Query with Allocate To

**Scenario:** User adds query with "Allocate To" field set

**Current Behavior:**

- Query created in Bucket A initially
- Then immediately moved to Bucket B with assignment fields
- **WAIT** - Looking at `addQueryOptimistic` in SyncManager:

```typescript
const newQuery: any = {
  "Query ID": tempId,
  "Query Description": queryData["Query Description"] || "",
  "Query Type": queryData["Query Type"] || "New",
  Status: "A", // ← Always starts at A
  // ...
};
```

**But in AddQueryModal:**

```typescript
if (allocateTo) {
  newQueryData.Status = "B";
  newQueryData["Assigned To"] = allocateTo;
  newQueryData["Assigned By"] = currentUser?.Email || "";
  newQueryData["Assignment Date Time"] = now;
}
```

**Is this correct?**

- ✅ **YES** - The modal passes `Status: "B"` in the data
- SyncManager should respect this and not override to "A"

**POTENTIAL BUG FOUND:** ❌

- SyncManager `addQueryOptimistic` hardcodes `Status: "A"`
- It should use `queryData.Status` if provided

---

## Recommendations

### 1. Fix Add Query Status Override

**Current Code (SyncManager.ts line ~280):**

```typescript
const newQuery: any = {
  "Query ID": tempId,
  "Query Description": queryData["Query Description"] || "",
  "Query Type": queryData["Query Type"] || "New",
  Status: "A",  // ← HARDCODED
```

**Should be:**

```typescript
const newQuery: any = {
  "Query ID": tempId,
  "Query Description": queryData["Query Description"] || "",
  "Query Type": queryData["Query Type"] || "New",
  Status: queryData.Status || "A",  // ← Use provided status or default to A
```

**Impact:**

- Currently, "Allocate To" feature doesn't work correctly
- Query is created in A, then needs a separate status update to move to B
- Should be created directly in B with assignment fields

---

### 2. Keep Current Backward Transition Logic

**Verdict:** ✅ **NO CHANGES NEEDED**

- All backward transition field clearing makes sense
- Follows logical workflow progression
- Prevents orphaned data

---

### 3. Document Expected Behavior

**Add to requirements:**

- Moving backward clears future workflow fields
- This is intentional to prevent data inconsistency
- If user needs to preserve data, they should not move backward

---

## Summary

### ✅ Correct Behavior

1. Backward transitions clear appropriate fields
2. Forward transitions auto-fill dates
3. Bucket H rejection preserves all data
4. Moving between C/D preserves data (same stage)

### ❌ Bug Found

1. **Add Query with Allocate To doesn't work correctly**
   - Status is hardcoded to "A" in SyncManager
   - Should respect `queryData.Status` if provided

### 📝 Recommendations

1. Fix the Add Query status override bug
2. Keep all other transition logic as-is
3. Document that backward transitions clear future fields

---

## Test Cases

### Test 1: Add Query with Allocate To

1. Add query with "Allocate To" set to a user
2. **Expected:** Query appears in Bucket B with assignment fields
3. **Current:** Query appears in Bucket A (BUG)

### Test 2: Move from E to C

1. Create query in E with SF data
2. Move to C
3. **Expected:** SF fields cleared, proposal fields kept
4. **Current:** ✅ Works correctly

### Test 3: Move from C to A

1. Create query in C with proposal data
2. Move to A
3. **Expected:** All fields cleared (reset to unassigned)
4. **Current:** ✅ Works correctly

### Test 4: Reject Deletion from H

1. Delete query (moves to H)
2. Admin rejects
3. **Expected:** Returns to previous status with all data intact
4. **Current:** ✅ Works correctly

---

**Status:** Analysis complete. One bug found in Add Query logic.
