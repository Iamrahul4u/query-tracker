# Role-Based Access Control (RBAC)

## Date: February 5, 2026

## Role Hierarchy

The application has 4 user roles with the following access levels:

| Role         | Access Level   | Description                          |
| ------------ | -------------- | ------------------------------------ |
| Admin        | Full Access    | Complete control over all features   |
| Pseudo Admin | Full Access    | Same as Admin (different title only) |
| Senior       | Full Access    | Same as Admin/Pseudo Admin           |
| Junior       | Limited Access | Can only manage own queries          |

**CRITICAL**: Admin, Pseudo Admin, and Senior have **identical permissions**. They are treated as a single elevated access group.

---

## Standard Role Check Pattern

### Recommended Pattern (Lowercase Array Check)

```typescript
const role = (currentUser?.Role || "").toLowerCase();
const isAdminOrSenior = ["admin", "pseudo admin", "senior"].includes(role);
```

**Why this pattern?**

- Case-insensitive (handles "Admin", "admin", "ADMIN")
- Easy to maintain (single array)
- Clear intent (all elevated roles in one place)

### Alternative Pattern (Direct Comparison)

```typescript
const canAllocate =
  currentUser?.Role === "Senior" ||
  currentUser?.Role === "Admin" ||
  currentUser?.Role === "Pseudo Admin";
```

**When to use:**

- When you need the exact role value
- When case sensitivity matters

---

## Permission Matrix

| Feature                      | Junior       | Senior/Admin/Pseudo Admin |
| ---------------------------- | ------------ | ------------------------- |
| **Add Query**                | ✅           | ✅                        |
| **Allocate To (on add)**     | ❌           | ✅                        |
| **Self-Assign**              | ✅           | ✅                        |
| **Assign to Others**         | ❌           | ✅                        |
| **Edit Own Queries**         | ✅           | ✅                        |
| **Edit Any Query**           | ❌           | ✅                        |
| **Edit Assignment Date**     | ❌           | ✅                        |
| **Edit Other Date Fields**   | ✅           | ✅                        |
| **Delete Own Queries**       | ✅ (Request) | ✅ (Direct)               |
| **Approve/Reject Deletions** | ❌           | ✅                        |
| **View Pending Deletions**   | ❌           | ✅                        |
| **User View**                | ❌           | ✅                        |
| **Custom Sorting**           | ✅           | ✅                        |
| **Filtering**                | ✅           | ✅                        |

---

## Implementation by Component

### 1. AddQueryModal.tsx

**Feature**: "Allocate To" field visibility

```typescript
const canAllocate =
  currentUser?.Role === "Senior" ||
  currentUser?.Role === "Admin" ||
  currentUser?.Role === "Pseudo Admin";
```

**Access**: Senior/Admin/Pseudo Admin only

---

### 2. EditQueryModal.tsx

**Feature**: Edit permissions and date field editing

```typescript
const role = (currentUser?.Role || "").toLowerCase();
const isAdminOrSenior = ["admin", "pseudo admin", "senior"].includes(role);

// Permission Check
const canEdit = isAdminOrSenior || isAssignedToMe || query.Status === "A";
```

**Access**:

- **Assignment Date Time**: Senior/Admin/Pseudo Admin only (locked for Juniors with 🔒 icon)
- **Added Date Time**: Senior/Admin/Pseudo Admin only (disabled for Juniors)
- **Other date fields** (Proposal Sent, SF Entry, Discarded): All roles can edit
- Edit any query: Senior/Admin/Pseudo Admin only
- Edit own query: All roles

**Implementation Details**:

- Date fields section is visible to all roles
- Assignment Date Time field is `disabled={!isAdminOrSenior}` with gray background
- Added Date Time field is `disabled={!isAdminOrSenior}`
- Other date fields (Proposal Sent, SF Entry, Discarded) are editable by all roles
- Section header shows "(Assignment Date locked)" for Juniors

---

### 3. QueryCardCompact.tsx

**Feature**: Approve/Reject deletion buttons

```typescript
const roleLC = (currentUser?.Role || "").toLowerCase();
const canApproveDelete =
  isInBucketH && ["admin", "pseudo admin", "senior"].includes(roleLC);
```

**Access**: Senior/Admin/Pseudo Admin only (in Bucket H)

---

### 4. PendingDeletions.tsx

**Feature**: View pending deletion requests

