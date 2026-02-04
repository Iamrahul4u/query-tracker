# Phase 1-3 Implementation Analysis

**Date:** February 4, 2026  
**Analysis:** First three phases of Query Tracker implementation

---

## PHASE 1: Data Models ✅ COMPLETE

### Requirements

- [x] Add `deletedDateTime`, `deleteApprovedBy`, `deleteRejected`, `previousStatus` to Query
- [x] Add `displayName` to User

### Implementation Status: **COMPLETE**

**File: `app/utils/sheets.ts`**

✅ **Query Interface:**

```typescript
"Previous Status"?: string;           // Status before moving to H
"Delete Approved By"?: string;        // Admin who approved deletion
"Delete Approved Date Time"?: string; // When deletion was approved
"Delete Rejected"?: string;           // "true" if deletion was rejected
```

✅ **User Interface:**

```typescript
"Display Name"?: string; // 5-6 char short name for compact view
```

**Note:** The field names differ slightly from requirements:

- Requirement: `deletedDateTime` → Implemented: `Delete Requested Date Time` (already existed)
- Requirement: `deleteApprovedBy` → Implemented: `Delete Approved By` ✅
- Additional field added: `Delete Approved Date Time` (good addition)
- Requirement: `deleteRejected` → Implemented: `Delete Rejected` ✅
- Requirement: `previousStatus` → Implemented: `Previous Status` ✅

**Verdict:** ✅ All required fields present and functional

---

## PHASE 2: Single-Row Default View ⚠️ MOSTLY COMPLETE

### Requirements

- [x] Redesign `QueryCardCompact` to single row (~50 char description)
- [x] Actions visible on hover only
- [x] Use Display Name (fallback to first name)
- [x] Add "Del-Rej" indicator
- [~] Add Detail View toggle

### Implementation Status: **MOSTLY COMPLETE**

**File: `app/components/QueryCardCompact.tsx`**

✅ **Single Row Layout:**

- Compact single-row design implemented
- Description truncates properly with full text on hover
- Actions (Assign, Edit, Approve/Reject) visible on hover only
- Clean, minimal design

✅ **Display Name:**

```typescript
{
  assignedUser["Display Name"] ||
    assignedUser.Name?.substring(0, 6) ||
    assignedUser.Email.split("@")[0];
}
```

- Uses Display Name first
- Falls back to first 6 chars of Name
- Final fallback to email username

✅ **Del-Rej Indicator:**

```typescript
{wasDeleteRejected && !isInBucketH && (
  <span className="px-1.5 py-0.5 text-[8px] font-semibold bg-orange-100 text-orange-700 rounded flex-shrink-0"
    title="Delete request was rejected">
    Del-Rej
  </span>
)}
```

✅ **P.A. Indicator (Bucket H):**

```typescript
{isInBucketH && (
  <span className="px-1.5 py-0.5 text-[8px] font-semibold bg-amber-100 text-amber-700 rounded flex-shrink-0"
    title={`Pending Approval - Delete requested by ${query["Delete Requested By"]}`}>
    P.A.
  </span>
)}
```

⚠️ **Detail View Toggle:**

- **Component accepts `detailView` prop** ✅
- **Layout changes based on prop** ✅
- **Toggle UI exists in CollapsibleFilterBar** ✅
- **State managed in dashboard** ✅
- **BUT: Not persisted to preferences** ❌

**File: `app/components/CollapsibleFilterBar.tsx`**

