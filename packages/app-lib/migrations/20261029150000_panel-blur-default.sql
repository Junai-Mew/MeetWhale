-- Thin panel glass by default: the full-window background exists to show the
-- picture, so the frost slider lands on 4px instead of the 8px placeholder.
UPDATE settings SET panel_blur = 4 WHERE panel_blur = 8;
