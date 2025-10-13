-- Add color column to course_templates with default gray color
ALTER TABLE course_templates 
ADD COLUMN color text DEFAULT '#f3f4f6';

-- Add color column to courses with default gray color
ALTER TABLE courses 
ADD COLUMN color text DEFAULT '#f3f4f6';