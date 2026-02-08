# Query Tracker - Master Specification

> **Last Updated:** February 8th, 2026  
> **Status:** Phase 1 Complete, Ready for Testing  
> **Next Milestone:** Go-Live February 10th, 2026

---

## Overview

The Query Tracker is a web application for managing sales queries through a workflow pipeline (Buckets A-H). This document consolidates all requirements from meetings held on 24th Jan, 26th Jan, 1st Feb, 5th Feb, and 7th Feb 2026.

---

## Bucket Workflow

| Bucket | Name | Primary Date Field | Default Sort |
|--------|------|-------------------|--------------|
| A | Pending (Unassigned) | Added Date | Newest First |
| B | Pending Proposal | Assigned Date | Newest First |
| C | Proposal Sent (Full) | Proposal Sent Date | Newest First |
| D | Proposal Sent (Partial) | Proposal Sent Date | Newest First |
| E | Partial Proposal + In SF | SF Entry Date | Newest First |
| F | Full Proposal + In SF | SF Entry Date | Newest First |
| G | Discarded | Discarded Date | Newest First |
| H | Deleted (Pending Approval) | Deleted Date | Newest First |

### Header Totals Layout
```
A | B | C | D | E | F | [TOTAL] | G | H
```
- Total = A+B+C+D+E+F (bold, excludes G/H)
- Clicking total opens AllQueriesModal with all queries grouped by bucket

---

## User Roles (RBAC)

| Role | Access Level | Permissions |
|------|--------------|-------------|
| Admin | Full | All features |
| Pseudo Admin | Full | Same as Admin |
| Senior | Full | Same as Admin |
| Junior | Limited | Own queries only, no approval rights |

### Role Check Pattern
```typescript
const role = (currentUser?.Role || "").toLowerCase();
const isAdminOrSenior = ["admin", "pseudo admin", "senior"].includes(role);
```

### Key Permission Differences

| Feature | Junior | Admin/Pseudo Admin/Senior |
|---------|--------|---------------------------|
| Add Query | ✅ | ✅ |
| Allocate To (on add) | ❌ | ✅ |
| Assign to Others | ❌ | ✅ |
| Edit Own Queries | ✅ | ✅ |
| Edit Any Query | ❌ | ✅ |
| Edit Assignment Date | ❌ | ✅ |
| Delete (Request) | ✅ | ✅ (Auto-Approved) |
| Approve/Reject Deletions | ❌ | ✅ |
| View Pending Deletions | ❌ | ✅ |
| User View | ❌ | ✅ |

---

## ✅ Completed Features (Phase 1)

### Core Functionality
- [x] Two view modes: Bucket View and User View
- [x] Linear view with synchronized scrolling
- [x] Expandable bucket view (4×8 matrix via count badge click)
- [x] Total count click opens AllQueriesModal with horizontal scroll
- [x] Query grouping by type: SEO Query → New → Ongoing → On Hold

### Add Query Modal
- [x] User dropdown inside modal with search
- [x] Last selected user persists across adds
- [x] Quick Save drafts to localStorage
- [x] Restore drafts on modal reopen
- [x] "On Hold" status type added to options

### Assign Dropdown
- [x] Position below button, right-aligned
- [x] Close on hover away
- [x] Scrollable with max-height
- [x] Search by name/email
- [x] Width increased for readability

### Assignment Workflow
- [x] "Assign To" field prominent in Edit Modal
- [x] Auto-select Bucket B when assigning from A
- [x] Block status change if unassigned (toast message)
- [x] One-click self-assign from cards

### Delete Workflow (Soft Delete)
- [x] Delete moves to Bucket H (never removes from sheet)
- [x] Stores "Previous Status" for rejection recovery
- [x] Admin sees ✓ (approve) and ✗ (reject) buttons
- [x] Rejection restores to previous bucket with "Del-Rej" indicator
- [x] "Delete Query" button text (not "Request Deletion")
- [x] Dual bucket display: pending deletions show grayed in original bucket + H

### Audit Trail
- [x] Delete Rejected By / Date Time fields
- [x] Remark Added By / Date Time fields
- [x] Remarks icon indicator on cards

### UI/UX
- [x] Remarks icon shows when query has remarks
- [x] P.A. indicator for pending approval (Bucket H and ghost queries)
- [x] Del-Rej indicator shows in ALL buckets
- [x] "Search Description" placeholder text
- [x] 80% zoom for better density at 100% browser zoom
- [x] Stats include H bucket in total count

### Optional Fields
- [x] Event ID and Event Title optional for E/F transitions

---

## 🔲 Pending Items (To Test/Fix)

### High Priority
- [ ] Cursor jumping in search bar when typing
- [ ] Count discrepancy verification (should match sheet exactly now)
- [ ] Approved deletions not showing in pending count (verify)

### Medium Priority
- [ ] Undo button for sorting (reset to default bucket sorting)
- [ ] Toggle for scroll direction in expanded modal (horizontal vs vertical)

---

## 📋 Phase 2 (Future Enhancements)

### Export & Reporting
- [ ] Manual export feature (Admin/Pseudo Admin only, Excel/CSV)
- [ ] Periodic email reports (Weekly, Friday 12 PM)
- [ ] Team assignment system for grouped reporting

