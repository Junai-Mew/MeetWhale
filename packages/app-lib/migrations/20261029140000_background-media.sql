-- Background media source, picture adjustments and panel frost strength.
--
-- `background_kind` distinguishes a still image from a video/gif source so the
-- frontend knows which layer to mount even before the file is decoded.
ALTER TABLE settings ADD COLUMN background_kind TEXT NOT NULL DEFAULT 'image' CHECK (background_kind IN ('image', 'video'));
-- How the background covers the window: cover / contain / center / stretch.
ALTER TABLE settings ADD COLUMN background_fit TEXT NOT NULL DEFAULT 'cover' CHECK (background_fit IN ('cover', 'contain', 'center', 'stretch'));
-- Mirror the background horizontally.
ALTER TABLE settings ADD COLUMN background_flip INTEGER NOT NULL DEFAULT 0 CHECK (background_flip IN (0, 1));
-- Picture adjustments, percent of the resolved CSS filter value.
ALTER TABLE settings ADD COLUMN background_brightness INTEGER NOT NULL DEFAULT 100 CHECK (background_brightness BETWEEN 0 AND 200);
ALTER TABLE settings ADD COLUMN background_contrast INTEGER NOT NULL DEFAULT 100 CHECK (background_contrast BETWEEN 0 AND 200);
ALTER TABLE settings ADD COLUMN background_saturation INTEGER NOT NULL DEFAULT 100 CHECK (background_saturation BETWEEN 0 AND 200);
-- Darkening veil above the picture, 0-100.
ALTER TABLE settings ADD COLUMN background_dim INTEGER NOT NULL DEFAULT 0 CHECK (background_dim BETWEEN 0 AND 100);
-- Video playback: volume 0-100 and a remembered mute state (default muted).
ALTER TABLE settings ADD COLUMN background_volume INTEGER NOT NULL DEFAULT 0 CHECK (background_volume BETWEEN 0 AND 100);
ALTER TABLE settings ADD COLUMN background_muted INTEGER NOT NULL DEFAULT 1 CHECK (background_muted IN (0, 1));
-- Reduce decode/render work for video backgrounds.
ALTER TABLE settings ADD COLUMN background_performance_mode INTEGER NOT NULL DEFAULT 0 CHECK (background_performance_mode IN (0, 1));
-- Frost strength (px) of every translucent panel in full-window mode.
ALTER TABLE settings ADD COLUMN panel_blur INTEGER NOT NULL DEFAULT 8 CHECK (panel_blur BETWEEN 0 AND 40);