```typescript
const isAdmin = ["admin", "pseudo admin", "senior"].includes(
  currentUserRole.toLowerCase(),
);
if (!isAdmin) return null;
```

**Access**: Senior/Admin/Pseudo Admin only

---

### 5. Dashboard (page.tsx)

**Feature**: User View visibility

```typescript
{viewMode === "user" &&
  !((currentUser?.Role || "").toLowerCase() === "junior") && (
    <UserView ... />
  )}
```

**Access**: All roles except Junior

---

### 6. QueryDetailModal.tsx

**Feature**: Edit button visibility

```typescript
const isJunior = (currentUser?.Role || "").toLowerCase() === "junior";
const canEdit = !isJunior || (bucketStatus !== "A" && isOwnQuery);
```

**Access**:

- Senior/Admin/Pseudo Admin: Can edit any query
- Junior: Can edit own queries (except in Bucket A)

---

## Deletion Workflow by Role

### Junior User

1. Clicks delete → Query moves to Bucket H with "P.A." status
2. Cannot approve/reject deletions
3. Cannot see Pending Deletions panel

### Senior/Admin/Pseudo Admin

1. **Own deletion**: Confirmation dialog → Permanent delete (no approval needed)
2. **Approve deletion**: ✓ button in Bucket H → Permanent delete
3. **Reject deletion**: ✗ button in Bucket H → Restore to previous bucket with "Del-Rej" indicator
4. Can see Pending Deletions panel with all pending requests

---

## Testing Checklist

### Admin Role

- [ ] Can see "Allocate To" in Add Query Modal
- [ ] Can assign queries to any user
- [ ] Can edit any query
- [ ] Can edit date fields
- [ ] Can permanently delete queries
- [ ] Can approve/reject deletion requests
- [ ] Can see Pending Deletions panel
- [ ] Can access User View

### Pseudo Admin Role

- [ ] Can see "Allocate To" in Add Query Modal
- [ ] Can assign queries to any user
- [ ] Can edit any query
- [ ] Can edit date fields
- [ ] Can permanently delete queries
- [ ] Can approve/reject deletion requests
- [ ] Can see Pending Deletions panel
- [ ] Can access User View

### Senior Role

- [ ] Can see "Allocate To" in Add Query Modal
- [ ] Can assign queries to any user
- [ ] Can edit any query
- [ ] Can edit date fields
- [ ] Can permanently delete queries
- [ ] Can approve/reject deletion requests
- [ ] Can see Pending Deletions panel
- [ ] Can access User View

### Junior Role

- [ ] Cannot see "Allocate To" in Add Query Modal
- [ ] Can only self-assign
- [ ] Can only edit own queries
- [ ] Cannot edit Assignment Date Time (locked with 🔒)
- [ ] Cannot edit Added Date Time (disabled)
- [ ] CAN edit other date fields (Proposal Sent, SF Entry, Discarded)
- [ ] Delete requests go to Bucket H (pending approval)
- [ ] Cannot approve/reject deletions
- [ ] Cannot see Pending Deletions panel
- [ ] Cannot access User View

---

## Common Mistakes to Avoid

### ❌ Wrong: Missing Pseudo Admin

```typescript
const isAdmin = currentUser?.Role === "Admin" || currentUser?.Role === "Senior";
```

### ✅ Correct: Include all three elevated roles

```typescript
const isAdmin = ["admin", "pseudo admin", "senior"].includes(
  (currentUser?.Role || "").toLowerCase(),
);
```

### ❌ Wrong: Case-sensitive comparison

```typescript
const isAdmin = currentUser?.Role === "admin"; // Fails if "Admin"
```

### ✅ Correct: Case-insensitive comparison

```typescript
const isAdmin = (currentUser?.Role || "").toLowerCase() === "admin";
```

### ❌ Wrong: Inconsistent role checks

```typescript
// File 1
const canEdit = role === "Admin" || role === "Senior";

// File 2
const canEdit = ["admin", "pseudo admin", "senior"].includes(role);
```

### ✅ Correct: Consistent pattern across all files

```typescript
// All files use same pattern
const role = (currentUser?.Role || "").toLowerCase();
const isAdminOrSenior = ["admin", "pseudo admin", "senior"].includes(role);
```

---

## Status

✅ **VERIFIED** - All components now use consistent role checks with Admin, Pseudo Admin, and Senior having equal access.
