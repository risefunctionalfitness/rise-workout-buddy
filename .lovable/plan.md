

## Analysis of Two Issues

### Issue 1: Courses not loading on iPhone (Safari)

The problem is likely in the `.or()` filter used across multiple components (`CourseBooking.tsx`, `CourseParticipants.tsx`, `CoursesCalendarView.tsx`):

```
.or(`course_date.gt.${nowDate},and(course_date.eq.${nowDate},end_time.gt.${nowTime})`)
```

The `nowTime` is generated via `now.toTimeString().slice(0, 8)`. On some Safari/WebKit versions, `toTimeString()` can return unexpected formats or include timezone abbreviations differently, causing the slice to produce an invalid time string. This would silently break the query filter, returning no results.

**Fix:** Replace `now.toTimeString().slice(0, 8)` with a safer approach using explicit formatting:
```typescript
const nowTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
```

This needs to be fixed in 3 files:
- `src/components/CourseBooking.tsx` (line 127)
- `src/components/CourseParticipants.tsx` (line 51 area)
- `src/components/CoursesCalendarView.tsx` (line 66)

### Issue 2: Email not showing in admin member edit dialog

The `loadMemberEmailForEdit` function calls the `get-member-email` edge function. The edge function logs are completely empty, suggesting it may not be deployed or is failing before logging. However, the function file exists.

The more likely issue: the edge function uses `await req.json()` to parse the body, but `supabase.functions.invoke` sends the body as JSON automatically. The function should work, but it might be failing silently due to CORS or auth issues on mobile Safari.

A simpler and more reliable fix: The `profiles` table already has an `email` column. Instead of calling an edge function, query the email directly from the profiles table first, and only fall back to the edge function if it's null. Many profiles may already have the email stored. Additionally, ensure the edge function is robust by adding better error handling.

**Fix:** In `Admin.tsx`'s `loadMemberEmailForEdit`, first check `member.email` from the already-loaded profiles data (which includes `email`). Only call the edge function if the profile email is empty.

**Files to modify:**
1. `src/components/CourseBooking.tsx` - Safari-safe time formatting
2. `src/components/CourseParticipants.tsx` - Safari-safe time formatting  
3. `src/components/CoursesCalendarView.tsx` - Safari-safe time formatting
4. `src/pages/Admin.tsx` - Use profile email first, edge function as fallback

