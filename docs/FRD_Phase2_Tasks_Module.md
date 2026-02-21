# FRD – Phase 2
## Tasks Module (Within Query Tracker Dashboard)

---

## 1. Overview

A separate tab titled **'Tasks'** must be created within the existing dashboard.

The Tasks tab will follow largely the same view types and logic as the Queries module but will function independently.

- Tasks will be created in Bucket A, similar to queries.
- Tasks will only be visible when the Tasks tab is selected.
- Queries will not appear under the Tasks tab, and vice versa.

---

## 2. Visibility & Access Logic

### Bucket A
All users can view Tasks in Bucket A.

---

### Assignment Rules

#### Junior Users
- Can only self-assign tasks.

#### Senior Users
- Can assign tasks to any junior user, any senior user, or themselves.
- **Group assignment:** Senior user can assign task at once to one or more users, either individually or as a group.
- **Task assignment to trigger notification** on the dashboard + go as an email to the assignee (email to go to assignee, pseudo admin + admin).
- Post assignment:
  - Can see tasks assigned to juniors.
  - Can see tasks assigned to themselves.
  - Cannot see task status or movement of tasks assigned to other senior users, pseudo admin, or admin.
  - Can access and edit tasks assigned to junior users.

#### Pseudo Admin & Admin
- Can view all tasks across all users.
- Can assign tasks to anyone.
- Can view full movement trail and status updates for all tasks.

---

## 3. Red Flag Icon

Option for some tasks to be tagged with a **red flag icon** (no text). For your understanding, this is for the task to be flagged as urgent/critical but as of now we only want the icon without any flag text to be displayed. Any tasks flagged with this to show at the top of that bucket & type.

---

## 4. Status Buckets (For Tasks Only)

Only the following buckets will apply to Tasks:

| Bucket | Label |
|--------|-------|
| A | New & Unassigned |
| B | Assigned & Pending / Recurring |
| C | Majorly finished with some parts pending |
| F | Finished & closed |
| H | Discarded / Deleted |

> If feasible, these buckets may be renamed specifically for the Tasks module. The Query module schema remains unchanged.

---

## 5. Task Types

Task types will function similarly to Query types (e.g., SEO, New, Ongoing, etc.).

**Available Task Types:**
- a) Ongoing / Recurring
- b) One-Time

---

## 6. Mandatory Fields (For All Task Types)

1. Added Date
2. Assigned Date

These will follow the exact same logic currently used in the Query module.

---

## 7. Date & Milestone Logic

### A. One-Time Tasks

**Targeted Completion Date:**
- Not auto-populated.
- To be entered manually.
- Default selection: No selection.
- It is possible for a one-time task to have no targeted completion date.

### B. Ongoing / Recurring Tasks

The following milestone-related fields:
- Will not be auto-populated.
- Must be entered manually.
- Default selection: No selection.
- **Option for reminders with quick selection to be available namely:** Daily, Weekly, Monthly, Quarterly, Half-yearly, Annually – functionality to snooze / postpone reminders.
- It is possible for tasks to have no 'Next milestone targeted date' and/or no 'Milestone actual completed date'.

---

## 8. Milestone Structure (For Ongoing/Recurring Tasks)

Each task may include milestone tracking as follows:

### Milestone Fields (Per Milestone)

- Milestone number (auto populated Sr. No. — incremental by default but user can reorder)
- Task ID (unique id) — *to be decided if this is to be visible to the user*
- Milestone Description (Text)
- Milestone Targeted Date
- Milestone Actual Completed Date
- Remarks

### Allocation Requirement

- The first milestone (Milestone 1) must be defined at the time of allocation.
- Date fields remain optional at allocation stage.

### Additional Milestones

- The assigned user, admin, or pseudo admin can add further milestones.
- **Maximum 10 open (active) milestones** can exist at any given time.
- Completed milestones do not count toward this limit.

### Completed Milestones Display Logic

- Completion date must be mandatorily filled for a milestone to be marked complete.
- Completed milestones are **to be segregated in a section** and move below active milestones in descending order **(last completed to show first)**.
- By default, only the latest 3 completed milestones will be visible in collapsed single-line format in descending order, but will appear after the live milestones created for that task.

  > Example: `"Milestone 1 – Completed on: [Date]"`

- On clicking, full milestone history/trail becomes visible.

---

## Appendix — Milestone Structure Reference (Ongoing/Recurring)

For clarity, milestone fields are structured as follows per entry:

```
Milestone Sr. No.: [Auto-incremented, user can reorder]
Task ID: [Unique ID — visibility TBD]

1.
  Define next milestone: [Text]
  Next milestone targeted date: [Date / No Selection]
  Milestone actual completed date: [Date / No Selection]

2.
  Define next milestone: [Text]
  Next milestone targeted date: [Date / No Selection]
  Milestone actual completed date: [Date / No Selection]

3.
  Define next milestone: [Text]
  Next milestone targeted date: [Date / No Selection]
  Milestone actual completed date: [Date / No Selection]
```

> Fields for the first milestone (Sr. 1) need to be filled during allocation. Date fields are **not mandatory** at that stage.
>
> Post allocation, the assigned user and/or admin and pseudo admin can add further milestones. A maximum of **10** milestones can be kept open at any given point in time. This excludes milestones that are completed (completion date must be filled mandatorily for completed milestones); these will go down and appear at the bottom (descending order) under that task. A maximum of **3 completed milestones** will appear by default as single-line entries:
>
> Example: `"Milestone 1 – completed date: __________"`
>
> Upon clicking, the history/trail becomes visible.

---

*Document Version: Phase 2 Draft | Last Updated: 21 Feb 2026*
