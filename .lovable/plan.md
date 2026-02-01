
# Fix: Calendar Views Not Showing Guest Registration Counts

## Problem
The calendar views show 0/16 for the course at 18:00 on 13.02.2026, even though there are 2 people registered (both are guest/Probetraining bookings). This affects both member and admin views.

## Root Cause
Both calendar components only count entries from `course_registrations` table but ignore `guest_registrations` table (which stores Drop-In and Probetraining bookings).

## Files to Update

### 1. CoursesCalendarView.tsx (Member Calendar)
**Current behavior (lines 61-102):** 
- Fetches courses with embedded `course_registrations`
- Only counts `course_registrations` for registered_count

**Fix:** 
- After loading courses, fetch guest registrations separately
- Add guest count to the registered_count for each course

### 2. AdminCoursesCalendarView.tsx (Admin Calendar)
**Current behavior (lines 58-76):**
- Fetches registration counts only from `course_registrations`

**Fix:**
- Also fetch from `guest_registrations` table
- Add guest count to registered_count

## Technical Implementation

### CoursesCalendarView.tsx Changes
```text
1. After fetching courses and user registrations, also fetch:
   - Guest registrations for all course IDs where status = 'registered'

2. When processing courses, add:
   - guestCount from guest_registrations to registered_count
```

### AdminCoursesCalendarView.tsx Changes
```text
1. In the map function that gets registration counts:
   - Also query guest_registrations for each course
   - Add guest count to registered_count
   
2. Alternative (more efficient):
   - Fetch all guest registrations in bulk first
   - Then add to counts when processing courses
```

## Reference Implementation
`DayCourseDialog.tsx` (lines 136-167) already implements this correctly and serves as the pattern to follow.

## Expected Result
After the fix, the calendar will show **2/16** for the Functional Fitness course at 18:00 on 13.02.2026, correctly including the 2 Probetraining guest bookings.
