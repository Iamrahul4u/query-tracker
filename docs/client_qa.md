# Client Questions & Answers (A-J)

## A) Sorting
→ **Confirmed by Smit.** Default sorting per bucket noted in requirements.

---

## B) Assigned Date blank for H
→ **Yes, correct.** Assigned Date can be blank for both G and H.

---

## C) Assign Button + Query Type Change

**Recommendation:**
- **Default View**: Single row with compact action icons on hover (Assign, Edit, Delete).
- **Query Type Change**: Done via the **Edit modal** (click query → modal opens → change type).
- **Add Query modal**: Remains as discussed (input line, 200 char limit, "+" for multi-add, "Allocate To" picklist).

**Assign Button Behavior:**
| Role | Behavior |
|------|----------|
| Junior | Single "Self Assign" button (instant) |
| Senior/Admin | Two buttons: "Self Assign" + "Assign" (inline picklist) |

If client prefers single-click/double-click, we can implement that instead.

---

## D) Display Name Limit
→ **Updated**: 5-6 characters max. If first name exceeds, truncate to first 5-6 chars.

---

## E) Query Description (50 chars)
→ **Confirmed**: 50 chars visible in row; full text shown on hover (tooltip).

---

## F) Event ID / Event Title Rename

| Field | Rename To |
|-------|-----------|
| Event ID | Event ID in SF |
| Event Title | Event Title in SF |

**Where they appear**:
- Shown in **Edit Query Modal** for buckets E and F only.
- **Optional fields** (not mandatory).

**Implementation**:
- **Sheet columns**: Keep as-is (internal names).
- **UI labels**: Show renamed labels via config file.

---

## G) CS-wise View (User View)

"CS" = Customer Service team member. The FRD defines **two view types**:

### View Type I – Bucket View (Default)
- Queries grouped by **status bucket** (A→H)
- Within each bucket: grouped by user (for Seniors/Admins)

### View Type II – CS View (User View)
- Queries grouped by **user** (columns = team members)
- Under each user: buckets A→H
- **Seniors/Admins only** (Juniors see only their own queries)

**Linear Layout for CS View**:
- Users displayed as horizontal columns
- Same Default/Detail view toggle applies
- Same sorting, filtering, actions as Bucket View

---

## H) Scalability (12 → 50 users)
→ **No issue.** Architecture handles:
- Google Sheets API (thousands of rows)
- Client-side filtering and pagination
- Lazy loading

**For 50+ users**:
- CS View may need horizontal scroll or user filter dropdown
- Consider pagination for user columns

---

## J) Field Label Customization (Post-Delivery)

**Recommendation: Do NOT modify fields yourself.**

- **Google Sheets columns**: Changing column names will **break the app**. The code expects specific column names.
- **Frontend code**: Modifying and redeploying code is not recommended for non-developers.

**If you need field labels renamed:**
→ Request the change from the developer. We will update the UI labels safely without breaking functionality.

This ensures the app remains stable and any changes are tested before deployment.

---

## Summary Table

| Question | Answer |
|----------|--------|
| A | Sorting confirmed |
| B | Assigned Date can be blank for H (same as G) |
| C | Query Type via Edit modal; Add Query remains |
| D | Display Name: 5-6 chars max |
| E | 50 chars visible, full on hover |
| F | Rename in UI only (not in sheets) |
| G | CS View = User View (columns = users) |
| H | Scalability: No issue, may need filter for 50+ |
| J | Do NOT modify fields yourself. Request changes from developer. |
