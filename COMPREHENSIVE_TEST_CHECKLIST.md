# Query Tracker - Comprehensive Testing Checklist

**Version:** 2.0 | **Date:** February 8, 2026  
**Based on:** All meeting transcripts + implementation docs

---

## Pre-Testing Setup

### Test Environment

- [ ] Chrome browser (desktop)
- [ ] Test with 3 user accounts: Admin, Senior, Junior
- [ ] Google Sheet has clean test data with dates
- [ ] At least 4-5 test users configured in Users sheet
- [ ] Display Names configured for all users (5-6 chars max)

### Test Data Requirements

- [ ] Queries in all buckets (A-H)
- [ ] Queries with different Query Types (New, SEO, Ongoing, On Hold)
- [ ] Queries with various date combinations
- [ ] Some queries with remarks
- [ ] Some queries with GM Indicator checked
- [ ] Some queries pending deletion (in H with P.A.)
- [ ] Some queries with Del-Rej indicator

---

## 1. AUTHENTICATION & SESSION

| #   | Test Case                               | ✅/❌ | Notes |
| --- | --------------------------------------- | ----- | ----- |
| 1.1 | Login with Google OAuth works           | ✅    |       |
| 1.2 | Token refresh works after 1 hour        | ✅    |       |
| 1.3 | No automatic logout issues              | ✅    |       |
| 1.4 | Session persists across browser refresh | ✅    |       |
| 1.5 | Logout button works correctly           | ✅    |       |

---

## 2. ADD QUERY MODAL

| #    | Test Case                                             | ✅/❌ | Notes |
| ---- | ----------------------------------------------------- | ----- | ----- |
| 2.1  | Click "+" button → Modal opens                        |       |       |
| 2.2  | Query Description: 2-line input, 200 char limit       |       |       |
| 2.3  | Character counter shows remaining chars               |       |       |
| 2.4  | Query Type defaults to "New"                          |       |       |
| 2.5  | Query Type dropdown shows: New, SEO, Ongoing, On Hold |       |       |
| 2.6  | **Senior/Admin:** "Allocate To" dropdown visible      |       |       |
| 2.7  | **Junior:** "Allocate To" dropdown NOT visible        |       |       |
| 2.8  | User dropdown is searchable                           |       |       |
| 2.9  | User dropdown shows Display Names                     |       |       |
| 2.10 | Submit without allocation → Query goes to Bucket A    |       |       |
| 2.11 | Submit with allocation → Query goes to Bucket B       |       |       |
| 2.12 | **When allocated:** Added Date = Assigned Date        |       |       |
| 2.13 | "+" button adds another query row                     |       |       |
| 2.14 | Last selected user persists for next query            |       |       |
| 2.15 | **Auto-save:** Drafts save every 10 seconds           |       |       |
| 2.16 | **Auto-save:** Drafts restore after logout/login      |       |       |
| 2.17 | **Remove All** button clears all drafts               |       |       |
| 2.18 | Cannot submit empty description                       |       |       |
| 2.19 | Bulk add shows single toast notification              |       |       |

---

## 3. BUCKET VIEW (Default)

| #   | Test Case                                              | ✅/❌ | Notes |
| --- | ------------------------------------------------------ | ----- | ----- |
| 3.1 | Shows 8 buckets: A, B, C, D, E, F, G, H                |       |       |
| 3.2 | Bucket headers show count (e.g., "A (5)")              |       |       |
| 3.3 | **Header Total:** A+B+C+D+E+F (excludes G/H)           |       |       |
| 3.4 | **Header Total:** Bold, positioned after F, before G   |       |       |
| 3.5 | **Header Total:** Clickable → Opens all queries modal  |       |       |
| 3.6 | Bucket colors match specification                      |       |       |
| 3.7 | Queries grouped by type: SEO → New → Ongoing → On Hold |       |       |
| 3.8 | Default sorting per bucket works correctly             |       |       |
| 3.9 | Vertical scroll within each bucket                     |       |       |

---

## 4. QUERY CARDS (Compact View)

