# Testing Guide: Phase 2 - Detail View Feature

**Server:** http://localhost:3000  
**Date:** February 4, 2026

---

## BEFORE YOU START

### 1. Update Google Sheets (REQUIRED)

You **MUST** add a new column to your Preferences sheet first:

1. Open your Google Sheets
2. Go to the **"Preferences"** sheet
3. Click on column **G** (after "History Days")
4. Add header: **"Detail View"**
5. Leave existing rows empty (will default to FALSE/compact view)

**Current Structure:**

```
A: User Email
B: Preferred View
C: Column Count
D: Bucket Order
E: User Order
F: History Days
G: Detail View  ← ADD THIS
```

### 2. Clear Browser Cache (Recommended)

- Press `Ctrl + Shift + Delete`
- Clear cached images and files
- Or use Incognito/Private window

---

## TESTING STEPS

### Step 1: Login & Initial View

1. Open http://localhost:3000
2. Login with your Google account
3. You should see the dashboard with queries

**Expected:**

- Queries display in compact mode (single row)
- Each card shows: Description + Display Name + Actions (on hover)

---

### Step 2: Find the Detail View Toggle

**Desktop (Large Screen):**

1. Look at the top filter bar
2. Find the **"Card:"** section
3. You'll see two buttons: **"Compact"** and **"Detail"**

**Mobile (Small Screen):**

1. Tap the **"Filters"** button (with sliders icon)
2. Scroll down in the drawer
3. Find **"Card View"** section
4. You'll see **"Compact"** and **"Detail"** buttons

**Expected:**

- "Compact" button is highlighted (blue background)
- "Detail" button is gray

---

### Step 3: Switch to Detail View

1. Click/tap the **"Detail"** button
2. Watch the query cards change

**Expected Changes:**

- Cards become taller (2 rows instead of 1)
- **Row 1:** Description + Display Name + Actions (same as before)
- **Row 2:** NEW - Shows colored date badges
- Each date badge has:
  - Small calendar icon
  - Date label (e.g., "Added:", "Assigned:")
  - Date value (e.g., "Today", "04/02/2026")
  - Color matching the bucket/date type

---

### Step 4: Verify Date Display Per Bucket

Check different buckets to see their specific dates:

#### Bucket A (Pending - Unassigned)

**Expected dates in Row 2:**

- 🔴 Added: [date]

#### Bucket B (Pending Proposal)

**Expected dates in Row 2:**

- 🟡 Assigned: [date]
- 🔴 Added: [date]

#### Bucket C (Proposal Sent)

**Expected dates in Row 2:**

- 🟢 Proposal Sent: [date]
- 🟡 Assigned: [date]
- 🔴 Added: [date]

#### Bucket D (Proposal Sent Partially)

**Expected dates in Row 2:**

- 🟠 Proposal Sent: [date]
- 🟡 Assigned: [date]
- 🔴 Added: [date]

#### Bucket E (Partial + In SF)

**Expected dates in Row 2:**

- 🟣 SF Entry: [date]
- 🟠 Proposal Sent: [date]
- 🟡 Assigned: [date]
- 🔴 Added: [date]

#### Bucket F (Full + In SF)

**Expected dates in Row 2:**

- 🔵 SF Entry: [date]
- 🟢 Proposal Sent: [date]
- 🟡 Assigned: [date]
- 🔴 Added: [date]

#### Bucket G (Discarded)

**Expected dates in Row 2:**

- ⚫ Discarded: [date]
- 🟡 Assigned: [date]
- 🔴 Added: [date]

#### Bucket H (Deleted - Pending Approval)

**Expected dates in Row 2:**

- 🟤 Delete Req: [date]
- 🟡 Assigned: [date]
- 🔴 Added: [date]

---

### Step 5: Test Date Formatting

Look at the date values in Row 2:

**If query was added/modified today:**

- Should show: **"Today"**

**If query was added/modified tomorrow (unlikely):**

- Should show: **"Tomorrow"**

**If query is older:**

- Should show: **"DD/MM/YYYY"** format
- Example: "04/02/2026"

**Hover over a date badge:**

- Tooltip should show: "[Label]: [Date]"
- Example: "Added: 04/02/2026"

---

### Step 6: Test Persistence (CRITICAL)

1. Make sure you're in **Detail View** (cards showing 2 rows)
2. **Refresh the page** (F5 or Ctrl+R)
3. Wait for page to reload

**Expected:**

- Cards should STILL be in Detail View (2 rows)
- Your preference was saved to Google Sheets

**If it reverts to Compact:**

- ❌ Check that you added column G to Preferences sheet
- ❌ Check browser console for errors (F12)
- ❌ Check that API route is working

---

### Step 7: Test in Different View Modes

#### Test in Bucket View (Default)

1. Ensure "View: Bucket" is selected
2. Ensure "Layout: Default" is selected
3. Toggle between Compact and Detail
4. Verify dates show correctly in all buckets

#### Test in Bucket View (Linear)

1. Keep "View: Bucket" selected
2. Switch to "Layout: Linear"
3. Toggle between Compact and Detail
4. Verify dates show correctly
5. Verify synchronized scrolling still works

#### Test in User View (Default) - Senior/Admin Only

1. Switch to "View: User"
2. Ensure "Layout: Default" is selected
3. Toggle between Compact and Detail
4. Verify dates show correctly for all users

