CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE
);

CREATE TYPE VOTE_TARGET_TYPE AS ENUM ('question', 'answer');

CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  course_code TEXT REFERENCES courses(code),
  body TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE answers (
  id SERIAL PRIMARY KEY,
  question_id INTEGER REFERENCES questions(id),
  body TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  votable_id INTEGER NOT NULL,  --questions.id or answers.id
  votable_type VOTE_TARGET_TYPE NOT NULL,
  vote_value INTEGER NOT NULL CHECK (vote_value IN (-1, 1))
);

CREATE UNIQUE INDEX user_vote_idx ON votes (user_id, votable_id, votable_type);