| #    | Test Case                                              | ✅/❌ | Notes |
| ---- | ------------------------------------------------------ | ----- | ----- |
| 4.1  | **Single row:** Description + Display Name + Date      |       |       |
| 4.2  | Description truncated to ~50 chars                     |       |       |
| 4.3  | Full description shows on hover                        |       |       |
| 4.4  | Display Name shows (5-6 chars max)                     |       |       |
| 4.5  | Primary date visible by default                        |       |       |
| 4.6  | Date format: DD/MM/YYYY or "Today"/"Tomorrow"          |       |       |
| 4.7  | **Action buttons:** Visible ONLY on hover              |       |       |
| 4.8  | **Action buttons:** White background overlay on date   |       |       |
| 4.9  | Query Type indicator visible (SEO/New/Ongoing/On Hold) |       |       |
| 4.10 | **GM badge:** Shows if GM Indicator checked            |       |       |
| 4.11 | **Remark icon:** Shows if query has remarks            |       |       |
| 4.12 | **Del-Rej badge:** Shows in ALL buckets when rejected  |       |       |
| 4.13 | **P.A. indicator:** Shows for pending deletions        |       |       |

---

## 5. QUERY CARDS (Detail View)

| #   | Test Case                                               | ✅/❌ | Notes |
| --- | ------------------------------------------------------- | ----- | ----- |
| 5.1 | Toggle to Detail View works                             |       |       |
| 5.2 | **Row 1:** Description + Display Name + Actions (hover) |       |       |
| 5.3 | **Row 2:** All applicable dates (color-coded)           |       |       |
| 5.4 | Dates show in correct order per bucket                  |       |       |
| 5.5 | Date colors match bucket colors                         |       |       |
| 5.6 | Tooltip on date shows date type                         |       |       |
| 5.7 | All dates visible without scrolling                     |       |       |

---

## 6. ASSIGN WORKFLOW

| #    | Test Case                                            | ✅/❌ | Notes |
| ---- | ---------------------------------------------------- | ----- | ----- |
| 6.1  | **Junior:** Single "Self Assign" button (instant)    |       |       |
| 6.2  | **Senior/Admin:** "Self Assign" + "Assign" buttons   |       |       |
| 6.3  | **Assign dropdown:** Opens directly below button     |       |       |
| 6.4  | **Assign dropdown:** Aligned to right edge of button |       |       |
| 6.5  | **Assign dropdown:** Closes on hover away            |       |       |
| 6.6  | **Assign dropdown:** Scrollable for 12+ users        |       |       |
| 6.7  | **Assign dropdown:** Search box filters users        |       |       |
| 6.8  | **Assign dropdown:** Width increased by 20%          |       |       |
| 6.9  | **Assign dropdown:** No cursor jumping in search     |       |       |
| 6.10 | Self-assign updates instantly (optimistic)           |       |       |
| 6.11 | Assign to others updates instantly (optimistic)      |       |       |
| 6.12 | Assignment Date auto-filled                          |       |       |
| 6.13 | Query moves to Bucket B after assignment             |       |       |

---

## 7. EDIT QUERY MODAL

| #    | Test Case                                                  | ✅/❌ | Notes |
| ---- | ---------------------------------------------------------- | ----- | ----- |
| 7.1  | Click query card → Modal opens                             |       |       |
| 7.2  | All fields editable (per role permissions)                 |       |       |
| 7.3  | **Assign To field:** Prominent, appears first              |       |       |
| 7.4  | **Assign To field:** Searchable dropdown                   |       |       |
| 7.5  | Status dropdown shows valid transitions                    |       |       |
| 7.6  | **Bucket D:** "What's Pending" field mandatory             |       |       |
| 7.7  | **Bucket E/F:** Event ID field optional                    |       |       |
| 7.8  | **Bucket E/F:** Event Title field optional                 |       |       |
| 7.9  | **Bucket E/F:** GM Indicator checkbox visible              |       |       |
| 7.10 | **E→F transition:** GM defaults to last value              |       |       |
| 7.11 | **First E/F:** GM defaults unchecked                       |       |       |
| 7.12 | **Junior:** Assignment Date locked (🔒 icon)               |       |       |
| 7.13 | **Junior:** Added Date disabled (gray)                     |       |       |
| 7.14 | **Junior:** Other dates editable                           |       |       |
| 7.15 | **Senior/Admin:** All dates editable                       |       |       |
| 7.16 | **Edited dates:** Show in different color                  |       |       |
| 7.17 | Remarks field visible and editable                         |       |       |
| 7.18 | **Audit Trail:** Shows Added By, Assigned By, Last Edited  |       |       |
| 7.19 | **Audit Trail:** Shows dates/times for each action         |       |       |
| 7.20 | **Audit Trail:** Shows "Remark Added By" when remark added |       |       |
| 7.21 | Save changes → Query updated                               |       |       |
| 7.22 | Cancel → No changes saved                                  |       |       |
| 7.23 | **Block status change if not assigned**                    |       |       |
| 7.24 | Show notification: "Please assign first"                   |       |       |

