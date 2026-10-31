-- How the custom background is painted: only inside the content area
-- ('content'), or across the whole window with translucent chrome ('window').
ALTER TABLE settings ADD COLUMN background_mode TEXT NOT NULL DEFAULT 'content' CHECK (background_mode IN ('content', 'window'));
