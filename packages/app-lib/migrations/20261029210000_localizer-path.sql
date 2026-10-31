-- Optional path to the external "MC Content Localizer" tool used by the lab
-- card. Nullable: everything keeps working until the user picks a path (or the
-- first-use probe finds one), and the launcher never bundles the binary.
ALTER TABLE settings ADD COLUMN localizer_path TEXT;
