CREATE OR REPLACE FUNCTION update_question_timestamp_on_vote()
  RETURNS TRIGGER AS $$
  BEGIN
    UPDATE questions
    SET updated_at = NEW.voted_at
    WHERE id = NEW.votable_id;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_question_timestamp_on_vote_trigger
  AFTER INSERT ON votes
  FOR EACH ROW
  WHEN (NEW.votable_type = 'question')
  EXECUTE FUNCTION update_question_timestamp_on_vote();


CREATE OR REPLACE FUNCTION update_question_timestamp_on_answer()
  RETURNS TRIGGER AS $$
  BEGIN
    UPDATE questions
    SET updated_at = NEW.created_at
    WHERE id = NEW.question_id;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_question_timestamp_on_answer_trigger
  AFTER INSERT ON answers
  FOR EACH ROW
  EXECUTE FUNCTION update_question_timestamp_on_answer();


CREATE OR REPLACE FUNCTION update_answer_timestamp_on_vote()
  RETURNS TRIGGER AS $$
  BEGIN
    UPDATE answers
    SET updated_at = NEW.voted_at
    WHERE id = NEW.votable_id;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_answer_timestamp_on_vote_trigger
  AFTER INSERT ON votes
  FOR EACH ROW
  WHEN (NEW.votable_type = 'answer')
  EXECUTE FUNCTION update_answer_timestamp_on_vote();