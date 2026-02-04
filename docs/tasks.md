# Query Tracker – Implementation Tasks

## Phase 1: Data Models
- [ ] Add `deletedDateTime`, `deleteApprovedBy`, `deleteRejected`, `previousStatus` to Query
- [ ] Add `displayName` to User

## Phase 2: Single-Row Default View
- [ ] Redesign `QueryCardCompact` to single row (~50 char description)
- [ ] Actions visible on hover only
- [ ] Use Display Name (fallback to first name)
- [ ] Add "Del-Rej" indicator
- [ ] Add Detail View toggle

## Phase 3: Per-Bucket Sorting
- [ ] Add `defaultSortField` to each bucket config
- [ ] Add Bucket H configuration
- [ ] Implement bucket-specific sorting
- [ ] Custom sort as secondary sort
- [ ] Persist custom sort to preferences
- [ ] Add "Remove Sort" button

## Phase 4: Assign Buttons
- [ ] Junior: Single Self Assign (instant)
- [ ] Senior/Admin: Self Assign + Assign (inline picklist)

## Phase 5: Bucket H – Deletion Workflow
- [ ] Add status H transitions
- [ ] Store `previousStatus` before H
- [ ] On reject: return to previous bucket + set `deleteRejected`
- [ ] Add ✓/✗ buttons for Admins

## Phase 6: GM Indicator
- [ ] Show checkbox on status → E or F
- [ ] E→F: Default to last value
- [ ] First E/F: Default unchecked
- [ ] Display GM badge on cards

## Phase 7: Header Totals
- [ ] Layout: A|B|C|D|E|F|[Total]|G|H
- [ ] Total = A+B+C+D+E+F (bold)

## Phase 8: Load +7 Days
- [ ] Add button at bottom of F, G, H
- [ ] Expand 3→10→17→24 days

## Phase 9: Add Query Enhancements
- [ ] Input line (2 lines, 200 chars, counter)
- [ ] Add "Allocate To" picklist
- [ ] Add "+" for multi-add
- [ ] If to B: Added=Assigned

## Phase 10: Linear View – 3-Bucket Rows
- [ ] Row 1: A+B+C, Row 2: D+E+F, Row 3: G+H
- [ ] Default 3 columns
- [ ] Synchronized scrolling per row

## Phase 11: Audit Modal Edits
- [ ] Editable: Date fields, Query Description
- [ ] Edited values shown in different color
