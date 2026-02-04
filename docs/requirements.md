# Requirements from Meeting Transcripts (Final)

This document consolidates all requirements from meeting transcripts (24th Jan, 26th Jan, 1st Feb) plus client clarifications (A-J).

---

## 1. Two View Modes

### Default View (Single Row)
One query = one row with:
1. **Query Description** (max 50 chars visible; full text on hover)
2. **Display Name** (max 5-6 chars; truncate if longer; fallback to first name)
3. **Primary Date** for the bucket
4. **Action Buttons** (small icons) – Visible **only on hover**

### Detail View (Two Rows)
Toggle-enabled. When ON:
- **Row 1**: Query Description, Display Name, Action Buttons (on hover)
- **Row 2**: All applicable dates (color-coded, tooltip shows date type)

---

## 2. View Types

### Bucket View (Status-wise)
Default view. Queries grouped by status bucket (A-H).

### User View (CS-wise)
Queries grouped by assigned user (columns = users).
- Same view modes apply (Default/Detail)
- Same sorting, filtering, action behavior as Bucket View
- Linear layout: Users as horizontal columns
- **Seniors/Admins only** (Juniors see only their own queries)

---

## 3. Bucket-Wise Dates & Sorting

### Dates per Bucket

| Bucket | Name | Dates (First = Primary) |
|--------|------|-------------------------|
| A | Pending (Unassigned) | Added Date |
| B | Pending Proposal | Assigned Date, Added Date |
| C | Proposal Sent | Proposal Sent Date, Assigned Date, Added Date |
| D | Proposal Sent Partially | Proposal Sent Date, Assigned Date, Added Date |
| E | Partial Proposal + In SF | SF Entry Date, Proposal Sent Date, Assigned Date, Added Date |
| F | Full Proposal + In SF | SF Entry Date, Proposal Sent Date, Assigned Date, Added Date |
| G | Discarded | Discarded Date, Assigned Date (can be blank), Added Date |
| H | Deleted (Pending Approval) | Deleted Date, Assigned Date (can be blank), Added Date |

### Default Sorting

| Bucket | Default Sort Field |
|--------|-------------------|
| A | Added Date (Newest First) |
| B | Assigned Date |
| C | Proposal Sent Date |
| D | Proposal Sent Date |
| E | SF Entry Date |
| F | SF Entry Date |
| G | Discarded Date |
| H | Deleted Date |

### Custom Sorting
1. Select **Sort By** field
2. Select **Apply To Buckets** (multi-select, default = "All")
3. If bucket lacks selected field → uses default sort
4. Custom sort = **secondary sort** within primary
5. **Persists across sessions**
6. **"Remove Sort" button** to revert to defaults

---

## 4. Date Display Format

- **Today** → "Today"
- **Tomorrow** → "Tomorrow"
- **Other** → Exact date (e.g., "30/01/2026")

### Colors
- Match bucket header colors
- E & F share same color (SF Entry)
- G & H use their own bucket colors

---

## 5. Assign Button Behavior

### For Juniors
- **Single-click self-assign** (instant)

### For Seniors/Admins
- **Self Assign** button (instant)
- **Assign** button → Inline user picklist

### Query Type Change
- Done via **Edit modal** (not from compact row)

---

## 6. GM Indicator

- Checkbox appears when status → E or F
- **E→F**: Defaults to last value, user can change
- **First E/F**: Default unchecked
- Shows **"GM" badge** on card if checked

---

## 7. Add Query Flow

### Input Field
- **Input line** (not textarea)
- Max 200 characters with counter

### Fields
1. Query Description
2. Query Type (SEO, New, Ongoing) – default: New
3. **Allocate To** (optional) → Goes directly to Bucket B

### Multi-Add
- **"+"** button for same user
- Save → Reopen for different user

---

## 8. Users Sheet Schema

| Column | Status |
|--------|--------|
| Email | Existing |
| Name | Existing |
| Role | Existing |
| Display Order | Existing |
| Is Active | Existing |
| Display Name | **Added** (5-6 chars max; truncate if needed) |

---

## 9. Queries Sheet Schema

| Column | Status |
|--------|--------|
| Query ID | Existing |
| Query Description | Existing |
| Query Type | Existing |
| Status | Existing |
| Added By | Existing |
| Added Date Time | Existing |
| Assigned To | Existing |
| Assigned By | Existing |
| Assignment Date Time | Existing |
| Remarks | Existing |
| Proposal Sent Date Time | Existing |
| Whats Pending | Existing |
| Entered In SF Date Time | Existing |
| Event ID in SF | **Renamed** (optional, shown in E/F modal) |
| Event Title in SF | **Renamed** (optional, shown in E/F modal) |
| Discarded Date Time | Existing |
| GmIndicator | Existing |
| Deleted Date Time | **Added** |
| Delete Approved By | **Added** |
| Delete Rejected | **NEW** |
| Previous Status | **NEW** |
| Last Edited Date Time | Existing |
| Last Edited By | Existing |
| Last Activity Date Time | Existing |

---

## 10. Header Totals

**Layout**: `A | B | C | D | E | F | [TOTAL] | G | H`

- Total = A+B+C+D+E+F (bold, excludes G/H)

---

## 11. Evaporation & Load +7 Days

| Bucket | Evaporation Date |
|--------|------------------|
| F | SF Entry Date |
| G | Discarded Date |
| H | Deleted Date |

- Default: Last 3 days visible
- **Load +7 Days** button at bottom of F, G, H
- Expands: 3 → 10 → 17 → 24 days...

---

## 12. Bucket H – Deletion Workflow

1. Delete → Moves to H with "P.A." status
2. Admin sees ✓ (approve) and ✗ (reject) buttons
3. Evaporation starts only after approval

### On Rejection
- Returns to **previous bucket** (`Previous Status`)
- Shows **"Del-Rej"** indicator

### Backward Status Movement
- Permitted per user role rights

---

## 13. Linear View

### Row Grouping (3 Buckets Per Row)
- Row 1: A + B + C
- Row 2: D + E + F
- Row 3: G + H

### Character Limits
| Element | Limit |
|---------|-------|
| Query Description | 50 chars (full on hover) |
| Display Name | 5-6 chars (truncate) |

### Synchronized Scrolling
- Scroll syncs all buckets in same row
- Default: 3 columns (user can customize 2-4)

---

## 14. User View (CS-wise)

- Users as columns (instead of buckets)
- Buckets A-H grouped under each user
- Same Default/Detail view modes
- Same sorting, filtering, actions
- Linear layout: Horizontal user columns
- **Seniors/Admins only**

---

## 15. Query Grouping Order

Within each bucket:
1. SEO
2. New
3. Ongoing

---

## 16. Audit Trail Modal

- Accessible from all views
- Shows: Added By, Assigned By, Last Status Change, Last Edited (with Date/Time)

### Editable Fields
- Date fields (respective to bucket)
- Query Description
- **Edited values shown in different color**

---

## 17. Scalability

- Supports 12 → 50+ users
- User View: Horizontal scroll or filter dropdown for many users

---

## 18. Field Label Customization (Post-Delivery)

- **Config file** (`labels.config.ts`) managed by developer
- Client requests changes via developer only (not self-editable)

---

## 19. Auto-Logout Issue

Investigate and fix reported automatic logouts.
