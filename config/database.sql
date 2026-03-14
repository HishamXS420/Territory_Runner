-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Running Sessions Table
CREATE TABLE IF NOT EXISTS running_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP,
  is_closed_loop BOOLEAN DEFAULT FALSE,
  total_distance FLOAT DEFAULT 0,
  total_time INTEGER DEFAULT 0,
  estimated_calories INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Create Route Coordinates Table
CREATE TABLE IF NOT EXISTS route_coordinates (
  id SERIAL PRIMARY KEY,
  running_session_id INTEGER NOT NULL REFERENCES running_sessions(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(running_session_id) REFERENCES running_sessions(id)
);

-- Create Territories Table
CREATE TABLE IF NOT EXISTS territories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  running_session_id INTEGER NOT NULL REFERENCES running_sessions(id) ON DELETE CASCADE,
  polygon_coords TEXT NOT NULL,
  area FLOAT NOT NULL,
  center_lat DECIMAL(10, 8),
  center_lon DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(running_session_id) REFERENCES running_sessions(id)
);

-- Create Territory Conflicts Log Table
CREATE TABLE IF NOT EXISTS territory_conflicts (
  id SERIAL PRIMARY KEY,
  territory_id_1 INTEGER REFERENCES territories(id) ON DELETE CASCADE,
  territory_id_2 INTEGER REFERENCES territories(id) ON DELETE CASCADE,
  overlapping_area FLOAT,
  resolved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  new_owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

-- Create User Statistics Table
CREATE TABLE IF NOT EXISTS user_statistics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total_distance FLOAT DEFAULT 0,
  total_time INTEGER DEFAULT 0,
  total_calories INTEGER DEFAULT 0,
  total_territory_area FLOAT DEFAULT 0,
  total_running_sessions INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Create Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_running_sessions_user_id ON running_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_route_coordinates_session_id ON route_coordinates(running_session_id);
CREATE INDEX IF NOT EXISTS idx_territories_user_id ON territories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id ON user_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_statistics_area ON user_statistics(total_territory_area DESC);
CREATE INDEX IF NOT EXISTS idx_user_statistics_distance ON user_statistics(total_distance DESC);
