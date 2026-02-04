# Bucket Multi-Select Sort Implementation

**Date:** February 4, 2026  
**Feature:** Apply custom sort to selected buckets  
**Status:** ✅ COMPLETE

---

## Overview

Implemented the "Apply To Buckets" multi-select feature for custom sorting as per requirements:

> **Custom Sorting**
>
> 1. Select **Sort By** field
> 2. Select **Apply To Buckets** (multi-select, default = "All")
> 3. If bucket lacks selected field → uses default sort
> 4. Custom sort = **secondary sort** within primary
> 5. **Persists across sessions**
> 6. **"Remove Sort" button** to revert to defaults

---

## Changes Made

### 1. Data Model Updates

#### `app/utils/sheets.ts`

- Added `SortBuckets?: string[]` to `Preferences` interface
- Updated `parsePreferences()` to read from column H
- Parses comma-separated bucket list or "ALL"
- Default value: `["ALL"]`

#### `app/config/sheet-constants.ts`

- Updated `SHEET_RANGES.PREFERENCES` from `A:G` to `A:H`

---

### 2. State Management

#### `app/hooks/useDashboardPreferences.ts`

- Added `sortBuckets` state (default: `["ALL"]`)
- Added `updateSortBuckets()` function
- Updated `clearSort()` to reset buckets to `["ALL"]`
- Syncs with store preferences on load
- Saves to backend on change

---

### 3. Sorting Logic

#### `app/utils/queryFilters.ts`

- Updated `sortQueriesForBucket()` to accept `sortBuckets` parameter
- Logic:
  - If `sortBuckets` includes "ALL" → apply custom sort to all buckets
  - If `sortBuckets` includes specific bucket → apply custom sort to that bucket
  - Otherwise → use bucket's default sort field
- Fallback: If custom field missing, uses bucket default

#### `app/dashboard/page.tsx`

- Updated `applySorting()` helper to pass `sortBuckets` to sorting function
- Passes `sortBuckets` state to `CollapsibleFilterBar`

---

### 4. UI Components

#### `app/components/CollapsibleFilterBar.tsx`

**Desktop View:**

- Added bucket multi-select dropdown next to sort controls
- Shows "Apply to: All" or "Apply to: X buckets"
- Hover dropdown with checkboxes for each bucket (A-H)
- "All Buckets" checkbox at top
- Selecting "All" disables individual bucket checkboxes

**Mobile View (Drawer):**

- Added "Apply Sort To" section
- "All Buckets" checkbox
- Grid layout (4 columns) for individual bucket checkboxes
- Same logic as desktop

**Features:**

- Toggle individual buckets on/off
- Selecting "All" overrides individual selections
- Deselecting all buckets auto-selects "All"
- Visual feedback for selected buckets

---

### 5. API Integration

#### `app/api/preferences/route.ts`

- Updated to handle column H (SortBuckets)
- Converts array to comma-separated string for storage
- Handles "ALL" as special value
- Reads and writes to `Preferences!A:H`

---

## Google Sheets Update Required

### Preferences Sheet Structure

Add new column H to the Preferences sheet:

```
A: User Email
B: Preferred View
C: Bucket Order
D: User Order
E: Detail View
F: Sort Field
G: Sort Ascending
H: Sort Buckets  ← NEW COLUMN
```

**Column H Values:**

- `ALL` = Apply custom sort to all buckets (default)
- `A,B,C` = Apply custom sort only to buckets A, B, and C
- Empty = Treated as "ALL"

---

## User Flow

### Setting Custom Sort with Bucket Selection

1. User selects sort field (e.g., "Proposal Sent")
2. User clicks "Apply to:" dropdown
3. User unchecks "All Buckets"
4. User selects specific buckets (e.g., C, D, E)
5. Custom sort applies only to selected buckets
6. Other buckets use their default sort

### Resetting Sort

1. User clicks "✕ Reset" button
2. Sort field clears
3. Sort direction resets to "Newest first"
4. Sort buckets reset to "ALL"
5. All buckets use their default sort fields

---

## Sorting Behavior Examples