---

## 8. STATUS TRANSITIONS (Forward)

| #   | Test Case                             | ✅/❌ | Notes |
| --- | ------------------------------------- | ----- | ----- |
| 8.1 | A → B: Assignment Date auto-filled    |       |       |
| 8.2 | B → C: Proposal Sent Date auto-filled |       |       |
| 8.3 | B → D: Proposal Sent Date auto-filled |       |       |
| 8.4 | C → E: SF Entry Date auto-filled      |       |       |
| 8.5 | C → F: SF Entry Date auto-filled      |       |       |
| 8.6 | D → E: SF Entry Date auto-filled      |       |       |
| 8.7 | D → F: SF Entry Date auto-filled      |       |       |
| 8.8 | Any → G: Discarded Date auto-filled   |       |       |
| 8.9 | Any → H: Deleted Date auto-filled     |       |       |

---

## 9. STATUS TRANSITIONS (Backward)

| #   | Test Case                                         | ✅/❌ | Notes |
| --- | ------------------------------------------------- | ----- | ----- |
| 9.1 | B → A: Assignment fields cleared                  |       |       |
| 9.2 | C/D → B: Proposal Sent Date cleared               |       |       |
| 9.3 | E/F → C/D: SF Entry Date cleared                  |       |       |
| 9.4 | E/F → B: Proposal + SF fields cleared             |       |       |
| 9.5 | G → Previous: Discarded Date cleared              |       |       |
| 9.6 | Backward transitions clear future workflow fields |       |       |

---

## 10. DELETE WORKFLOW (Bucket H)

| #     | Test Case                                                      | ✅/❌ | Notes |
| ----- | -------------------------------------------------------------- | ----- | ----- |
| 10.1  | **Junior:** Delete → Query moves to H with "P.A."              |       |       |
| 10.2  | **Junior:** Query shows in BOTH original bucket (grayed) AND H |       |       |
| 10.3  | **Junior:** Grayed query in original bucket not clickable      |       |       |
| 10.4  | **Junior:** Normal query in H bucket                           |       |       |
| 10.5  | **Senior/Admin:** Delete → Confirmation dialog                 |       |       |
| 10.6  | **Senior/Admin:** Confirm → Permanent delete                   |       |       |
| 10.7  | **Admin:** ✓ button visible in H bucket                        |       |       |
| 10.8  | **Admin:** ✗ button visible in H bucket                        |       |       |
| 10.9  | **Admin:** ✓ → Query stays in H, clears from original          |       |       |
| 10.10 | **Admin:** ✗ → Query returns to original bucket                |       |       |
| 10.11 | **Admin:** ✗ → "Del-Rej" badge shows                           |       |       |
| 10.12 | **Admin:** ✗ → "Delete Rejected By" field populated            |       |       |
| 10.13 | **Admin:** ✗ → "Delete Rejected Date Time" populated           |       |       |
| 10.14 | **Non-Admin:** No ✓/✗ buttons visible                          |       |       |
| 10.15 | Button text: "Delete Query" (not "Request Deletion")           |       |       |
| 10.16 | Pending deletions show in PendingDeletions widget              |       |       |
| 10.17 | Approved deletions don't show in PendingDeletions              |       |       |

