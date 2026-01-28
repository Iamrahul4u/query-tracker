# Merged Implementation Plan - Query Tracker Enhancement & Optimization

**Date:** January 28, 2026  
**Status:** Planning  
**Priority:** High  
**Goal:** Incremental feature additions with architectural improvements

---

## Overview

This plan merges Phase 2 (feature enhancements) and Phase 3 (architectural optimizations) into a single incremental implementation strategy. Features are ordered to maximize value delivery while building a solid technical foundation.

**Current Health Score:** 72/100 🟡  
**Target Health Score:** 90/100 🟢

---

## 🎯 WEEK 1: Foundation & Quick Wins

### Day 1: Infrastructure Setup (4-5 hours)

#### 1.1 LocalStorageCache Implementation

**Impact:** 🔥 Critical - Reduces API calls by ~80%  
**Effort:** 2-3 hours

**Problem:**

- Every navigation triggers fresh API calls
- No offline capability
- Slow initial load (2-3s)

**Solution:** Implement caching layer with 5-minute TTL

**Files to Create:**

- `web-app/app/utils/localStorageCache.ts`

**Files to Modify:**

- `web-app/app/stores/queryStore.ts` - Integrate cache

**Requirements:**

1. Cache saves on first load
2. Cache loads on subsequent visits (instant UI)
3. Cache expires after 5 minutes
4. Background refresh updates cache
5. Cache clears on logout

**Verify:**

- [ ] First visit: Data fetches from API, saves to cache
- [ ] Return visit: Instant load from cache
- [ ] Background refresh updates cache silently
- [ ] Cache expires after 5 minutes
- [ ] Logout clears all cached data

---

#### 1.2 Toast Notification System

**Impact:** 🔥 High - Better user feedback  
**Effort:** 2-3 hours

**Problem:**

- No visual feedback for actions
- Generic error messages
- Poor UX

**Solution:** Toast notification system with auto-dismiss

**Files to Create:**

- `web-app/app/components/Toast.tsx`
- `web-app/app/hooks/useToast.ts`

**Files to Modify:**

- `web-app/app/stores/queryStore.ts` - Add toast calls
- `web-app/app/dashboard/page.tsx` - Render toast container

**Requirements:**

1. Success toasts (green, ✓ icon)
2. Error toasts (red, ✗ icon)
3. Warning toasts (yellow, ⚠ icon)
4. Auto-dismiss after 3 seconds
5. Multiple toasts stack
6. Manual close button

**Verify:**

- [ ] Toast appears on action
- [ ] Auto-dismisses after 3s
- [ ] Multiple toasts stack properly
- [ ] Close button works
- [ ] Different types show correct colors/icons

---

### Day 2: Quick Feature Wins (5-6 hours)

#### 2.1 GM Indicator Enhancement

**Impact:** 🟡 Medium - User requested feature  
**Effort:** 2-3 hours

**Problem:**

- Manual checkbox exists but icon not showing
- Need visual indicator for Gmail queries

**Solution:** Add Gmail icon (✉️) for queries in buckets E & F

**Files to Modify:**

- `web-app/app/components/AddQueryModal.tsx` - Add checkbox
- `web-app/app/components/EditQueryModal.tsx` - Add checkbox
- `web-app/app/components/QueryCardCompact.tsx` - Show icon
- `web-app/app/utils/sheets.ts` - Ensure GM Indicator field

**Requirements:**

1. Checkbox in Add Query modal
2. Checkbox in Edit Query modal
3. Red Gmail icon (✉️ #ea4335) shows when checked
4. Only shows for buckets E & F
5. Saves to Google Sheets

**Verify:**

- [ ] Checkbox appears in both modals
- [ ] Icon shows for E/F buckets when checked
- [ ] Icon doesn't show for other buckets
- [ ] Icon doesn't show when unchecked
- [ ] Data persists to Google Sheets

---

#### 2.2 Dynamic Column Count Selection

**Impact:** 🟡 Medium - Improves flexibility  
**Effort:** 3-4 hours

**Problem:**

- Fixed 4 columns breaks at 80% zoom
- Users want more control

**Solution:** Dropdown to select 2-7 columns

**Files to Modify:**

- `web-app/app/components/CollapsibleFilterBar.tsx` - Add selector
- `web-app/app/hooks/useDashboardPreferences.ts` - Save preference
- `web-app/app/dashboard/page.tsx` - Pass column count
- `web-app/app/components/BucketViewLinear.tsx` - Dynamic grid
- `web-app/app/components/BucketViewDefault.tsx` - Dynamic grid

**Requirements:**

1. Dropdown shows options 2-7 (default: 4)
2. Layout updates immediately
3. Preference saves to localStorage
4. Works at 80-110% zoom
5. Buckets distribute evenly

**Verify:**

- [ ] Dropdown shows 2-7 options
- [ ] Layout updates on selection
- [ ] Preference persists
- [ ] Works at 80% zoom
- [ ] Works at 110% zoom

---
