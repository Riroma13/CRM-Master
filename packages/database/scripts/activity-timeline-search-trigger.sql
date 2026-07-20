-- Activity Timeline: search_vector auto-population trigger
-- Run after migration 20260720220000_add_activity_timeline_fields
-- Creates a trigger that updates search_vector on INSERT or UPDATE

CREATE OR REPLACE FUNCTION activity_events_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('spanish',
    COALESCE(NEW.event_type, '') || ' ' ||
    COALESCE(NEW.entity_type, '') || ' ' ||
    COALESCE(NEW.entity_id, '') || ' ' ||
    COALESCE(NEW.actor, '') || ' ' ||
    COALESCE(NEW.source_module, '') || ' ' ||
    COALESCE(NEW.subject_name, '') || ' ' ||
    COALESCE(NEW.actor_name, '') || ' ' ||
    COALESCE(NEW.severity, '') || ' ' ||
    COALESCE(NEW.category, '') || ' ' ||
    COALESCE(NEW.payload::text, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS activity_events_search_vector_trigger ON activity_events;

CREATE TRIGGER activity_events_search_vector_trigger
  BEFORE INSERT OR UPDATE ON activity_events
  FOR EACH ROW
  EXECUTE FUNCTION activity_events_search_vector_update();
