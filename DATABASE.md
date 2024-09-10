## Indexes
- `CREATE UNIQUE INDEX user_vote_idx ON votes (user_id, votable_id, votable_type);`
  - no duplicate votes, works mostly as constraint

- `CREATE INDEX idx_course_code ON questions(course_code);`
  - faster retrieval of all questions for a course

- `CREATE INDEX idx_question_id ON answers(question_id);`
  - faster retrieval of all answers for a question


## Denormalization decisions
- "questions" table
  - "answers" column
    - no need for joining tables on queries to get the answer amount
    - updated automatically by trigger
  - "votes" column
    - similar to to "answers", no need for left joins to get the vote count
    - also updated by trigger
- "answers" table:
  - "votes" column
    - similar to questions-table, simpler queries
    - updated automatically by trigger


## Caching decisions
- only the query that fetches all courses is cached in Redis
- Redis also utilized for rate limiting and message queuing