---

## 11. SORTING & FILTERING

| #     | Test Case                                          | ✅/❌ | Notes |
| ----- | -------------------------------------------------- | ----- | ----- |
| 11.1  | **Default sort:** Per bucket specification         |       |       |
| 11.2  | **Sort By dropdown:** Shows date field options     |       |       |
| 11.3  | **Sort direction:** ↓/↑ toggle works               |       |       |
| 11.4  | **Apply To dropdown:** Shows bucket checkboxes     |       |       |
| 11.5  | **Apply To:** "All Buckets" checks all A-H         |       |       |
| 11.6  | **Apply To:** Uncheck one → Shows "7 buckets"      |       |       |
| 11.7  | **Apply To:** Multi-select works                   |       |       |
| 11.8  | **Reset button:** Returns to "All"                 |       |       |
| 11.9  | **Remove Sort button:** Clears custom sort         |       |       |
| 11.10 | **Remove Sort:** Returns to default bucket sorting |       |       |
| 11.11 | Custom sort persists across sessions               |       |       |
| 11.12 | Search by Query ID works                           |       |       |
| 11.13 | Search by description works                        |       |       |
| 11.14 | Search label: "Search Description"                 |       |       |
| 11.15 | Clear search → All queries return                  |       |       |

---

## 12. VIEW MODES & PREFERENCES

| #     | Test Case                                               | ✅/❌ | Notes |
| ----- | ------------------------------------------------------- | ----- | ----- |
| 12.1  | **View toggle:** Bucket / User works                    |       |       |
| 12.2  | **Layout toggle:** Default / Linear works               |       |       |
| 12.3  | **Columns:** 2 / 3 / 4 options work                     |       |       |
| 12.4  | **Card view:** Compact / Detail toggle works            |       |       |
| 12.5  | **Green "Save View" button:** Visible when changes made |       |       |
| 12.6  | **Save View button:** Positioned BEFORE search bar      |       |       |
| 12.7  | **Save View:** Preferences saved to backend             |       |       |
| 12.8  | **Save View:** Preferences persist after refresh        |       |       |
| 12.9  | **Reset to Default:** Clears saved preferences          |       |       |
| 12.10 | Filter bar collapsible                                  |       |       |
| 12.11 | Bucket heights adjust when filter bar collapses         |       |       |

---

## 13. LINEAR VIEW

| #    | Test Case                                                   | ✅/❌ | Notes |
| ---- | ----------------------------------------------------------- | ----- | ----- |
| 13.1 | **Row 1:** A + B + C side by side                           |       |       |
| 13.2 | **Row 2:** D + E + F side by side                           |       |       |
| 13.3 | **Row 3:** G + H side by side                               |       |       |
| 13.4 | Horizontal scroll within each row                           |       |       |
| 13.5 | **Synchronized scroll:** All buckets in row scroll together |       |       |
| 13.6 | Default: 3 columns per row                                  |       |       |
| 13.7 | Can customize to 2 or 4 columns                             |       |       |
| 13.8 | Query description max 50 chars                              |       |       |
| 13.9 | Display Name max 5-6 chars                                  |       |       |

---

## 14. USER VIEW

| #     | Test Case                                      | ✅/❌ | Notes |
| ----- | ---------------------------------------------- | ----- | ----- |
| 14.1  | **Junior:** Cannot access User View            |       |       |
| 14.2  | **Senior/Admin:** Can access User View         |       |       |
| 14.3  | Users shown as columns                         |       |       |
| 14.4  | Current user appears first                     |       |       |
| 14.5  | Other users alphabetically sorted              |       |       |
| 14.6  | Queries grouped by bucket under each user      |       |       |
| 14.7  | Same Default/Detail view modes work            |       |       |
| 14.8  | Same sorting/filtering works                   |       |       |
| 14.9  | Same action buttons work                       |       |       |
| 14.10 | Linear layout: Horizontal user columns         |       |       |
| 14.11 | **User filter:** Multi-select dropdown works   |       |       |
| 14.12 | **User filter:** Search box filters users      |       |       |
| 14.13 | **Bucket filter:** Multi-select dropdown works |       |       |
| 14.14 | Combined filters work together                 |       |       |

