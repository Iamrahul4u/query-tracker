# Add Query Modal Redesign - Completed

## Date: February 4, 2026

## Changes Implemented

### 1. **Removed GM Indicator**

- ✅ GM Indicator checkbox completely removed from Add Query Modal
- ✅ All new queries now have `GmIndicator: "FALSE"` by default
- ✅ GM Indicator only appears in Edit Modal when status is E or F (as per requirements)

### 2. **Compact Layout**

- ✅ Reduced modal padding from `p-6` to `p-4`
- ✅ Reduced header padding from `px-6 py-4` to `px-4 py-3`
- ✅ Reduced header font size from `text-lg` to `text-base`
- ✅ Changed max-width from `max-w-md` to `max-w-2xl` for better horizontal space usage

### 3. **Single-Row Layout**

- ✅ **Row 1**: Query Description (flex-1) + Query Type buttons (w-48) in same row
- ✅ Query Description: Compact input with `px-2 py-1.5` padding
- ✅ Query Type: Inline buttons with minimal spacing (`gap-1`), smaller text (`text-xs`)
- ✅ Labels use `text-xs` for compact appearance

### 4. **Character Counter**

- ✅ Moved below input row with error message
- ✅ Minimal height (`min-h-[16px]`) to prevent layout shift

### 5. **Allocate To Field**

- ✅ Only shows AFTER first query is added (`showAllocate` state)
- ✅ Appears in highlighted blue box (`bg-blue-50 border-blue-200`)
- ✅ Optional field at the end of form
- ✅ Persists across multiple adds for same-user allocation

### 6. **Button Layout**

- ✅ Removed separate "Add +" button from initial view
- ✅ Primary "Add Query" button always visible
- ✅ After first add, "Add +" button appears for multi-add workflow
- ✅ Cancel button changes to "Done" after queries added
- ✅ Added counter shows "✓ X added" in footer

### 7. **Multi-Add Workflow**

1. User enters description + type → clicks "Add Query"
2. Query added, form resets, "Allocate To" field appears
3. "Add +" button appears for adding more queries
4. User can allocate to same user for multiple queries
5. "Done" button closes modal

### 8. **Code Cleanup**

- ✅ Removed `gmIndicator` state variable
- ✅ Removed `keepOpen` state (replaced with `showAllocate`)
- ✅ Updated `handleSubmit` to accept `keepModalOpen` parameter
- ✅ Removed `handleAddAnother` function (logic moved to button onClick)
- ✅ All TypeScript diagnostics passing

## Technical Details

### State Variables

```typescript
const [description, setDescription] = useState("");
const [queryType, setQueryType] = useState("New");
const [allocateTo, setAllocateTo] = useState("");
const [error, setError] = useState("");
const [addedQueries, setAddedQueries] = useState<string[]>([]);
const [showAllocate, setShowAllocate] = useState(false); // NEW
```

### handleSubmit Signature

```typescript
const handleSubmit = async (
  e: React.FormEvent,
  keepModalOpen: boolean = false,
) => {
  // ...
  if (keepModalOpen) {
    setDescription("");
    setError("");
    setShowAllocate(true); // Show allocate after first add
  } else {
    onClose();
  }
};
```

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Add New Query                                        [X] │
├─────────────────────────────────────────────────────────┤
│ [Query Description (flex-1)] [SEO|New|Ongoing (w-48)]  │
│ [Error]                              [Counter: 0/200]   │
│                                                          │
│ [Allocate To dropdown] ← Only after first add          │
├─────────────────────────────────────────────────────────┤
│ ✓ X added          [Done] [Add Query] [Add +]          │
└─────────────────────────────────────────────────────────┘
```

## Verification Checklist

- [x] GM Indicator removed from Add Query Modal
- [x] Modal is compact with minimal spacing
- [x] Description + Type in single row
- [x] Allocate To appears after first add
- [x] Multi-add workflow works correctly
- [x] Character counter visible and accurate
- [x] All new queries have GmIndicator = FALSE
- [x] TypeScript diagnostics passing
- [x] No console errors

## Files Modified

- `app/components/AddQueryModal.tsx` - Complete redesign

## Related Requirements

- **Phase 9**: Add Query Enhancements (200 char limit, Allocate To, multi-add)
- **Phase 6**: GM Indicator (only in Edit Modal for E/F status)
- **Requirements Doc**: Add Query Flow section

## Status

✅ **COMPLETE** - All user requirements implemented and verified