### Example 1: Sort by "Assigned Date" for Buckets B, C, D

**Configuration:**

- Sort Field: Assignment Date Time
- Sort Buckets: B, C, D
- Sort Direction: Newest first

**Result:**

- Bucket A: Sorted by Added Date (default)
- Bucket B: Sorted by Assignment Date (custom)
- Bucket C: Sorted by Assignment Date (custom, falls back to Proposal Sent if missing)
- Bucket D: Sorted by Assignment Date (custom, falls back to Proposal Sent if missing)
- Bucket E: Sorted by SF Entry Date (default)
- Bucket F: Sorted by SF Entry Date (default)
- Bucket G: Sorted by Discarded Date (default)
- Bucket H: Sorted by Delete Requested Date (default)

### Example 2: Sort by "Proposal Sent" for All Buckets

**Configuration:**

- Sort Field: Proposal Sent Date Time
- Sort Buckets: ALL
- Sort Direction: Oldest first

**Result:**

- All buckets sorted by Proposal Sent Date (oldest first)
- If Proposal Sent Date missing, falls back to bucket default

---

## Technical Details

### Bucket Selection Logic

```typescript
const toggleBucket = (bucket: string) => {
  if (bucket === "ALL") {
    onSortBucketsChange(["ALL"]);
  } else {
    const currentBuckets = sortBuckets.includes("ALL") ? [] : sortBuckets;

    if (currentBuckets.includes(bucket)) {
      // Remove bucket
      const newBuckets = currentBuckets.filter((b) => b !== bucket);
      onSortBucketsChange(newBuckets.length === 0 ? ["ALL"] : newBuckets);
    } else {
      // Add bucket
      onSortBucketsChange([...currentBuckets, bucket]);
    }
  }
};
```

### Sort Application Logic

```typescript
const applyCustomSort =
  customSortField &&
  sortBuckets &&
  (sortBuckets.includes("ALL") || sortBuckets.includes(bucketKey));

const sortField = applyCustomSort ? customSortField : defaultField;
```

---

## Testing Checklist

### Bucket Selection

- [ ] "All Buckets" checkbox selects all
- [ ] Individual bucket checkboxes work
- [ ] Selecting "All" disables individual checkboxes
- [ ] Deselecting all auto-selects "All"
- [ ] Selection persists across page refresh

### Sorting Behavior

- [ ] Custom sort applies to selected buckets only
- [ ] Non-selected buckets use default sort
- [ ] Fallback to default works when field missing
- [ ] Sort direction toggle works
- [ ] Reset button clears all custom settings

### Persistence

- [ ] Bucket selection saves to Google Sheets column H
- [ ] Loads correctly on page refresh
- [ ] Works across different users
- [ ] Handles empty/missing values gracefully

### UI/UX

- [ ] Desktop dropdown shows/hides on hover
- [ ] Mobile drawer shows bucket selection
- [ ] Visual feedback for selected buckets
- [ ] Tooltip shows current selection
- [ ] Responsive on all screen sizes

---

## Files Modified

1. `app/utils/sheets.ts` - Added SortBuckets to Preferences
2. `app/config/sheet-constants.ts` - Updated range to A:H
3. `app/hooks/useDashboardPreferences.ts` - Added sortBuckets state
4. `app/utils/queryFilters.ts` - Updated sorting logic
5. `app/dashboard/page.tsx` - Pass sortBuckets to components
6. `app/components/CollapsibleFilterBar.tsx` - Added bucket multi-select UI
7. `app/api/preferences/route.ts` - Handle column H

---

## Next Steps

1. **Update Google Sheets:**
   - Add column H header: "Sort Buckets"
   - Existing rows will default to empty (treated as "ALL")

2. **Test the feature:**
   - Select different bucket combinations
   - Verify sorting behavior
   - Test persistence across sessions
   - Check mobile responsiveness

3. **User Documentation:**
   - Add tooltip explaining bucket selection
   - Consider adding help text in UI
   - Document in user guide

---

## Status: ✅ READY FOR TESTING

All code changes complete. Requires Google Sheets column H to be added.