---

## 15. EXPANDED BUCKET MODAL (4×8 Matrix)

| #     | Test Case                                              | ✅/❌ | Notes |
| ----- | ------------------------------------------------------ | ----- | ----- |
| 15.1  | Click bucket count → Modal opens                       |       |       |
| 15.2  | **Display:** 4 columns × 8 rows = 32 queries           |       |       |
| 15.3  | Queries grouped by type: SEO → New → Ongoing → On Hold |       |       |
| 15.4  | Bucket title/header visible                            |       |       |
| 15.5  | Scroll down to see more queries (if >32)               |       |       |
| 15.6  | **Action buttons:** Self-Assign, Assign, Edit visible  |       |       |
| 15.7  | All quick actions work from modal                      |       |       |
| 15.8  | **Close button:** Returns to normal view               |       |       |
| 15.9  | **Escape key:** Closes modal                           |       |       |
| 15.10 | **Modal:** Doesn't overlap main header                 |       |       |
| 15.11 | **Horizontal scroll:** Works when content overflows    |       |       |
| 15.12 | **User View expand:** Shows all buckets for user       |       |       |

---

## 16. LOAD +7 DAYS (F, G, H)

| #     | Test Case                                              | ✅/❌ | Notes |
| ----- | ------------------------------------------------------ | ----- | ----- |
| 16.1  | **Default:** Last 3 days visible in F, G, H            |       |       |
| 16.2  | **Evaporation date:** F uses SF Entry Date             |       |       |
| 16.3  | **Evaporation date:** G uses Discarded Date            |       |       |
| 16.4  | **Evaporation date:** H uses Deleted Date              |       |       |
| 16.5  | **H bucket:** Pending approval queries don't evaporate |       |       |
| 16.6  | **Load +7 Days button:** At bottom of F                |       |       |
| 16.7  | **Load +7 Days button:** At bottom of G                |       |       |
| 16.8  | **Load +7 Days button:** At bottom of H                |       |       |
| 16.9  | Click → Expands to 10 days                             |       |       |
| 16.10 | Click again → Expands to 17 days                       |       |       |
| 16.11 | Click again → Expands to 24 days                       |       |       |
| 16.12 | Expansion in multiples of 7                            |       |       |

---

## 17. PERMISSIONS (Role-Based)

| #     | Test Case                                           | ✅/❌ | Notes |
| ----- | --------------------------------------------------- | ----- | ----- |
| 17.1  | **Junior:** Can only self-assign                    |       |       |
| 17.2  | **Junior:** Cannot assign to others                 |       |       |
| 17.3  | **Junior:** Can edit own queries only               |       |       |
| 17.4  | **Junior:** Cannot edit Assignment Date             |       |       |
| 17.5  | **Junior:** Cannot edit Added Date                  |       |       |
| 17.6  | **Junior:** CAN edit other dates                    |       |       |
| 17.7  | **Junior:** Delete requests go to H (pending)       |       |       |
| 17.8  | **Junior:** Cannot approve/reject deletions         |       |       |
| 17.9  | **Junior:** Cannot see PendingDeletions widget      |       |       |
| 17.10 | **Junior:** Cannot access User View                 |       |       |
| 17.11 | **Senior/Admin:** Can assign to anyone              |       |       |
| 17.12 | **Senior/Admin:** Can edit any query                |       |       |
| 17.13 | **Senior/Admin:** Can edit all date fields          |       |       |
| 17.14 | **Senior/Admin:** Can permanently delete            |       |       |
| 17.15 | **Senior/Admin:** Can approve/reject deletions      |       |       |
| 17.16 | **Senior/Admin:** Can see PendingDeletions widget   |       |       |
| 17.17 | **Senior/Admin:** Can access User View              |       |       |
| 17.18 | **Admin = Pseudo Admin = Senior:** Same permissions |       |       |