#### Test in User View (Linear) - Senior/Admin Only

1. Keep "View: User" selected
2. Switch to "Layout: Linear"
3. Toggle between Compact and Detail
4. Verify dates show correctly
5. Verify synchronized scrolling still works

---

### Step 8: Test Edge Cases

#### Queries with Missing Dates

1. Find a query that's missing some dates (e.g., no Assigned Date)
2. Switch to Detail View
3. **Expected:** Only dates that exist should show
4. **Expected:** No errors, no broken layout

#### Queries with Indicators

1. Find a query with **GM indicator** (mail icon)
2. Switch to Detail View
3. **Expected:** GM icon still shows in Row 1
4. **Expected:** Dates show correctly in Row 2

5. Find a query in **Bucket H** with **P.A.** badge
6. Switch to Detail View
7. **Expected:** P.A. badge still shows in Row 1
8. **Expected:** Dates show correctly in Row 2

9. Find a query with **Del-Rej** badge (if any)
10. Switch to Detail View
11. **Expected:** Del-Rej badge still shows in Row 1
12. **Expected:** Dates show correctly in Row 2

#### Long Descriptions

1. Find a query with a very long description
2. Switch to Detail View
3. **Expected:** Description still truncates with "..."
4. **Expected:** Hover shows full description
5. **Expected:** Dates in Row 2 don't overflow

---

### Step 9: Test Mobile Responsiveness

1. Open browser DevTools (F12)
2. Click "Toggle Device Toolbar" (Ctrl+Shift+M)
3. Select a mobile device (e.g., iPhone 12)
4. Test the Detail View toggle in the Filters drawer
5. Verify cards display correctly on small screens

**Expected:**

- Detail View toggle accessible in Filters drawer
- Cards stack properly on mobile
- Dates in Row 2 wrap if needed
- No horizontal scrolling

---

### Step 10: Test Performance

1. Switch to Detail View
2. Scroll through buckets with many queries
3. **Expected:** Smooth scrolling, no lag
4. **Expected:** No console errors

5. Toggle between Compact and Detail rapidly (5-10 times)
6. **Expected:** Instant switching
7. **Expected:** No visual glitches

---

## TROUBLESHOOTING

### Issue: Detail View doesn't persist after refresh

**Solution:**

1. Check Google Sheets Preferences sheet has column G "Detail View"
2. Open browser console (F12) → Network tab
3. Refresh page and look for `/api/preferences` call
4. Check if it's returning DetailView field
5. Try logging out and back in

### Issue: Dates not showing in Row 2

**Solution:**

1. Check browser console for errors
2. Verify queries have date values in Google Sheets
3. Check date format is "DD/MM/YYYY, HH:MM:SS"
4. Try a different bucket

### Issue: Colors not showing correctly

**Solution:**

1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check if bucket colors are defined in `sheet-constants.ts`

### Issue: Toggle button not visible

**Solution:**

1. Check screen size (might be in Filters drawer on mobile)
2. Verify `CollapsibleFilterBar` is rendering
3. Check browser console for errors

---

## VERIFICATION CHECKLIST

Use this checklist to confirm everything works:

### Basic Functionality

- [ ] Toggle appears in filter bar (desktop) or drawer (mobile)
- [ ] Clicking "Detail" switches to 2-row cards
- [ ] Clicking "Compact" switches back to 1-row cards
- [ ] Preference persists after page refresh
- [ ] Works in all 4 view combinations (Bucket/User × Default/Linear)

### Date Display

- [ ] Row 2 shows correct dates for each bucket
- [ ] Dates are color-coded
- [ ] Date format is correct (Today/Tomorrow/DD/MM/YYYY)
- [ ] Tooltips show on hover
- [ ] Missing dates don't break layout

### Visual Quality

- [ ] Cards look good in both modes
- [ ] No layout shifts or glitches
- [ ] Dates don't overflow or wrap awkwardly
- [ ] Colors are readable
- [ ] Icons display correctly

### Edge Cases

- [ ] Works with GM indicator
- [ ] Works with P.A. indicator
- [ ] Works with Del-Rej indicator
- [ ] Works with long descriptions
- [ ] Works with missing dates
- [ ] Works on mobile screens

### Performance

- [ ] Smooth scrolling
- [ ] Instant toggle switching
- [ ] No console errors
- [ ] No memory leaks (check DevTools)

---

## SUCCESS CRITERIA

Phase 2 is successfully implemented if:

1. ✅ Detail View toggle is visible and functional
2. ✅ Preference persists across sessions
3. ✅ Row 2 shows all applicable dates per bucket
4. ✅ Dates are color-coded and formatted correctly
5. ✅ Works in all view modes
6. ✅ No errors in console
7. ✅ Smooth performance

---

## NEXT STEPS AFTER TESTING

Once testing is complete:

1. **If all tests pass:** Mark Phase 2 as complete ✅
2. **If issues found:** Document them and we'll fix
3. **Ready for Phase 3:** Sorting improvements
4. **Ready for Phase 4-6:** Continue implementation

---

## NEED HELP?

If you encounter issues:

1. Check browser console (F12) for errors
2. Check Network tab for failed API calls
3. Verify Google Sheets structure
4. Share screenshots of the issue
5. Share console error messages

Happy testing! 🚀
