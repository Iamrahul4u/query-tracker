# Query Tracker - Client Testing Checklist
**Version:** 1.1 | **Date:** February 2026

---

## Instructions
- Test each item and mark ✅ (Pass) or ❌ (Fail)
- Add notes in "Issues Found" column if something doesn't work
- Test on desktop Chrome browser first
- Test with Admin, Senior, and Junior accounts

---

## 1. ADD QUERY (Bucket A)

| # | Test Case | ✅/❌ | Issues |
|---|-----------|------|--------|
| 1.1 | Click "+" button → Add Query modal opens | | |
| 1.2 | Type description (max 200 chars) → Counter shows limit | | |
| 1.3 | Submit with description only → Query appears in Bucket A | | |
| 1.4 | Query Type defaults to "New" | | |
| 1.5 | Can change Query Type to SEO/Ongoing | | |
| 1.6 | "Allocate To" dropdown shows all users | | |
| 1.7 | Add with "Allocate To" → Query goes directly to Bucket B | | |
| 1.8 | Cannot submit empty description | | |
| 1.9 | **"+" button adds another query row** | | |
| 1.10 | **Can add multiple queries to same user** | | |

---

## 2. ASSIGN QUERY (A → B)

| # | Test Case | ✅/❌ | Issues |
|---|-----------|------|--------|
| 2.1 | **Junior:** Single click → Self-assigns instantly | | |
| 2.2 | **Senior/Admin:** Click assign → User picklist appears | | |
| 2.3 | Select user → Query moves to their Bucket B | | |
| 2.4 | Assignment Date auto-filled | | |
| 2.5 | Remarks field visible during assignment (optional) | | |

---

## 3. STATUS TRANSITIONS (Forward)

| # | Test Case | ✅/❌ | Issues |
|---|-----------|------|--------|
| 3.1 | B → C: Proposal Sent Date auto-filled | | |
| 3.2 | B → D: Proposal Sent Date auto-filled | | |
| 3.3 | C/D → E: SF Entry Date filled, GM Indicator visible | | |
| 3.4 | C/D → F: SF Entry Date filled, GM Indicator visible | | |
| 3.5 | Any → G: Discarded Date filled | | |
| 3.6 | **E/F modal: Event ID field visible** | | |
| 3.7 | **E/F modal: Event Title field visible** | | |

---

## 4. STATUS TRANSITIONS (Backward)

| # | Test Case | ✅/❌ | Issues |
|---|-----------|------|--------|
| 4.1 | B → A: Assignment Date cleared, moves to A | | |
| 4.2 | C/D → B: Proposal Sent Date cleared | | |
| 4.3 | E/F → C/D: SF Entry Date cleared | | |
| 4.4 | G → Previous: Discarded Date cleared, returns to original | | |

---

## 5. DELETE WORKFLOW (Bucket H)

| # | Test Case | ✅/❌ | Issues |
|---|-----------|------|--------|
| 5.1 | Delete query → Status shows "P.A." | | |
| 5.2 | Query appears in H with previous status shown | | |
| 5.3 | **Admin only:** ✓ and ✗ buttons visible | | |
| 5.4 | Admin ✓ → Query permanently deleted | | |
| 5.5 | Admin ✗ → Returns to previous bucket with **"Del-Rej"** | | |
| 5.6 | **Non-Admin:** No ✓/✗ buttons | | |

---

## 6. BUCKET VIEW

| # | Test Case | ✅/❌ | Issues |
|---|-----------|------|--------|
| 6.1 | Default view shows all 8 buckets (A-H) | | |
| 6.2 | Each bucket shows count (e.g., "A (5)") | | |
| 6.3 | **Header shows TOTAL = A+B+C+D+E+F (excludes G/H)** | | |
| 6.4 | Buckets scroll vertically if many queries | | |
| 6.5 | Click query card → Edit modal opens | | |

---

## 7. USER VIEW

| # | Test Case | ✅/❌ | Issues |
|---|-----------|------|--------|
| 7.1 | Switch to User View → Shows users as columns | | |
| 7.2 | Each user shows their queries grouped by bucket | | |
| 7.3 | Current user appears first by default | | |
| 7.4 | **Juniors:** Only see their own queries | | |
| 7.5 | **Seniors/Admins:** See all users | | |

---

## 8. FILTER BAR & SAVE VIEW ⭐

| # | Test Case | ✅/❌ | Issues |
|---|-----------|------|--------|
| 8.1 | View toggle: Bucket / User works | | |
| 8.2 | Layout toggle: Default / Linear works | | |
| 8.3 | Columns: 2 / 3 / 4 options work | | |
| 8.4 | Card view: Compact / Detail toggle works | | |
| 8.5 | Sort by dropdown: Shows date field options | | |
| 8.6 | Sort direction: ↓/↑ toggle | | |
| 8.7 | **"Apply to:" dropdown opens with checkboxes** | | |
| 8.8 | **"All Buckets" checked → All A-H checked** | | |
| 8.9 | **Uncheck one bucket → Shows "7 buckets"** | | |
| 8.10 | **Reset button → Returns to "All"** | | |
| 8.11 | **Green "Save View" button BEFORE search bar** | | |
| 8.12 | **Button only visible when changes made** | | |
| 8.13 | **Click Save View → Preferences saved** | | |
| 8.14 | **Refresh → Preferences persist** | | |

