CREATE OR REPLACE FUNCTION update_question_timestamp()
  RETURNS TRIGGER AS $$
  BEGIN
    UPDATE questions
    SET updated_at = NOW()
    WHERE id = NEW.votable_id;
    
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_question_timestamp_trigger
  AFTER INSERT OR UPDATE ON votes
  FOR EACH ROW
  WHEN (NEW.votable_type = 'question')
  EXECUTE FUNCTION update_question_timestamp();