

## Analysis: iOS-specific Course Loading Failures

### Root Causes Identified

**1. Empty Array in `.in()` Query (Primary Suspect)**

In `CourseBooking.tsx` (line 156-160), `CourseParticipants.tsx` (line 69-72), `AdminCoursesCalendarView.tsx` (line 60-64), `CoursesCalendarView.tsx`, and `DayCourseDialog.tsx`: after fetching courses, the code does:

```typescript
const courseIds = (coursesResult.data || []).map(c => c.id)
const { data: guestRegistrations } = await supabase
  .from('guest_registrations')
  .select('course_id')
  .in('course_id', courseIds)  // <-- if courseIds is [], this generates invalid PostgREST filter
```

When `courseIds` is empty (e.g., due to a transient auth issue or no courses), Supabase's `.in('column', [])` generates a malformed PostgREST filter (`column=in.()`). Safari/WebKit is stricter about malformed network requests and may throw or hang, while Chrome tolerates it. This matches the "sometimes works, sometimes doesn't" pattern -- it fails when the first query returns empty due to timing.

**2. Auth Token Refresh Failures on iOS**

Console logs show `AuthApiError: Invalid Refresh Token: Refresh Token Not Found`. On iOS/Safari, `localStorage` is more restrictive (cleared more aggressively, especially after app backgrounding in Capacitor). When the refresh token is gone, all authenticated queries silently return empty arrays (due to RLS), which then triggers the empty array `.in()` problem above, creating a cascading failure.

**3. Debounce Pattern Race Condition**

In `CourseBooking.tsx` (lines 67-89), the `useEffect` uses a `setTimeout` debounce. On iOS, when the component unmounts/remounts quickly (common with tab switching or Safari's aggressive memory management), the `mounted` flag may not prevent state updates correctly because the timeout closure captures the old `mounted` variable before cleanup runs.

### Proposed Fixes

**Fix 1: Guard all `.in()` calls against empty arrays**

In all 5 files, add a check before the `.in()` call:
```typescript
let guestRegistrations = [];
if (courseIds.length > 0) {
  const { data } = await supabase
    .from('guest_registrations')
    .select('course_id')
    .in('course_id', courseIds)
    .eq('status', 'registered');
  guestRegistrations = data || [];
}
```

Files to update:
- `src/components/CourseBooking.tsx`
- `src/components/CourseParticipants.tsx`
- `src/components/CoursesCalendarView.tsx`
- `src/components/AdminCoursesCalendarView.tsx`
- `src/components/DayCourseDialog.tsx`

**Fix 2: Simplify CourseBooking useEffect debounce**

Replace the error-prone `setTimeout` debounce with a direct async call using only the `mounted` flag for cleanup safety. The 100ms debounce isn't necessary since `currentWeek` only changes on user interaction.

**Fix 3: Add auth session check before course loading**

Before running course queries, verify the session is valid. If not, attempt a refresh. This prevents cascading failures from expired tokens on iOS.

```typescript
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  await supabase.auth.refreshSession()
}
```

### Files to Modify
1. `src/components/CourseBooking.tsx` - Guard `.in()`, fix debounce, add session check
2. `src/components/CourseParticipants.tsx` - Guard `.in()`
3. `src/components/CoursesCalendarView.tsx` - Guard `.in()`, add session check
4. `src/components/AdminCoursesCalendarView.tsx` - Guard `.in()`
5. `src/components/DayCourseDialog.tsx` - Guard `.in()`

