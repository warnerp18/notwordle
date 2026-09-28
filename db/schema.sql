CREATE TABLE games (
  id  uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  answer  text  NOT NULL,
  guesses text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);