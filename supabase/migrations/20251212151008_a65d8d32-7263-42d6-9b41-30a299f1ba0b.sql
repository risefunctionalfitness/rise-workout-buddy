-- Add column to track courses cancelled due to low attendance
ALTER TABLE courses 
ADD COLUMN cancelled_due_to_low_attendance boolean DEFAULT false;