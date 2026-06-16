CREATE TABLE IF NOT EXISTS datasets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  format TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  score INTEGER,
  grade TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS validations (
  id TEXT PRIMARY KEY,
  dataset_id TEXT NOT NULL,
  rule_set TEXT NOT NULL DEFAULT 'standard',
  status TEXT NOT NULL DEFAULT 'running',
  score INTEGER,
  grade TEXT,
  issues_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (dataset_id) REFERENCES datasets(id)
);

CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  validation_id TEXT NOT NULL,
  feature_id TEXT,
  issue_type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL,
  coordinates TEXT,
  suggested_fix TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (validation_id) REFERENCES validations(id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  email TEXT,
  product TEXT NOT NULL DEFAULT 'geolint',
  status TEXT NOT NULL,
  price_id TEXT,
  subscription_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
