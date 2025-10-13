-- Bereinige Titel und Trainer in courses Tabelle
UPDATE courses 
SET title = TRIM(title), 
    trainer = TRIM(trainer) 
WHERE title != TRIM(title) OR trainer != TRIM(trainer);

-- Bereinige Titel und Trainer in course_templates Tabelle
UPDATE course_templates 
SET title = TRIM(title), 
    trainer = TRIM(trainer) 
WHERE title != TRIM(title) OR trainer != TRIM(trainer);