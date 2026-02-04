# Phase 4-6 Implementation Analysis

**Date:** February 4, 2026  
**Analysis:** Phases 4-6 of Query Tracker implementation  
**Status:** Ready for implementation

---

## PHASE 4: Assign Button Rework

### Requirements

From `requirements.md` Section 5:

> **For Juniors:**
>
> - **Single-click self-assign** (instant)
>
> **For Seniors/Admins:**
>
> - **Self Assign** button (instant)
> - **Assign** button → Inline user picklist

### Current Implementation

**File: `app/components/QueryCardCompact.tsx`**

Current assign button behavior:

- Shows "Assign" button for unassigned queries
- Opens inline user picklist on click
- No distinction between Junior/Senior/Admin

### What Needs to Change

#### For Junior Users:

1. Show single "Self Assign" button
2. Click instantly assigns to self (no picklist)
3. No ability to assign to others

#### For Senior/Admin Users:

1. Show TWO buttons:
   - "Self Assign" - instant self-assignment
   - "Assign" - opens inline user picklist
2. Both buttons visible (not in dropdown)

### Implementation Plan

**File: `app/components/QueryCardCompact.tsx`**

```typescript
// Determine user role
const currentUserRole = (currentUserRole || "").toLowerCase();
const isJunior = currentUserRole === "junior";
const isSeniorOrAdmin = ["senior", "admin", "pseudo admin"].includes(currentUserRole);

// In Bucket A (unassigned):
{query.Status === "A" && (
  <>
    {isJunior && (
      // Junior: Single "Self Assign" button
      <button onClick={() => handleSelfAssign()} className="...">
        Self Assign
      </button>
    )}

    {isSeniorOrAdmin && (
      // Senior/Admin: Two buttons
      <>
        <button onClick={() => handleSelfAssign()} className="...">
          Self Assign
        </button>
        <button onClick={() => setShowAssignPicker(true)} className="...">
          Assign
        </button>
      </>
    )}
  </>
)}
```

### Files to Modify

1. `app/components/QueryCardCompact.tsx` - Update assign button logic
2. Test with different user roles

### Complexity: **LOW** ⭐

---

## PHASE 5: Bucket H – Deletion Workflow

### Requirements

From `requirements.md` Section 12:

> 1. Delete → Moves to H with "P.A." status
> 2. Admin sees ✓ (approve) and ✗ (reject) buttons
> 3. Evaporation starts only after approval
>
> **On Rejection:**
>
> - Returns to **previous bucket** (`Previous Status`)
> - Shows **"Del-Rej"** indicator

### Current Implementation

**Partially Implemented:**

- ✅ "P.A." indicator shows in Bucket H
- ✅ "Del-Rej" indicator shows after rejection
- ✅ Data model has `Previous Status`, `Delete Rejected` fields
- ❌ No approve/reject buttons for admins
- ❌ No backend logic for approval/rejection workflow

### What Needs to Change

#### 1. UI Changes (QueryCardCompact.tsx)

**In Bucket H, for Admin users:**

- Show ✓ (approve) button
- Show ✗ (reject) button
- Both visible on hover with other actions

#### 2. Backend Changes (API Routes)

**New endpoint or extend existing:**

- `POST /api/queries/approve-delete` - Approve deletion
  - Keeps query in H
  - Sets `Delete Approved By` = current user email
  - Sets `Delete Approved Date Time` = now
  - Starts evaporation countdown

- `POST /api/queries/reject-delete` - Reject deletion
  - Moves query back to `Previous Status`
  - Sets `Delete Rejected` = "true"
  - Clears `Delete Requested Date Time`
  - Clears `Delete Requested By`

#### 3. Store Updates (queryStore.ts)

Add optimistic update functions:

- `approveDeleteOptimistic(queryId)`
- `rejectDeleteOptimistic(queryId)`

### Implementation Plan

**Step 1: Add UI Buttons**

File: `app/components/QueryCardCompact.tsx`

```typescript
{isInBucketH && isAdmin && (
  <div className="flex gap-1">
    <button
      onClick={() => onApproveDelete?.(query)}
      className="p-1 rounded hover:bg-green-100 text-green-600"
      title="Approve deletion"
    >
      ✓
    </button>
    <button
      onClick={() => onRejectDelete?.(query)}
      className="p-1 rounded hover:bg-red-100 text-red-600"
      title="Reject deletion"
    >
      ✗
    </button>
  </div>
)}
```

**Step 2: Add Store Functions**

File: `app/stores/queryStore.ts`

```typescript
approveDeleteOptimistic: (queryId: string) => {
  // Update local state
  // Call API
  // Refresh on success
};

rejectDeleteOptimistic: (queryId: string) => {
  // Update local state (move back to previous status)
  // Call API
  // Refresh on success
};
```

**Step 3: Create API Endpoint**

