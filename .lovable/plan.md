

## Problem: Duplicate Warning Dialog Not Showing

**Root Cause**: The duplicate check on line 308 of `CourseBooking.tsx` has this guard:
```
if (!skipDuplicateCheck && !isAdmin && !isTrainer)
```

If you are logged in as an admin or trainer, the check is completely skipped and no dialog appears. This was intentionally done to exempt admins/trainers, but based on your feedback it should show the warning for everyone.

**Secondary issue**: The user registrations query (line 146-149) fetches ALL registrations without filtering by status. The `.find()` on line 179 could return a `cancelled` or `waitlist_cancelled` record instead of an active one, causing `is_registered` to be `false` even when the user has an active registration. This would also prevent the duplicate check from finding the existing booking.

## Plan

### 1. Remove admin/trainer exemption from duplicate warning
In both `CourseBooking.tsx` and `DayCourseDialog.tsx`, change the condition from:
```
if (!skipDuplicateCheck && !isAdmin && !isTrainer)
```
to:
```
if (!skipDuplicateCheck)
```
The warning is informational only (user can proceed), so there's no reason to skip it for admins/trainers.

### 2. Fix user registration status query
In `CourseBooking.tsx` line 146-149, filter the registrations query to only return active statuses:
```
.in('status', ['registered', 'waitlist'])
```
This ensures `is_registered` and `is_waitlisted` are correctly determined, and the duplicate check finds existing active bookings.

Same fix in `DayCourseDialog.tsx` for its equivalent query.

### Files to Modify
- `src/components/CourseBooking.tsx` (2 changes)
- `src/components/DayCourseDialog.tsx` (2 changes)

