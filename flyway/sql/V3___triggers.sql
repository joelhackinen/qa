CREATE FUNCTION update_question_on_vote()
  RETURNS TRIGGER AS $$
  BEGIN
    UPDATE questions
    SET updated_at = NEW.voted_at, votes = votes + 1
    WHERE id = NEW.votable_id;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_question_on_vote_trigger
  AFTER INSERT ON votes
  FOR EACH ROW
  WHEN (NEW.votable_type = 'question')
  EXECUTE FUNCTION update_question_on_vote();


CREATE FUNCTION update_question_on_answer()
  RETURNS TRIGGER AS $$
  BEGIN
    UPDATE questions
    SET updated_at = NEW.created_at, answers = answers + 1
    WHERE id = NEW.question_id;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_question_on_answer_trigger
  AFTER INSERT ON answers
  FOR EACH ROW
  EXECUTE FUNCTION update_question_on_answer();


CREATE FUNCTION update_answer_on_vote()
  RETURNS TRIGGER AS $$
  BEGIN
    UPDATE answers
    SET updated_at = NEW.voted_at, votes = votes + 1
    WHERE id = NEW.votable_id;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_answer_on_vote_trigger
  AFTER INSERT ON votes
  FOR EACH ROW
  WHEN (NEW.votable_type = 'answer')
  EXECUTE FUNCTION update_answer_on_vote();