---

## 18. AUTO-REFRESH

| #    | Test Case                                          | ✅/❌ | Notes |
| ---- | -------------------------------------------------- | ----- | ----- |
| 18.1 | Auto-refresh every 60 seconds                      |       |       |
| 18.2 | Header shows last refresh time                     |       |       |
| 18.3 | Manual refresh button works                        |       |       |
| 18.4 | **Refresh pauses:** When modal open                |       |       |
| 18.5 | **Refresh pauses:** When user is editing           |       |       |
| 18.6 | **Refresh pauses:** When dragging (if implemented) |       |       |
| 18.7 | Refresh resumes after activity ends                |       |       |

---

## 19. OPTIMISTIC UPDATES

| #    | Test Case                                  | ✅/❌ | Notes |
| ---- | ------------------------------------------ | ----- | ----- |
| 19.1 | Assign query → Updates instantly           |       |       |
| 19.2 | Change status → Updates instantly          |       |       |
| 19.3 | Edit query → Updates instantly             |       |       |
| 19.4 | Delete query → Updates instantly           |       |       |
| 19.5 | **On failure:** Rollback to previous state |       |       |
| 19.6 | **On failure:** Show error toast           |       |       |
| 19.7 | Loading indicator shows during sync        |       |       |

---

## 20. AUDIT TRAIL & TOOLTIPS

| #     | Test Case                                                 | ✅/❌ | Notes |
| ----- | --------------------------------------------------------- | ----- | ----- |
| 20.1  | **Hover on date:** Tooltip shows all dates                |       |       |
| 20.2  | **Hover on date:** Shows date types                       |       |       |
| 20.3  | **Hover on date:** Shows date/time                        |       |       |
| 20.4  | **Audit Trail:** Shows Added By + date/time               |       |       |
| 20.5  | **Audit Trail:** Shows Assigned By + date/time            |       |       |
| 20.6  | **Audit Trail:** Shows Last Status Change + date/time     |       |       |
| 20.7  | **Audit Trail:** Shows Last Edited By + date/time         |       |       |
| 20.8  | **Audit Trail:** Shows Remark Added By (if applicable)    |       |       |
| 20.9  | **Audit Trail:** Shows Delete Rejected By (if applicable) |       |       |
| 20.10 | Tooltips don't obstruct view                              |       |       |
| 20.11 | Tooltips disappear on hover away                          |       |       |

---

## 21. EDGE CASES & ERROR HANDLING

| #     | Test Case                                 | ✅/❌ | Notes |
| ----- | ----------------------------------------- | ----- | ----- |
| 21.1  | Empty bucket displays correctly           |       |       |
| 21.2  | Single query in bucket displays correctly |       |       |
| 21.3  | 100+ queries in bucket (performance)      |       |       |
| 21.4  | Very long query description (200 chars)   |       |       |
| 21.5  | Query with no dates (edge case)           |       |       |
| 21.6  | Query with all dates filled               |       |       |
| 21.7  | Rapid status changes (A→B→C→B→C)          |       |       |
| 21.8  | Multiple users editing same query         |       |       |
| 21.9  | Network failure during save               |       |       |
| 21.10 | Token expiry during operation             |       |       |
| 21.11 | Browser back/forward buttons              |       |       |
| 21.12 | Multiple tabs open (sync)                 |       |       |

---

## 22. PERFORMANCE

| #    | Test Case                        | ✅/❌ | Notes |
| ---- | -------------------------------- | ----- | ----- |
| 22.1 | Initial load < 3 seconds         |       |       |
| 22.2 | Optimistic updates feel instant  |       |       |
| 22.3 | Smooth scrolling (no lag)        |       |       |
| 22.4 | No memory leaks after 30 minutes |       |       |
| 22.5 | No console errors                |       |       |
| 22.6 | No console warnings              |       |       |
| 22.7 | Handles 200+ queries smoothly    |       |       |

---

## 23. UI/UX POLISH