File: `app/api/queries/delete-action/route.ts` (new)

```typescript
POST /api/queries/delete-action
Body: { queryId, action: "approve" | "reject" }

- Validate user is admin
- Find query in sheet
- If approve: Set Delete Approved By, Delete Approved Date Time
- If reject: Move to Previous Status, set Delete Rejected = true
- Update sheet
```

### Files to Modify

1. `app/components/QueryCardCompact.tsx` - Add approve/reject buttons
2. `app/stores/queryStore.ts` - Add optimistic update functions
3. `app/api/queries/delete-action/route.ts` - NEW endpoint
4. `app/dashboard/page.tsx` - Wire up handlers

### Complexity: **MEDIUM** ⭐⭐

---

## PHASE 6: GM Indicator

### Requirements

From `requirements.md` Section 6:

> - Checkbox appears when status → E or F
> - **E→F**: Defaults to last value, user can change
> - **First E/F**: Default unchecked
> - Shows **"GM" badge** on card if checked

### Current Implementation

**File: `app/components/QueryCardCompact.tsx`**

✅ GM badge already shows:

```typescript
{query.GmIndicator === "TRUE" && (
  <span className="px-1.5 py-0.5 text-[8px] font-semibold bg-purple-100 text-purple-700 rounded flex-shrink-0"
    title="Gmail Indicator">
    GM
  </span>
)}
```

**File: `app/components/EditQueryModal.tsx`**

❌ GM checkbox NOT implemented in edit modal

### What Needs to Change

#### 1. Edit Modal Changes

**Show GM checkbox when:**

- Current status is E or F
- OR user is changing status TO E or F

**Checkbox behavior:**

- **First time E/F:** Default unchecked
- **E→F transition:** Default to current value (can change)
- **Other transitions:** Hide checkbox

#### 2. Status Change Logic

When status changes to E or F:

- Show GM checkbox in modal
- If moving from E→F: Pre-check if already true
- If first time: Leave unchecked
- Save value to `GmIndicator` field

### Implementation Plan

**File: `app/components/EditQueryModal.tsx`**

```typescript
// Determine if GM checkbox should show
const showGmCheckbox =
  formData.Status === "E" ||
  formData.Status === "F";

// Default value logic
const getDefaultGmValue = () => {
  if (formData.Status === "F" && query.Status === "E") {
    // E→F: Use current value
    return query.GmIndicator === "TRUE";
  }
  if (query.Status !== "E" && query.Status !== "F") {
    // First time E/F: Default unchecked
    return false;
  }
  // Already in E/F: Keep current value
  return query.GmIndicator === "TRUE";
};

// In form:
{showGmCheckbox && (
  <div className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={formData.GmIndicator === "TRUE"}
      onChange={(e) => setFormData({
        ...formData,
        GmIndicator: e.target.checked ? "TRUE" : "FALSE"
      })}
    />
    <label>Gmail Indicator (GM)</label>
  </div>
)}
```

### Files to Modify

1. `app/components/EditQueryModal.tsx` - Add GM checkbox with logic

### Complexity: **LOW** ⭐

---

## IMPLEMENTATION PRIORITY

### Recommended Order:

1. **Phase 4: Assign Button Rework** ⭐ (Easiest, high user impact)
2. **Phase 6: GM Indicator** ⭐ (Easy, completes E/F workflow)
3. **Phase 5: Bucket H Workflow** ⭐⭐ (Medium complexity, requires API)

### Estimated Time:

- Phase 4: 30-45 minutes
- Phase 6: 30-45 minutes
- Phase 5: 1-2 hours

**Total: 2-3.5 hours for all three phases**

---

## TESTING CHECKLIST

### Phase 4: Assign Button

- [ ] Junior sees single "Self Assign" button
- [ ] Junior can self-assign instantly
- [ ] Junior cannot assign to others
- [ ] Senior/Admin see two buttons
- [ ] "Self Assign" works instantly
- [ ] "Assign" opens user picklist
- [ ] Assignment updates correctly

### Phase 5: Bucket H

- [ ] Delete moves query to H with "P.A."
- [ ] Admin sees ✓ and ✗ buttons in H
- [ ] Junior/Senior don't see approve/reject buttons
- [ ] Approve sets approval fields
- [ ] Reject moves back to previous bucket
- [ ] "Del-Rej" indicator shows after rejection
- [ ] Evaporation only starts after approval

### Phase 6: GM Indicator

- [ ] Checkbox shows when status is E or F
- [ ] Checkbox hidden for other statuses
- [ ] First E/F: Defaults unchecked
- [ ] E→F: Defaults to current value
- [ ] Can change value in modal
- [ ] GM badge shows on card when checked
- [ ] Value persists after save

---

## NEXT STEPS

Ready to implement Phase 4 (Assign Button Rework)?

This is the easiest of the three and will provide immediate UX improvement for Junior users.
