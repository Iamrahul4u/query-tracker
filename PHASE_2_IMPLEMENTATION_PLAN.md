# Phase 2 Implementation Plan - Query Tracker Enhancement

**Date:** January 28, 2026  
**Status:** Planning  
**Priority:** High

---

## Overview

This document outlines the next phase of improvements for the Query Tracker application based on user feedback, FRD requirements, and meeting discussions.

---

## 🎯 Priority Features (Phase 2A - Week 1)

### 1. **GM Indicator Enhancement**

**Current State:** Manual checkbox exists but icon not showing properly  
**Required Changes:**

- Add "GM Indicator" checkbox in AddQueryModal
- Add "GM Indicator" checkbox in EditQueryModal
- Show Gmail icon (✉️) next to query title when GM Indicator is checked
- Only show for queries in Buckets E & F
- Icon should be red color (#ea4335) to stand out

**Files to Modify:**

- `web-app/app/components/AddQueryModal.tsx` - Add checkbox
- `web-app/app/components/EditQueryModal.tsx` - Add checkbox
- `web-app/app/components/QueryCardCompact.tsx` - Show icon conditionally
- `web-app/app/utils/sheets.ts` - Ensure GM Indicator field in Query type

**Implementation Steps:**

1. Add checkbox UI in both modals (below Query Type selection)
2. Update form state to include gmIndicator boolean
3. Pass gmIndicator to API on create/update
4. Update QueryCardCompact to show ✉️ icon when gmIndicator is true AND status is E or F
5. Test: Create query with GM checked → Move to E → Icon appears

---

### 2. **Auto-Refresh Background Polling**

**Current State:** Manual refresh only  
**Required Changes:**

- Implement background polling every 30 seconds
- Fetch latest data without user interaction
- Update UI seamlessly without interrupting user
- Show subtle indicator when data is being refreshed
- Pause polling when user is editing/interacting with modals

**Files to Modify:**

- `web-app/app/hooks/useAutoRefresh.ts` - Create new hook
- `web-app/app/dashboard/page.tsx` - Integrate auto-refresh
- `web-app/app/stores/queryStore.ts` - Add silent refresh method

**Implementation Steps:**

1. Create `useAutoRefresh` hook with configurable interval (default 30s)
2. Use `setInterval` to trigger background fetch
3. Add `refreshQueries()` method to queryStore that updates without loading state
4. Pause polling when modal is open (track modal state)
5. Show small sync icon in header during refresh (optional)
6. Resume polling when modal closes
7. Clear interval on component unmount

**Technical Approach:**

```typescript
// useAutoRefresh.ts
export function useAutoRefresh(intervalMs = 30000) {
  const { refreshQueries, isModalOpen } = useQueryStore();

  useEffect(() => {
    if (isModalOpen) return; // Don't refresh during interaction

    const interval = setInterval(() => {
      refreshQueries(); // Silent background refresh
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isModalOpen, intervalMs]);
}
```

---

### 3. **Assignment UI Improvements**

**Current State:** Assignment flow unclear, no visual feedback  
**Required Changes:**

#### 3.1 Show Current Assignment Status

- Display assigned user name on query card
- Show checkmark (✓) next to currently assigned user in dropdown
- Change button text: "Assign" → "Reassign" if already assigned

#### 3.2 One-Step Assignment

- Replace multi-step flow with single dropdown
- Show user list with current assignment highlighted
- Click user → Immediate assignment with toast confirmation

#### 3.3 Icons Instead of Text Buttons

- Replace "Assign" text with icon: 👤 (person icon)
- Replace "Edit" text with icon: ✏️ (pencil icon)
- Show tooltips on hover
- More compact, saves space

#### 3.4 Toast Notifications

- "✓ Successfully assigned to [User Name]"
- "✓ Successfully reassigned to [User Name]"
- "✓ Query updated successfully"
- "✗ Assignment failed. Please try again."

**Files to Modify:**

- `web-app/app/components/QueryCardCompact.tsx` - Add icons, show assigned user
- `web-app/app/components/QueryDetailModal.tsx` - Improve assignment UI
- `web-app/app/stores/queryStore.ts` - Add toast state management
- Create `web-app/app/components/Toast.tsx` - New toast component

**Implementation Steps:**

1. Create Toast component with auto-dismiss (3 seconds)
2. Add toast state to queryStore (message, type, visible)
3. Replace text buttons with icon buttons in QueryCardCompact
4. Add assigned user display below query description
5. Update assignment dropdown to show checkmark for current assignee
6. Change button label based on assignment status
7. Show toast on successful assignment/reassignment
8. Test all assignment scenarios

---

### 4. **Dynamic Column Count Selection**

**Current State:** Fixed 4 columns, breaks at 80% zoom  
**Required Changes:**

- Add dropdown in filter bar: "Columns: [2] [3] [4] [5] [6] [7]"
- Make layout responsive to column count
- Save user preference
- Default: 4 columns
- Max: 7 columns
- Handle zoom levels gracefully

**Files to Modify:**

- `web-app/app/components/CollapsibleFilterBar.tsx` - Add column selector
- `web-app/app/hooks/useDashboardPreferences.ts` - Save column preference
- `web-app/app/dashboard/page.tsx` - Pass column count to views
- `web-app/app/components/BucketViewLinear.tsx` - Use dynamic columns
- `web-app/app/components/BucketViewDefault.tsx` - Use dynamic columns

**Implementation Steps:**

1. Add column count state to dashboard preferences (default: 4)
2. Add dropdown in CollapsibleFilterBar (2-7 options)
3. Update grid classes dynamically: `grid-cols-${columnCount}`
4. Save preference to localStorage on change
5. Test at different zoom levels (80%, 90%, 100%, 110%)
6. Ensure buckets distribute evenly across columns

**UI Design:**

```
[View: Bucket ▼] [Layout: Default ▼] [Columns: 4 ▼] [Filter: All ▼]
```

---

### 5. **User View Enhancement - Match Bucket View**

**Current State:** User view doesn't show status buckets properly  
**Required Changes:**

- Show bucket status with format: "A) Pending (Unassigned)"
- Apply same fixed height + scroll behavior as Bucket View
- Use same header styling
- Group queries by Query Type within each user
- Apply same linear/default view modes

**Files to Modify:**

- `web-app/app/components/UserView.tsx` - Complete rewrite to match BucketView structure
- Create `web-app/app/components/UserColumn.tsx` - Similar to BucketColumn
- `web-app/app/components/BucketViewLinear.tsx` - Extract shared logic

**Implementation Steps:**

1. Create UserColumn component (similar to BucketColumn)
2. Show user name as header with query count
3. Inside each user column, show queries grouped by status
4. Each status group shows: "A) Pending (Unassigned)" format
5. Apply fixed height: `h-[calc(100vh-220px)]`
6. Enable internal scrolling
7. Group queries by Query Type (SEO query → New → Ongoing)
8. Support both Default and Linear view modes
9. Apply same scroll synchronization in Linear mode

**Structure:**

```
┌─────────────────────────────────┐
│ John's Queries (12)             │ ← Header
├─────────────────────────────────┤
│ A) Pending (Unassigned)         │ ← Status group
│   SEO query                     │ ← Type subgroup
│   - Query 1                     │
│   - Query 2                     │
│   New                           │
│   - Query 3                     │
│                                 │
│ B) Pending Proposal             │
│   Ongoing                       │
│   - Query 4                     │
│   ...                           │
└─────────────────────────────────┘
```

---

## 🎯 Priority Features (Phase 2B - Week 2)

### 6. **Collapsible Filter Bar**

**Current State:** Always visible, takes vertical space  
**Required Changes:**

- Add collapse/expand button (chevron icon)
- Animate collapse smoothly
- Save collapsed state to preferences
- Recalculate bucket heights when collapsed

**Files to Modify:**

- `web-app/app/components/CollapsibleFilterBar.tsx` - Add collapse logic
- `web-app/app/dashboard/page.tsx` - Adjust layout based on collapsed state
- `web-app/app/components/BucketViewDefault.tsx` - Update height calculation
- `web-app/app/components/BucketViewLinear.tsx` - Update height calculation

**Implementation:**

```typescript
// When collapsed: h-[calc(100vh-120px)] (only header visible)
// When expanded: h-[calc(100vh-220px)] (header + filters)
```

---

### 7. **Full-Width Layout**

**Current State:** Fixed width containers  
**Required Changes:**

- Remove max-width constraints
- Use full viewport width
- Add padding only on edges (px-4)
- Buckets expand to fill available space

**Files to Modify:**

- `web-app/app/dashboard/page.tsx` - Remove container width limits
- `web-app/app/globals.css` - Update container styles

---

### 8. **Audit Trail Display**

**Current State:** Not visible in UI  
**Required Changes:**

- Show in QueryDetailModal only (not on cards)
- Display at bottom of modal:
  - Added by: [Name] on [Date Time]
  - Assigned by: [Name] on [Date Time]
  - Last status change by: [Name] on [Date Time]
  - Last edited by: [Name] on [Date Time]
- Use subtle gray text, small font
- Collapsible section: "View History ▼"

**Files to Modify:**

- `web-app/app/components/QueryDetailModal.tsx` - Add audit trail section
- `web-app/app/utils/sheets.ts` - Ensure audit fields in Query type

---

### 9. **Delete Query - Optimistic UI**

**Current State:** May not remove from UI immediately  
**Required Changes:**

- Remove query from UI instantly on delete
- Show toast: "Query deleted successfully"
- Rollback if API fails
- Show undo option in toast (5 seconds)

**Files to Modify:**

- `web-app/app/stores/queryStore.ts` - Add optimistic delete
- `web-app/app/components/QueryDetailModal.tsx` - Handle delete action

---

### 10. **Time-Based Visibility (Evaporation)**

**Current State:** All queries shown regardless of age  
**Required Changes:**

- Bucket E & F: Show only last 7 days by default
- Bucket G: Show only last 3 days by default
- Add "Show older" button to expand in 7-day windows
- Filter based on relevant date field:
  - E/F: Use "Proposal Sent Date Time"
  - G: Use "Discarded Date Time"

**Files to Modify:**

- `web-app/app/utils/queryFilters.ts` - Add date filtering logic
- `web-app/app/dashboard/page.tsx` - Apply filters
- `web-app/app/components/BucketColumn.tsx` - Add "Show older" button

---

## 📋 Implementation Order

### Week 1 (Phase 2A)

**Day 1-2:**

1. GM Indicator Enhancement (2-3 hours)
2. Toast Notification System (2-3 hours)

**Day 3-4:** 3. Assignment UI Improvements (4-5 hours)

- Icons instead of text
- Show current assignment
- One-step reassignment

**Day 5:** 4. Dynamic Column Count (3-4 hours)

**Day 6-7:** 5. Auto-Refresh Background Polling (4-5 hours) 6. User View Enhancement (6-8 hours)

### Week 2 (Phase 2B)

**Day 1-2:** 7. Collapsible Filter Bar (3-4 hours) 8. Full-Width Layout (2-3 hours)

**Day 3-4:** 9. Audit Trail Display (4-5 hours) 10. Delete Query Optimistic UI (2-3 hours)

**Day 5:** 11. Time-Based Visibility (4-5 hours)

**Day 6-7:** 12. Testing, bug fixes, polish

---

## 🧪 Testing Checklist

### GM Indicator

- [ ] Checkbox appears in Add Query modal
- [ ] Checkbox appears in Edit Query modal
- [ ] Icon shows for E/F buckets when checked
- [ ] Icon doesn't show for other buckets
- [ ] Icon doesn't show when unchecked

### Auto-Refresh

- [ ] Data refreshes every 30 seconds
- [ ] No loading spinner during background refresh
- [ ] Polling pauses when modal is open
- [ ] Polling resumes when modal closes
- [ ] No memory leaks (interval cleared on unmount)

### Assignment

- [ ] Icons show instead of text buttons
- [ ] Assigned user name displays on card
- [ ] Checkmark shows for current assignee in dropdown
- [ ] Button says "Reassign" when already assigned
- [ ] Toast shows on successful assignment
- [ ] Toast shows on failed assignment

### Dynamic Columns

- [ ] Dropdown shows options 2-7
- [ ] Layout updates immediately on selection
- [ ] Preference saves to localStorage
- [ ] Works at 80% zoom
- [ ] Works at 110% zoom
- [ ] Buckets distribute evenly

### User View

- [ ] Shows status format: "A) Pending (Unassigned)"
- [ ] Fixed height with internal scroll
- [ ] Groups by Query Type
- [ ] Linear mode syncs scroll
- [ ] Default mode independent scroll

---

## 📊 Success Metrics

- **Performance:** Auto-refresh completes in <500ms
- **UX:** Assignment takes 1 click (down from 3+)
- **Space:** Collapsible filter saves 100px vertical space
- **Responsiveness:** Works smoothly at 80-110% zoom
- **Consistency:** User View matches Bucket View behavior

---

## 🚀 Deployment Plan

1. **Development:** Complete all features in feature branch
2. **Testing:** Test each feature individually
3. **Integration Testing:** Test all features together
4. **User Acceptance:** Demo to stakeholders
5. **Production:** Deploy to production environment
6. **Monitoring:** Monitor for issues in first 48 hours

---

## 📝 Notes

- **No Gmail Integration:** Just open web app directly (no extension needed for now)
- **Mobile View:** Deferred to Phase 3
- **Google Sheets Bird's Eye View:** Deferred to Phase 3
- **Role-Based Permissions:** Already implemented, needs verification

---

## 🔗 Related Documents

- [FRD Document](../frddocs.txt)
- [Meeting Transcript](../meetingtranscript%2026thjan.txt)
- [Architecture Analysis](./ARCHITECTURE_ANALYSIS.md)
- [Bucket View Scroll Fix](./BUCKET_VIEW_SCROLL_FIX.md)

---

**Last Updated:** January 28, 2026  
**Next Review:** After Phase 2A completion