| #     | Test Case                     | ✅/❌ | Notes |
| ----- | ----------------------------- | ----- | ----- |
| 23.1  | Bucket colors consistent      |       |       |
| 23.2  | Font sizes readable           |       |       |
| 23.3  | Spacing/padding consistent    |       |       |
| 23.4  | Hover states clear            |       |       |
| 23.5  | Active states clear           |       |       |
| 23.6  | Disabled states clear         |       |       |
| 23.7  | Loading states clear          |       |       |
| 23.8  | Error states clear            |       |       |
| 23.9  | Success states clear          |       |       |
| 23.10 | Tooltips positioned correctly |       |       |
| 23.11 | Modals centered               |       |       |
| 23.12 | Buttons have clear labels     |       |       |
| 23.13 | Icons intuitive               |       |       |
| 23.14 | No text overflow              |       |       |
| 23.15 | No layout shifts              |       |       |

---

## 24. MOBILE VIEW (Excluded from Phase 1)

| #    | Test Case                                 | ✅/❌ | Notes        |
| ---- | ----------------------------------------- | ----- | ------------ |
| 24.1 | Mobile view excluded from Phase 1 testing | N/A   | Future phase |

---

## 25. INTEGRATION TESTS

| #    | Test Case                                  | ✅/❌ | Notes |
| ---- | ------------------------------------------ | ----- | ----- |
| 25.1 | Add query → Appears in Google Sheet        |       |       |
| 25.2 | Edit query → Updates in Google Sheet       |       |       |
| 25.3 | Delete query → Marked in Google Sheet      |       |       |
| 25.4 | Assign query → Updates in Google Sheet     |       |       |
| 25.5 | Status change → Updates in Google Sheet    |       |       |
| 25.6 | Preferences save → Updates in Google Sheet |       |       |
| 25.7 | Multiple users → No data conflicts         |       |       |

---

## CRITICAL BUGS TO VERIFY FIXED

| #   | Bug                                     | Status     | Notes |
| --- | --------------------------------------- | ---------- | ----- |
| B1  | H bucket missing from stats calculation | ✅ Fixed   |       |
| B2  | Del-Rej not showing in all buckets      | ✅ Fixed   |       |
| B3  | Cursor jumping in search bar            | ⏳ Pending |       |
| B4  | Assign dropdown position incorrect      | ⏳ Pending |       |
| B5  | Dual bucket display for junior delete   | ⏳ Pending |       |
| B6  | Horizontal scroll in expanded modal     | ⏳ Pending |       |

---

## PHASE 2 FEATURES (Not in Scope)

- [ ] Drag and drop (queries, buckets, users)
- [ ] Resizable bucket heights
- [ ] Manual export feature
- [ ] Periodic email reports
- [ ] Team assignment system
- [ ] Vertical pagination toggle
- [ ] Full audit trail with change history
- [ ] Mobile responsive view

---

## SIGN-OFF

### Testing Team

| Role   | Tester Name | Date | Status                      |
| ------ | ----------- | ---- | --------------------------- |
| Admin  |             |      | ☐ Approved / ☐ Issues Found |
| Senior |             |      | ☐ Approved / ☐ Issues Found |
| Junior |             |      | ☐ Approved / ☐ Issues Found |

### Critical Issues Found

_List any blocking issues here:_

1.
2.
3.

### Non-Critical Issues Found

_List any minor issues here:_

1.
2.
3.

---

## DEPLOYMENT READINESS

- [ ] All critical tests passed
- [ ] No blocking bugs
- [ ] Performance acceptable
- [ ] All roles tested
- [ ] Data integrity verified
- [ ] Google Sheets integration working
- [ ] Token refresh working
- [ ] Auto-refresh working
- [ ] Preferences persisting
- [ ] Ready for production

---

**Testing Timeline:**

- **Saturday (Feb 8):** Development complete, first review
- **Sunday (Feb 9):** Bug fixes, final testing
- **Monday (Feb 10):** Go-live for users

**Notes:**

- Test with real user scenarios
- Test with multiple users simultaneously
- Test edge cases thoroughly
- Document all issues with screenshots
- Prioritize critical bugs over minor UI issues