```typescript
const CardViewFilter = () => (
  <div className="flex items-center gap-1.5">
    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
      Card:
    </span>
    <div className="flex bg-gray-100 rounded-lg p-0.5">
      <button onClick={() => onDetailViewChange?.(false)}
        className={`px-2 py-1 text-[10px] font-medium rounded-md transition ${!detailView ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
        title="Single row per card (compact)">
        Compact
      </button>
      <button onClick={() => onDetailViewChange?.(true)}
        className={`px-2 py-1 text-[10px] font-medium rounded-md transition ${detailView ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
        title="Two rows per card with all dates">
        Detail
      </button>
    </div>
  </div>
);
```

**File: `app/dashboard/page.tsx`**

```typescript
const [detailView, setDetailView] = useState(false);
```

### Issues Found:

#### 🔴 ISSUE 1: Detail View Not Persisted

**Problem:** Detail view preference is stored in local state only, not persisted to user preferences.

**Expected:** Should be saved to Google Sheets Preferences like other settings.

**Fix Required:**

1. Add `DetailView` field to Preferences interface in `sheets.ts`
2. Add to `useDashboardPreferences` hook
3. Save/load from preferences

#### 🟡 ISSUE 2: Detail View Implementation Incomplete

**Problem:** The `detailView` prop changes layout in QueryCardCompact, but the two-row layout with "all applicable dates" is not fully implemented per requirements.

**Requirements say:**

> **Detail View (Two Rows)**
>
> - **Row 1**: Query Description, Display Name, Action Buttons (on hover)
> - **Row 2**: All applicable dates (color-coded, tooltip shows date type)

**Current implementation:**

- Row 1: Description + badges + assigned user
- Row 2: Only shows assigned user in detail mode (not all dates)

**Missing:** Row 2 should show ALL applicable dates for the bucket (color-coded).

---

## PHASE 3: Per-Bucket Sorting ✅ COMPLETE

### Requirements

- [x] Add `defaultSortField` to each bucket config
- [x] Add Bucket H configuration
- [x] Implement bucket-specific sorting
- [x] Custom sort as secondary sort
- [x] Persist custom sort to preferences
- [x] Add "Remove Sort" button

### Implementation Status: **COMPLETE**

**File: `app/config/sheet-constants.ts`**

✅ **Bucket H Configuration:**

```typescript
H: {
  name: "H) Deleted (Pending Approval)",
  description: "Delete requested, awaiting Admin approval",
  color: "#795548",
  defaultSortField: "Delete Requested Date Time",
  visibleFields: [
    "Query Description",
    "Query Type",
    "Delete Requested Date Time",
    "Delete Requested By",
    "Previous Status",
  ],
  evaporateAfterDays: 7,
}
```

✅ **Default Sort Fields for All Buckets:**
| Bucket | Default Sort Field | Matches Requirement |
|--------|-------------------|---------------------|
| A | Added Date Time | ✅ |
| B | Assignment Date Time | ✅ |
| C | Proposal Sent Date Time | ✅ |
| D | Proposal Sent Date Time | ✅ |
| E | Entered In SF Date Time | ✅ |
| F | Entered In SF Date Time | ✅ |
| G | Discarded Date Time | ✅ |
| H | Delete Requested Date Time | ✅ |

**File: `app/utils/queryFilters.ts`**

✅ **Sorting Function:**

```typescript
export function sortQueriesByDate(
  queries: Query[],
  dateField: DateFieldKey,
  ascending: boolean = true,
): Query[] {
  return [...queries].sort((a, b) => {
    const dateA = parseDate(a[dateField]);
    const dateB = parseDate(b[dateField]);

    // Handle missing dates - push to end
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    const diff = dateA.getTime() - dateB.getTime();
    return ascending ? diff : -diff;
  });
}
```

✅ **Applied in Dashboard:**

```typescript
const groupedByBucket = Object.fromEntries(
  Object.entries(groupedByBucketRaw).map(([bucket, queries]) => [
    bucket,
    sortQueriesByDate(queries, sortField, sortAscending),
  ]),
);
```

✅ **Sort UI in CollapsibleFilterBar:**

```typescript
const SortFilter = () => (
  <div className="flex items-center gap-1.5">
    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
      Sort:
    </span>
    <select value={sortField}
      onChange={(e) => onSortFieldChange?.(e.target.value as DateFieldKey)}
      className="px-2 py-1 text-[10px] font-medium rounded-md bg-gray-100 text-gray-700 border-0 focus:ring-1 focus:ring-blue-500">
      {DATE_FIELDS.map((f) => (
        <option key={f.value} value={f.value}>{f.label}</option>
      ))}
    </select>
    <button onClick={() => onSortAscendingChange?.(!sortAscending)}
      className="px-2 py-1 text-[10px] font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
      title={sortAscending ? "Oldest first" : "Newest first"}>
      {sortAscending ? "↑ Oldest" : "↓ Newest"}
    </button>
  </div>
);
```

### Issues Found:

#### 🟡 ISSUE 3: No "Remove Sort" Button

**Problem:** Requirements specify a "Remove Sort" button to revert to default bucket-specific sorting.

**Current:** User can change sort field and direction, but no way to reset to defaults.

**Expected:** A button that clears custom sort and applies default sort per bucket.

**Note:** This is a minor UX enhancement. Current implementation works but doesn't match spec exactly.

#### 🟡 ISSUE 4: Sort Not Applied Per-Bucket

**Problem:** Requirements say custom sort should be applied per-bucket with "Apply To Buckets" multi-select.

**Current:** Global sort applied to all buckets uniformly.

**Expected:**

- Select sort field
- Select which buckets to apply to (multi-select, default "All")
- If bucket lacks selected field → use default sort
- Custom sort = secondary sort within primary

**This is a more complex feature than currently implemented.**

#### 🟡 ISSUE 5: Sort Preferences Not Persisted

**Problem:** Sort field and direction are stored in local state only.

**Current:**

```typescript
const [sortField, setSortField] = useState<DateFieldKey>("Added Date Time");
const [sortAscending, setSortAscending] = useState(true);
```

**Expected:** Should be saved to Preferences sheet and loaded on return.

---

## SUMMARY

### Phase 1: Data Models

**Status:** ✅ **COMPLETE**

- All required fields added
- Proper TypeScript interfaces
- No issues

### Phase 2: Single-Row Default View

**Status:** ⚠️ **MOSTLY COMPLETE** (2 issues)

- ✅ Single-row compact design
- ✅ Hover-only actions
- ✅ Display Name with fallbacks
- ✅ Del-Rej indicator
- ✅ P.A. indicator
- ⚠️ Detail view toggle exists but not persisted
- ⚠️ Detail view Row 2 not showing all dates

### Phase 3: Per-Bucket Sorting

**Status:** ⚠️ **MOSTLY COMPLETE** (3 issues)

- ✅ Default sort fields configured
- ✅ Bucket H added
- ✅ Sorting function works
- ✅ Sort UI exists
- ⚠️ No "Remove Sort" button
- ⚠️ No per-bucket sort selection
- ⚠️ Sort preferences not persisted

---

## PRIORITY FIXES

### High Priority

1. **Persist Detail View to Preferences** (Phase 2)
2. **Persist Sort Preferences** (Phase 3)

### Medium Priority

3. **Implement Detail View Row 2 with All Dates** (Phase 2)
4. **Add "Remove Sort" Button** (Phase 3)

### Low Priority (Enhancement)

5. **Per-Bucket Sort Selection** (Phase 3 - complex feature)

---

## NEXT STEPS

Would you like me to:

1. Fix the high-priority issues (persistence)?
2. Implement the detail view Row 2 with all dates?
3. Add the "Remove Sort" button?
4. Move on to Phase 4-6 analysis?
