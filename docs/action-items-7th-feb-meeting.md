# Action Items from 7th February Meeting

## CRITICAL BUGS (Fix Immediately)

### 1. **Bucket H Missing from Stats Calculation** ⚠️

**Issue**: `calculateStats()` in `queryFilters.ts` only counts A-G, missing H bucket
**Impact**: Header shows 132 instead of 135 total queries
**Root Cause**: Stats object doesn't include H: `{ A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 }`
**Fix**: Add `H: 0` to stats initialization
**File**: `app/utils/queryFilters.ts`

### 2. **Delete Approved Queries Still Show in Pending Count** ⚠️

**Issue**: After approving deletion, query stays in H bucket but still counted as "pending deletion"
**Current Logic**: `PendingDeletions` filters by `q["Delete Requested By"]` field
**Problem**: When approved, we clear "Delete Requested By" but query stays in H
**Expected**: Approved deletions should NOT show in pending deletions widget
**Status**: Actually WORKING CORRECTLY per code review - approved deletions clear the field
**Verify**: User needs to test if this is actually broken or if it's a different issue

### 3. **"Delete Rejected By" Field Missing from Sheet** ⚠️

**Issue**: Google Sheet doesn't have "Delete Rejected By" column configured
**Impact**: Cannot track who rejected deletions in audit trail
**Fix**: Add column to Google Sheet: "Delete Rejected By"
**Also Add**: "Delete Rejected Date Time" for complete audit trail
**Files**: Google Sheet configuration + `app/utils/sheets.ts` type definition

### 4. **Junior Delete Request - Dual Bucket Display** ⚠️

**Issue**: When junior requests delete, query should show in BOTH original bucket (grayed out) AND H bucket
**Current**: Query only moves to H bucket
**Expected**:

- Original bucket: Show grayed out with "P.A." indicator
- H bucket: Show normally with "P.A." indicator
- After approval: Remove from original bucket, stay in H
- After rejection: Remove from H, restore in original bucket
  **Impact**: High - affects workflow visibility
  **Complexity**: Medium - requires filtering logic changes

---

## HIGH PRIORITY FEATURES

### 5. **Remarks Icon Indicator** ✅ DONE

**Status**: Already implemented (MessageSquare icon)
**Verify**: Test that icon shows when Remarks field has content

### 6. **Add "On Hold" Status Type**

**Type**: Status type (NOT bucket)
**Location**: Add to Query Type dropdown alongside "New", "Ongoing", "SEO Query"
**Position**: Bottom of list
**Files**:

- `app/config/sheet-constants.ts` - Add to QUERY_TYPE_ORDER
- All components using query type filters

### 7. **Cursor Jumping in Search Bar**

**Issue**: When typing in user search dropdown, cursor jumps to end
**Location**: User search in assign dropdown, filter bar user search
**Root Cause**: Likely controlled input re-rendering issue
**Files**:

- `app/components/AssignDropdown.tsx`
- `app/components/UserSearchDropdown.tsx`
- `app/components/CollapsibleFilterBar.tsx`

### 8. **Horizontal Scroll for Expanded Modal**

**Decision**: Use horizontal scroll (not vertical pagination)
**Implementation**:

- Modal content should scroll horizontally when content overflows
- Keep headers fixed
- Smooth scroll behavior
  **File**: `app/components/AllQueriesModal.tsx`

---

## MEDIUM PRIORITY FEATURES

### 9. **Rename "Request Deletion" to "Delete Query"**

**Scope**: All user roles (including Junior)
**Locations**:

- Edit modal button text
- Any tooltips/labels
  **Files**: `app/components/EditQueryModal.tsx`, `app/components/QueryDetailModal.tsx`

### 10. **Del-Rej Indicator in All Buckets**

**Current**: Shows in some buckets
**Expected**: Show "Del-Rej" badge in ALL buckets when `query["Delete Rejected"] === "true"`
**File**: `app/components/QueryCardCompact.tsx`
**Current Code**: `{wasDeleteRejected && !isInBucketH && ...}`
**Fix**: Remove `&& !isInBucketH` condition

### 11. **Undo Button for Sorting**

**Purpose**: Reset custom sorting to default bucket sorting
**Behavior**:

- Clears sortField, sortAscending, sortBuckets
- Returns to default newest-first per bucket
- Does NOT reset other filters (view mode, columns, etc.)
  **Location**: Near "Clear Sort" button in filter bar
  **File**: `app/components/CollapsibleFilterBar.tsx`

### 12. **Toggle for Scroll Direction (Expanded Modal)**

**Purpose**: Switch between horizontal scroll and vertical pagination
**Implementation**:

