# Bucket Status Transitions

This document explains how status transitions work and what happens to query fields when moving between buckets.

---

## Bucket Order

```
A → B → C → D → E → F → G → H
```

| Bucket | Name | Primary Date Field |
|--------|------|-------------------|
| A | Pending (Unassigned) | Added Date |
| B | Pending Proposal | Assigned Date |
| C | Proposal Sent (Full) | Proposal Sent Date |
| D | Proposal Sent (Partial) | Proposal Sent Date |
| E | Partial Proposal + In SF | SF Entry Date |
| F | Full Proposal + In SF | SF Entry Date |
| G | Discarded | Discarded Date |
| H | Deleted (Pending Approval) | Deleted Date |

---

## Forward Transitions (Auto-fill)

When moving **forward** to a later bucket, certain date fields are **auto-filled**:

| Transition | Auto-filled Field |
|------------|-------------------|
| → C or D | `Proposal Sent Date Time` (if empty) |
| → E or F | `Entered In SF Date Time` (if empty) |
| → G | `Discarded Date Time` |
| → H | `Delete Requested Date Time` |

---

## Backward Transitions (Auto-clear)

When moving **backward** to an earlier bucket, fields that don't belong in that bucket are **cleared**:

### Moving to A (Unassigned)
Clears:
- `Assigned To`
- `Assigned By`
- `Assignment Date Time`
- `Remarks`
- `Proposal Sent Date Time`
- `Whats Pending`
- `Entered In SF Date Time`
- `Event ID in SF`
- `Event Title in SF`
- `Discarded Date Time`

### Moving to B (Pending Proposal)
Clears:
- `Proposal Sent Date Time`
- `Whats Pending`
- `Entered In SF Date Time`
- `Event ID in SF`
- `Event Title in SF`
- `Discarded Date Time`

### Moving to C or D (Proposal Sent)
Clears:
- `Entered In SF Date Time`
- `Event ID in SF`
- `Event Title in SF`
- `Discarded Date Time`

### Moving to E or F (In Salesforce)
Clears:
- `Discarded Date Time`

---

## Implementation Details

The backward transition logic is implemented in two places:

1. **SyncManager.ts** (`updateStatusOptimistic`)
   - Handles UI optimistic updates
   - Clears fields immediately in the local state

2. **API route.ts** (`handleUpdateStatus`)
   - Handles server-side updates to Google Sheets
   - Fetches current status, compares with new status
   - Clears fields in the sheet when moving backwards

### Code Location
- `app/managers/SyncManager.ts` - Lines ~645-690
- `app/api/queries/route.ts` - Lines ~340-385
