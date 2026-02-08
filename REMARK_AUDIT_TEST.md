# Remark Audit Trail - Testing Guide

## What Was Fixed

### Issue

- Remarks data existed in Google Sheet but audit trail (who added/edited remarks) was not being tracked
- "Remark Added By" and "Remark Added Date Time" columns were not being populated

### Root Cause

- SyncManager was not sending "Last Edited By" to the backend
- Backend needs "Last Edited By" to set remark audit trail

### Solution

1. **Backend (route.ts)**: Modified `handleEdit` to detect remark changes and set audit trail
2. **Frontend (SyncManager.ts)**: Now sends "Last Edited By" with edit requests
3. **UI (AuditTooltipContent.tsx)**: Already displays remark audit trail with blue highlight

---

## Testing Steps

### 1. Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### 2. Test Adding Remarks to New Query

**Steps:**

1. Add a new query (any bucket)
2. Assign it to yourself
3. Edit the query and add remarks in the "Remarks" field
4. Save changes
5. Hover over the query card's info icon (ℹ️) to see audit trail

**Expected Result:**

- Audit tooltip shows "Remark Added By: [Your Name] @ [Date/Time]" in blue text
- Google Sheet columns AC and AD should be populated:
  - AC (Remark Added By): Your email
  - AD (Remark Added Date Time): DD/MM/YYYY HH:MM:SS format

### 3. Test Editing Existing Remarks

**Steps:**

1. Find a query that already has remarks
2. Edit the query and change the remarks text
3. Save changes
4. Hover over audit trail

**Expected Result:**

- "Remark Added By" updates to current user
- "Remark Added Date Time" updates to current timestamp
- Sheet columns AC and AD reflect the latest editor

### 4. Test Remarks Display in Query Card

**Steps:**

1. Find any query with remarks
2. Look at the query card in bucket view

**Expected Result:**

- Red quote icon (") appears next to query description
- Hovering over quote icon shows remarks text in tooltip

---

## Verification Checklist

- [ ] Restart dev server completed
- [ ] New remarks create audit trail (AC/AD columns populated)
- [ ] Editing remarks updates audit trail to current user
- [ ] Audit tooltip shows "Remark Added By" in blue
- [ ] Red quote icon appears on queries with remarks
- [ ] Quote icon tooltip shows remark text
- [ ] Date format is DD/MM/YYYY HH:MM:SS (no comma)
- [ ] All dates are in IST timezone

---

## Google Sheet Column Reference

| Column | Field Name             | Purpose                               |
| ------ | ---------------------- | ------------------------------------- |
| J      | Remarks                | The actual remark text                |
| AC     | Remark Added By        | Email of who added/last edited remark |
| AD     | Remark Added Date Time | When remark was added/last edited     |

---

## Troubleshooting

### Audit trail not showing

- Check browser console for errors
- Verify "Last Edited By" is in the POST request payload
- Check Google Sheet columns AC and AD have data

### Date format wrong

- Should be: `08/02/2026 14:23:18` (DD/MM/YYYY HH:MM:SS)
- Should NOT be: `08/02/2026, 14:23:18` (no comma)
- Should NOT be: `46236.60825` (Excel serial number)

### Remark icon not showing

- Verify "Remarks" field (column J) has text
- Check QueryCardCompact.tsx is rendering the Quote icon
- Icon should be red with red fill

---

## Related Files Modified

1. `app/api/queries/route.ts` - handleEdit function
2. `app/managers/SyncManager.ts` - updateQueryOptimistic function
3. `app/components/AuditTooltipContent.tsx` - Already had remark display

---

**Status:** Ready for testing
**Next:** Verify all checklist items, then move to next feature