- Toggle button with arrow icons
- Horizontal: Smooth scroll
- Vertical: Page-based navigation with "Next Page" button
  **File**: `app/components/AllQueriesModal.tsx`
  **Priority**: Discuss with user - may be complex

---

## LOW PRIORITY / PHASE 2

### 13. **Manual Export Feature**

**Access**: Admin and Pseudo Admin only
**Format**: Excel/CSV export of current filtered view
**Features**:

- Export button in header or filter bar
- Respects current filters (search, bucket, user, etc.)
- Includes all visible columns
- Formatted similar to Google Sheet structure
  **Files**: New component + export utility

### 14. **Periodic Email Reports**

**Frequency**: Weekly (Friday 12 PM)
**Recipients**: Team-based (defined in sheet)
**Content**:

- Bucket-wise counts per user
- Query-wise details with descriptions, dates, remarks
- Formatted in email body (not attachment)
  **Requirements**:
- Team assignment system in Users sheet
- Email template design
- Backend email service integration

### 15. **Team Assignment System**

**Purpose**: Group users into teams for reporting
**Implementation**:

- Add "Team" column to Users sheet
- UI for admin to assign teams
- Used for periodic reports
  **Files**: Users sheet + admin interface

### 16. **Sorting Pin/Save Functionality**

**Purpose**: Save custom sort preferences per user
**Behavior**:

- Pin icon to save current sort
- Persists across sessions
- Reset button to clear saved sort
  **File**: Preferences system + UI

---

## BUGS TO INVESTIGATE

### 17. **Count Discrepancy Details**

**Reported**: 135 in sheet, 132 in app
**Likely Cause**: Missing H bucket in stats (see #1)
**Verify After Fix**:

- Check if H bucket queries are being filtered somewhere
- Verify history days filter isn't affecting H bucket
- Check if any queries have invalid Status values

### 18. **Approved Deletions Still in Header**

**User Report**: "Header still shows delete request queries even after accepting them"
**Code Review**: Logic looks correct - clears "Delete Requested By" field
**Investigation Needed**:

- Is the issue with the count or the display?
- Are approved queries showing in PendingDeletions widget?
- Is the H bucket count including approved deletions?
  **Test Scenario**:

1. Request deletion (query moves to H)
2. Approve deletion
3. Check: PendingDeletions widget should NOT show it
4. Check: H bucket count should still include it
5. Check: Query should stay in H bucket

---

## IMPLEMENTATION PRIORITY ORDER

### Sprint 1 (Critical - Do First)

1. Add H bucket to stats calculation (#1)
2. Add "Delete Rejected By" field to sheet (#3)
3. Fix Del-Rej indicator to show in all buckets (#10)
4. Verify and fix approved deletions count issue (#2, #18)

### Sprint 2 (High Priority)

5. Add "On Hold" status type (#6)
6. Fix cursor jumping in search (#7)
7. Implement horizontal scroll for modal (#8)
8. Rename "Request Deletion" to "Delete Query" (#9)

### Sprint 3 (Medium Priority)

9. Implement dual bucket display for junior delete requests (#4)
10. Add undo button for sorting (#11)
11. Add scroll direction toggle (#12)

### Sprint 4 (Phase 2 - Future)

12. Manual export feature (#13)
13. Periodic email reports (#14)
14. Team assignment system (#15)
15. Sorting pin/save functionality (#16)

---

## NOTES FROM MEETING

### Decisions Made:

- **Horizontal scroll** preferred over vertical pagination for expanded modal
- **On Hold** is a status type, not a bucket
- **Enter key** in Add Query modal already works (adds new row)
- **Remove All** button already implemented
- **Drafts persistence** already fixed (survives logout)
- **Bulk notifications** already implemented (single toast for multiple queries)

### Clarifications Needed:

- Exact format for manual export
- Email report template design
- Team assignment UI/UX
- Scroll toggle implementation complexity

### User Feedback:

- "Cursor jumping is annoying" - high priority fix
- "Need to see remarks easily" - already done with icon
- "Approved deletions still showing" - needs investigation
- "Count mismatch is confusing" - critical bug

---

## TESTING CHECKLIST

After implementing fixes, test:

- [ ] H bucket shows in header stats
- [ ] Total count matches sheet (135)
- [ ] Approved deletions don't show in PendingDeletions widget
- [ ] Approved deletions stay in H bucket
- [ ] Del-Rej shows in all buckets when applicable
- [ ] "Delete Rejected By" field saves to sheet
- [ ] "On Hold" status type appears in dropdowns
- [ ] Cursor doesn't jump when typing in search
- [ ] Horizontal scroll works smoothly in expanded modal
- [ ] "Delete Query" button text updated everywhere
- [ ] Remarks icon shows when remarks exist
- [ ] Junior delete request shows in both buckets (grayed in original)