---

## 9. QUERY CARDS

| # | Test Case | ✅/❌ | Issues |
|---|-----------|------|--------|
| 9.1 | Card shows Query ID | | |
| 9.2 | Card shows description (50 chars, full on hover) | | |
| 9.3 | Card shows assigned user (5-6 char Display Name) | | |
| 9.4 | Card shows Query Type indicator (SEO/New/Ongoing) | | |
| 9.5 | **GM badge shows if GM Indicator checked** | | |
| 9.6 | Detail view shows all date fields | | |
| 9.7 | Compact view shows minimal info | | |
| 9.8 | **Queries grouped by Type: SEO → New → Ongoing** | | |

---

## 10. SEARCH

| # | Test Case | ✅/❌ | Issues |
|---|-----------|------|--------|
| 10.1 | Search by Query ID → Filters cards | | |
| 10.2 | Search by description → Filters cards | | |
| 10.3 | Clear search → All queries return | | |
| 10.4 | Search works across all buckets | | |

---

## 11. LINEAR VIEW

| # | Test Case | ✅/❌ | Issues |
|---|-----------|------|--------|
| 11.1 | Linear view shows buckets in rows | | |
| 11.2 | Row 1: A, B, C side by side | | |
| 11.3 | Row 2: D, E, F side by side | | |
| 11.4 | Row 3: G, H side by side | | |
| 11.5 | Horizontal scroll within each row | | |
| 11.6 | **Scroll one bucket → All in same row scroll together** | | |

---

## 12. LOAD +7 DAYS (F, G, H)

| # | Test Case | ✅/❌ | Issues |
|---|-----------|------|--------|
| 12.1 | **Default: Last 3 days visible in F, G, H** | | |
| 12.2 | **"Load +7 Days" button at bottom of F** | | |
| 12.3 | **"Load +7 Days" button at bottom of G** | | |
| 12.4 | **"Load +7 Days" button at bottom of H** | | |
| 12.5 | **Click → Expands to 10 days, then 17, 24...** | | |

---

## 13. GM INDICATOR

| # | Test Case | ✅/❌ | Issues |
|---|-----------|------|--------|
| 13.1 | **GM checkbox appears in E/F status modal** | | |
| 13.2 | **First entry to E/F → GM unchecked by default** | | |
| 13.3 | **E → F transition: Retains previous GM value** | | |
| 13.4 | **"GM" badge shows on card if checked** | | |

---

## 14. PERMISSIONS

| # | Test Case | ✅/❌ | Issues |
|---|-----------|------|--------|
| 14.1 | **Junior:** Can only self-assign | | |
| 14.2 | **Junior:** Cannot assign to others | | |
| 14.3 | **Senior/Admin:** Can assign to anyone | | |
| 14.4 | **Admin only:** Can approve/reject deletions | | |
| 14.5 | **Senior/Admin only:** Can see User View | | |

---

## 15. EDIT QUERY MODAL

| # | Test Case | ✅/❌ | Issues |
|---|-----------|------|--------|
| 15.1 | Click query → Modal opens with all fields | | |
| 15.2 | All relevant fields are editable | | |
| 15.3 | Status dropdown shows valid transitions | | |
| 15.4 | Save changes → Query updated | | |
| 15.5 | Cancel → No changes saved | | |
| 15.6 | **Bucket D: "What's Pending" field is mandatory** | | |
| 15.7 | **Audit Trail: Shows Added By, Assigned By, Last Edited** | | |

---

## 16. AUTO-REFRESH

| # | Test Case | ✅/❌ | Issues |
|---|-----------|------|--------|
| 16.1 | Wait 60 seconds → Data refreshes automatically | | |
| 16.2 | Header shows last refresh time | | |
| 16.3 | Manual refresh button works | | |

---

## 17. RESPONSIVE (Mobile)

| # | Test Case | ✅/❌ | Issues |
|---|-----------|------|--------|
| 17.1 | Mobile: Filters moved to drawer | | |
| 17.2 | Mobile: Cards stack vertically | | |
| 17.3 | Tablet: Layout adjusts appropriately | | |

---

## Sign-Off

| Role | Tester Name | Date | Status |
|------|-------------|------|--------|
| Admin | | | ☐ Approved / ☐ Issues Found |
| Senior | | | ☐ Approved / ☐ Issues Found |
| Junior | | | ☐ Approved / ☐ Issues Found |

### Critical Issues:
_List any blocking issues here:_

---
