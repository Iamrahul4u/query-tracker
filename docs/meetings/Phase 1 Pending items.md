# Phase 1 Pending Items

> Chat discussion: Feb 9-10, 2026

---

## 1. Bucket Segregation (Bucket View Only)

Segregation splits a selected bucket into **sub-columns by query type**.

- **Scope**: Bucket View only (not User View)
- **Available for**: All buckets (A-H)
- **Selection**: Multi-select — can segregate multiple buckets at once
- **Sub-bucket naming**: Full bucket name + type (e.g., "A) Pending Assignment - New")
- **Filters**: All existing filters apply (default/linear, compact/detail, sorting)

### Example: Segregating A + B
```
[A-SEO Query] [A-New] [A-Ongoing]  [B-SEO Query] [B-New] [B-Already Allocated]  [C] [D] ...
```
Non-segregated buckets remain as single columns.

---

## 2. "Already Allocated" Pseudo-Type (Bucket B Only)

- **Condition**: `Assignment Date Time < today 00:00 IST`
- **Applies to**: Bucket B (Pending Proposal) only
- **Display**: Own sub-bucket when B is segregated (NOT also in original type)
- **Not a sheet column** — frontend-calculated only
- **Position**: TBD — beginning or end of type order?

---

## 3. User View: Two-Level Grouping

> "If Bucket selected then grouping by Bucket → Type. If Type selected then grouping by Type → Bucket."

### Current behavior (flat):
- `groupBy = "bucket"`: Shows bucket headers with flat query list
- `groupBy = "type"`: Shows type headers with flat query list

### Required behavior (nested):
- `groupBy = "bucket"`: Bucket header → Type sub-headers → queries
- `groupBy = "type"`: Type header → Bucket sub-headers → queries

### Example: Type → Bucket
```
[New]
  ├── B) Pending Proposal: Query 1, Query 2
  └── D) Sent Partially: Query 3, Query 4
[SEO Query]
  └── B) Pending Proposal: Query 5
```

- "Already Allocated" logic applies within Bucket B sub-groups

---

## 4. Deleted/Discarded Visibility for Juniors (24hr)

- **Scope**: Junior users only
- **Condition**: Query in G or H AND delete approved by admin
- **Rule**: Visible for 24 hours after approval, then hidden for juniors
- **Seniors/Admins**: See all deleted/discarded queries as before

---

## 5. User View: Bucket A (Unassigned) Position

- **Problem**: Unassigned queries get lost from User View
- **Fix**: Show Bucket A as a fixed column at the **leftmost position**
- User-specific columns start from the next position

---

## 6. User View: Remove Redundant Name Initials Icons

- Remove circular initials avatar from User View cards (redundant since view is already per-user)
- Alternative: Display useful info instead (e.g., bucket label, days since assignment) — TBD

---

## 7. Detail View: Remarks in 2nd Row

- Show Remarks on 2nd row of query card in detail view
- Truncate to ~25 characters
- Show full text on hover (tooltip)

---

## Files to Modify

| File | Items |
|------|-------|
| `queryFilters.ts` | #1, #2, #3 — grouping helpers, `isAlreadyAllocated()` |
| `BucketView.tsx` | #1 — segregation columns |
| `BucketViewLinear.tsx` | #1 — segregation in linear |
| `UserViewLinear.tsx` | #3, #5, #6 — nested grouping, Bucket A, remove initials |
| `UserViewDefault.tsx` | #3, #5, #6 — same |
| `UserExpandModal.tsx` | #3 — nested grouping |
| `CollapsibleFilterBar.tsx` | #1 — segregation selector UI |
| `sheet-constants.ts` | #2 — "Already Allocated" config |
| `QueryCardCompact.tsx` | #6, #7 — remove initials, remarks row |
| `dashboard/page.tsx` | #4 — 24hr visibility filter for juniors |
