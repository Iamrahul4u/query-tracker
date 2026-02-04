# Implementation Plan – Query Tracker (Consolidated)

## Goal
Implement all requirements from the meeting transcripts (24th Jan, 26th Jan, 1st Feb) plus client clarifications.

---

## Phase 1: Data Models

#### [MODIFY] [sheets.ts](file:///c:/Users/ereny/Desktop/clients/query-tracker/app/utils/sheets.ts)
- Add `deletedDateTime`, `deleteApprovedBy`, `deleteRejected`, `previousStatus` to `Query` interface.
- Add `displayName` to `User` interface.

---

## Phase 2: Single-Row Default View

#### [MODIFY] [QueryCardCompact.tsx](file:///c:/Users/ereny/Desktop/clients/query-tracker/app/components/QueryCardCompact.tsx)
- Single row: `[Description (~50 chars)] [Display Name] [Primary Date] [Actions on Hover]`.
- Actions: Small icons, visible **only on hover**.
- Show **"Del-Rej"** indicator if `deleteRejected` is true.

#### [NEW] [DetailViewToggle.tsx](file:///c:/Users/ereny/Desktop/clients/query-tracker/app/components/DetailViewToggle.tsx)
- Toggle for Default View ↔ Detail View (saved in preferences).

---

## Phase 3: Per-Bucket Sorting

#### [MODIFY] [sheet-constants.ts](file:///c:/Users/ereny/Desktop/clients/query-tracker/app/config/sheet-constants.ts)
- Add `defaultSortField` to each bucket config.
- Add **Bucket H** config.

#### [MODIFY] [queryFilters.ts](file:///c:/Users/ereny/Desktop/clients/query-tracker/app/utils/queryFilters.ts)
- Apply custom sort as **secondary sort** within primary default sort.

#### [NEW] Custom Sort UI
- **Sort By** dropdown + **Apply To** multi-select.
- **"Remove Sort"** button to clear and revert to defaults.
- Persist to user preferences.

---

## Phase 4: Assign Button Rework

#### [MODIFY] [QueryCardCompact.tsx](file:///c:/Users/ereny/Desktop/clients/query-tracker/app/components/QueryCardCompact.tsx)
- **Junior**: Single "Self Assign" (instant).
- **Senior/Admin**: "Self Assign" + "Assign" (inline picklist).

---

## Phase 5: Bucket H – Deletion Workflow

#### [MODIFY] Backend
- Add status "H" transitions.
- Store `previousStatus` before moving to H.
- On rejection: return to `previousStatus`, set `deleteRejected = true`.

#### [MODIFY] [QueryCardCompact.tsx](file:///c:/Users/ereny/Desktop/clients/query-tracker/app/components/QueryCardCompact.tsx)
- In Bucket H: **✓ (approve)** and **✗ (reject)** buttons for Admins.

---

## Phase 6: GM Indicator

#### [MODIFY] [EditQueryModal.tsx](file:///c:/Users/ereny/Desktop/clients/query-tracker/app/components/EditQueryModal.tsx)
- Show GM checkbox when status → E or F (any source).
- **E→F**: Default to last value, allow change.
- First E/F: Default unchecked.

---

## Phase 7: Header Totals

#### [MODIFY] [DashboardHeader.tsx](file:///c:/Users/ereny/Desktop/clients/query-tracker/app/components/DashboardHeader.tsx)
- Layout: `A | B | C | D | E | F | [TOTAL] | G | H`.
- Total = A+B+C+D+E+F (bold).

---

## Phase 8: Load +7 Days

#### [MODIFY] [BucketViewLinear.tsx](file:///c:/Users/ereny/Desktop/clients/query-tracker/app/components/BucketViewLinear.tsx)
- Button at **bottom** of F, G, H.
- Expand: 3 → 10 → 17 → 24 days...

---

## Phase 9: Add Query Enhancements

#### [MODIFY] [AddQueryModal.tsx](file:///c:/Users/ereny/Desktop/clients/query-tracker/app/components/AddQueryModal.tsx)
- Input line (2 lines, 200 chars, counter).
- "Allocate To" picklist → goes to B.
- "+" for multi-add (same user).

---

## Phase 10: Linear View – 3-Bucket Rows

#### [MODIFY] [BucketViewLinear.tsx](file:///c:/Users/ereny/Desktop/clients/query-tracker/app/components/BucketViewLinear.tsx)
- Row 1: A + B + C
- Row 2: D + E + F
- Row 3: G + H
- Default 3 columns.

---

## Phase 11: Audit Modal Edits

#### [MODIFY] [EditQueryModal.tsx](file:///c:/Users/ereny/Desktop/clients/query-tracker/app/components/EditQueryModal.tsx)
- Editable: **Date fields**, **Query Description**.
- **Edited values shown in different color**.

---

## Verification Plan

1. Add Display Name → Verify on cards.
2. Toggle Default/Detail View.
3. Junior self-assign → Instant.
4. Senior assign → Two buttons + picklist.
5. Delete → Moves to H with "P.A.".
6. Admin reject → Returns to previous bucket with "Del-Rej".
7. E→F → GM checkbox defaults to last value.
8. Custom sort + Remove Sort button.
9. Load +7 Days → Older queries appear.
10. Edit date in modal → Shows in different color.