### UI Enhancements
- [ ] Date display with hover overlay (action buttons over date)
- [ ] User View expand (click user count)
- [ ] Multi-select filters for Users and Buckets
- [ ] Sorting pin/save functionality
- [ ] Drag and drop for bucket transitions
- [ ] Resizable bucket heights

### Mobile
- [ ] Mobile responsive design (excluded from Phase 1)

---

## Google Sheet Schema

### Queries Sheet (Columns A-AD)
| Column | Field | Notes |
|--------|-------|-------|
| A | Query ID | Auto-generated |
| B | Query Description | Max 200 chars |
| C | Query Type | New, SEO Query, Ongoing, On Hold |
| D | Status | A-H bucket letter |
| E | Added By | Email |
| F | Added Date Time | Timestamp |
| G | Assigned To | Email |
| H | Assigned By | Email |
| I | Assignment Date Time | Timestamp |
| J | Remarks | Free text |
| K | Proposal Sent Date Time | Timestamp |
| L | Whats Pending | Free text |
| M | Entered In SF Date Time | Timestamp |
| N | Event ID in SF | Optional |
| O | Event Title in SF | Optional |
| P | Discarded Date Time | Timestamp |
| Q | GM Indicator | true/false |
| R | Delete Requested By | Email |
| S | Delete Requested Date Time | Timestamp |
| T | Last Edited By | Email |
| U | Last Edited Date Time | Timestamp |
| V | Last Activity Date Time | Timestamp |
| W | Previous Status | A-G letter |
| X | Delete Approved By | Email |
| Y | Delete Approved Date Time | Timestamp |
| Z | Delete Rejected | true/false |
| AA | Delete Rejected By | Email |
| AB | Delete Rejected Date Time | Timestamp |
| AC | Remark Added By | Email |
| AD | Remark Added Date Time | Timestamp |

### Users Sheet
| Column | Field |
|--------|-------|
| Email | User email |
| Name | Full name |
| Role | Admin, Pseudo Admin, Senior, Junior |
| Display Order | Sort order |
| Is Active | true/false |
| Display Name | 5-6 char short name |

---

## Bucket Transitions

### Forward Transitions (Auto-fill)
| Transition | Auto-filled Field |
|------------|-------------------|
| → C or D | Proposal Sent Date Time |
| → E or F | Entered In SF Date Time |
| → G | Discarded Date Time |
| → H | Delete Requested Date Time |

### Backward Transitions (Auto-clear)
| To Bucket | Fields Cleared |
|-----------|----------------|
| A | Assignment, Proposal, SF, Discard fields |
| B | Proposal, SF, Discard fields |
| C or D | SF, Discard fields |
| E or F | Discard fields |

### Delete Rejection
- Returns to Previous Status
- Sets Delete Rejected = true
- NO fields are cleared (preserves full state)

---

## Testing Checklist

### Stats & Counts
- [ ] H bucket shows in header stats
- [ ] Total count matches sheet exactly
- [ ] Pending deletions count excludes approved deletions

### Delete Workflow
- [ ] Junior requests delete → shows in both original (grayed) and H bucket
- [ ] Admin approves → stays in H only
- [ ] Admin rejects → returns to original bucket with Del-Rej badge
- [ ] Del-Rej badge shows in ALL buckets

### Audit Trail
- [ ] Delete Rejected By/Date Time populated on rejection
- [ ] Remark Added By/Date Time populated on remark edit

### UI Elements
- [ ] "On Hold" appears in query type dropdowns
- [ ] Remark icon shows when query has remarks
- [ ] Horizontal scroll works in AllQueriesModal
- [ ] "Delete Query" button text everywhere
- [ ] P.A. indicator on ghost queries in original bucket

### Dual Bucket Display
- [ ] Pending deletion query shows grayed in original bucket
- [ ] Same query shows normally in H bucket
- [ ] Actions disabled for ghost queries
- [ ] After approval, only in H
- [ ] After rejection, only in original bucket

---

## Timeline

| Milestone | Date | Status |
|-----------|------|--------|
| Development Complete | Feb 7th | ✅ |
| Phase 1 Review | Feb 8th | 🔄 In Progress |
| Bug Fixes | Feb 9th | Pending |
| Go-Live | Feb 10th | Pending |

---

## Key Files Reference

| Component | File |
|-----------|------|
| Query Card | `app/components/QueryCardCompact.tsx` |
| Edit Modal | `app/components/EditQueryModal.tsx` |
| Add Modal | `app/components/AddQueryModal.tsx` |
| All Queries Modal | `app/components/AllQueriesModal.tsx` |
| Filter Bar | `app/components/CollapsibleFilterBar.tsx` |
| Bucket View | `app/components/BucketViewLinear.tsx` |
| User View | `app/components/UserViewLinear.tsx` |
| Query Filters | `app/utils/queryFilters.ts` |
| Sheet Utils | `app/utils/sheets.ts` |
| API Route | `app/api/queries/route.ts` |
| Constants | `app/config/sheet-constants.ts` |

---

## Notes

1. **Long-term Project:** Application will be used for 2+ years
2. **Iterations Expected:** User feedback after go-live will inform improvements
3. **RBAC is Critical:** Always use consistent 3-role array check pattern
