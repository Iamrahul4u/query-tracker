# Requirements from 5th February Meeting

This document consolidates all requirements from the February 5th, 2026 meeting. Organized by category with proper mapping to existing functionality.

**Meeting Date:** February 5th, 2026  
**Recording:** [Fathom (91 mins)](https://fathom.video/share/fJFFToAaqumLu739v_tsBVGxkK3EVxVs)

---

## 1. Add Query Modal Improvements

### User Dropdown Placement
The user dropdown should be placed **inside** the Add Query modal alongside other fields:
- Query Description
- Query Type
- **User Dropdown** (for assignment)

### User Selection Persistence
When adding multiple queries consecutively:
- The last selected user should persist as the default for the next record
- After changing to a different user, all subsequent queries will default to that newly selected user
- This saves time when bulk-entering queries for the same user

### Quick Save (Draft Mode)
Implement a **"Quick Save"** feature that:
- Saves draft entries to browser's local storage (NOT to Google Sheet)
- Uses existing StateManager architecture for consistency
- On failure (e.g., token expiry), shows message: "Saved as draft. Please re-login to submit."
- When modal reopens after login, previously saved drafts are restored
- Useful when entering 10+ queries at once

---

## 2. Assign Dropdown Fixes

### Position Correction
**Current Issue:** Dropdown/picklist opens offset to the LEFT of the button.
**Fix Required:** 
- Dropdown should appear directly **below the icon/button**
- Align to the **right edge** of the button (button → picklist below and to the right)

### Close on Hover Away
**Current Issue:** When user hovers away from the query card, dropdown doesn't close.
**Fix Required:** Dropdown should close when cursor leaves the dropdown area.

### Scrollable Dropdown
**Current Issue:** User list is not scrollable; uses `overflow: hidden`.
**Fix Required:** 
- Make the user list scrollable when it exceeds visible area
- Should be able to scroll through 12+ users

### Search Functionality
- Add search box **inside the dropdown/picklist**
- Users can type to filter users by name
- Filters by Display Name, Name, or Email

### Dropdown Width
- Increase dropdown width by approximately **20%** for better readability

---

## 3. Assignment Workflow

### Quick Actions (From Card)
- **Self-Assign** button works directly from the card (one-click)
- **Assign to Others** dropdown works directly from the card
- **Reassign** should also work from the card without opening modal

### Modal Behavior
When opening the Edit Modal:
- If query is **unassigned** and user assigns someone → automatically select **Bucket B**
- **"Assign To"** field should appear **first/prominently** in the modal
- If moving directly from Bucket A to Bucket C without assignment → should not allow (must assign first)
- Moving to Bucket B should show the assign dropdown in modal

### Assignment Before Status Change
If attempting to change status without assigning a user:
- Block the status change
- Show notification: "Please assign a user first before changing status"
- This ensures proper workflow where queries are always assigned before moving forward

---

## 4. Expandable Bucket View (4×8 Matrix)

### Trigger
- Click on the **count badge** (e.g., "4", "29", "50") in bucket header
- Opens a full-screen expanded modal

### Display Format
- **4 columns × 8 rows** = 32 queries visible on first view
- Like a spreadsheet/table view but with action buttons
- If bucket has more than 32 queries (e.g., 50), first 32 visible on initial view
- Scroll down to see remaining queries (e.g., "18 more below")

### Query Organization
- Group by **Query Type subheaders**: SEO Query → New → Ongoing
- Scrollable if more than 32 queries
- Next bucket starts after current bucket ends (left-to-right flow)
- Bucket title/header should appear before next bucket's queries

### Action Buttons (Same as Normal View)
- Self-Assign button
- Assign to Others dropdown
- Edit button
- All quick actions remain available

### Modal Positioning
- **Do NOT overlap** the main header (Query Tracker logo, view toggles)
- Expanded view occupies the area below the header bar

### Close Button
- Visible close button to return to normal view

### User View Expand
- In User View: expand user → show all their buckets
- Same bucket-wise grouping with bucket headers

---

## 5. Header Total Click

- Total count in header (e.g., "Total: 156") should be **clickable**
- If clicked → shows full expanded view of ALL queries (combined all buckets)
- Provides quick overview of entire workload

---

## 6. View Filters

### User Selection (Both Views)
- **Multi-select dropdown** for Users (similar to bucket selection in sorting)
- Click button → shows list of all users
- User can select **specific users** or **"All"**
- **Search box** inside the dropdown to find users quickly
- Selected users' columns/queries are displayed

### Bucket Selection (Both Views)
- **Multi-select dropdown** for Buckets 
- Similar to existing bucket selection in sorting options
- User can select specific buckets to view
- Selected buckets are displayed, others hidden

### Combined Filters
- Both filters available in both views
- User filter + Bucket filter can be applied together
- Helps when user count increases to 50+

---

## 7. Optional Fields for E/F Transitions

**Current Issue:** When moving queries to Bucket E or F, certain fields (Event ID, Event Title in SF) are mandatory.
**Fix Required:**
- Make Event ID and Event Title fields **optional** (not mandatory)
- User should be able to fill these later if needed
- Transition to E/F should not be blocked by empty optional fields

---

## 8. Default Query Type

- Default selection: **"New"**
- Must show selected type in UI (no blank selection)
- User can change to SEO or Ongoing if needed

---

## 9. Delete Workflow Fix

**Current Issue:** Admin delete action **directly removes the query from the Google Sheet entirely**.

**Expected Behavior:**
1. Delete action should **NEVER remove from sheet**
2. Should mark query as deleted and **move to Bucket H** (Deleted bucket)
3. Shows in Bucket H with "Pending Approval" status
4. **Even when Admin approves or deletes any query** → stays in Deleted bucket (not removed from sheet)
5. All deleted queries remain in the sheet with proper status tracking

### Proper Flow
```
Delete → Mark as Deleted → Move to Bucket H → Show "P.A." status → Admin Approve/Reject → Query remains in Bucket H
```

---

## 10. Date Display in Compact View

### Primary Date Always Visible
In compact view mode:
- By default, show the **primary date** for the bucket
- The date should always be visible when no hover

### Action Buttons on Hover
When user hovers over the query card:
- **Show action buttons on TOP of the date** (overlay style)
- Use **white background** behind buttons to cover the date
- Avoids jittery swap behavior
- When hover ends, action buttons disappear and date is visible again

### Tooltip on Hover (Date Area)
When hovering over the date area, show tooltip with:
- **All available dates** for the query (not just primary)
- All bucket-relevant dates displayed

---

## 11. Bucket Height & Visibility

### Default: Show More Queries
- By default, maximize visible queries without scrolling
- Currently showing only 4 rows; should show 8+ if space permits

### Expand Top Row Height
- When viewing, the row heights should take more screen space
- Currently E, F, G, H headers visible in viewport taking space
- Increase height of top row (A, B, C) to show more queries
- This is about **expanding row height**, not removing E, F, G, H

---

## 12. Linear vs Non-Linear Scroll

### Linear View
- All buckets scroll **together** (synchronized single scroll)
- Useful for side-by-side comparison

### Non-Linear View (Default)
- Each bucket/user column scrolls **independently**
- Useful for focused work on one bucket

### Scroll Bar Visibility
- Clear, easy-to-use scroll bars
- Important for navigation

---

## 13. Search Label Fix

**Current Issue:** Search placeholder just says "Search" or "Search ID and description"
**Fix Required:** Should clearly say **"Search Description"** for clarity

---

## 14. Mobile View

- **Exclude from Phase 1**
- Desktop/web is the priority
- Can be addressed in future phases

---

## Phase 2: Future Features

### 1. Audit Trail Enhancements
Keep current implementation for Phase 1. Future enhancements:
- Show in Edit Modal (not just View)
- Log what was changed (old → new values)
- Full lifecycle history

### 2. Drag and Drop
- Drag query from one bucket to another
- Opens Edit modal if mandatory fields needed for new bucket
- Drag to reorder buckets in view
- Drag to reorder users in User View
- Requires significant refactoring

### 3. Filter Persistence
- Filter configurations should save across sessions

### 4. Resizable Bucket Height
- Orange line at bottom of bucket as drag handle
- Drag to resize bucket height
- Preference saves per user

---

## Testing Requirements

- Add dates to test queries across all buckets
- Test sorting behavior with real data
- Verify all bucket transitions work correctly

---

## Timeline

| Deliverable | Target Date |
|-------------|-------------|
| Development Complete | Friday, Feb 7th |
| Phase 1 Ready for Review | Saturday, Feb 8th (First Half) |
| Client Review | Saturday afternoon / Sunday |
| Bug Fixes | Sunday, Feb 9th |
| Go-Live for Users | Monday, Feb 10th |

---

## Notes

1. **Long-term Project**: This application will be used for the next 2+ years
2. **Iterations Expected**: User feedback after go-live will inform future improvements
3. **Perfection Goal**: Aim for high quality in all features
