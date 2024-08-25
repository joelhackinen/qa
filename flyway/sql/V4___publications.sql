CREATE PUBLICATION
  question_inserts
FOR TABLE
  questions
WITH
  (publish = 'insert');

CREATE PUBLICATION
  answer_inserts
FOR TABLE
  answers
WITH
  (publish = 'insert');