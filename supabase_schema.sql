-- Users table (Custom auth for simplicity in this demo)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    nickname TEXT NOT NULL,
    division TEXT
);

-- Schedules table
CREATE TABLE schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    location TEXT NOT NULL,
    max_participants INTEGER NOT NULL,
    creator_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Participants table (Many-to-Many mapping)
CREATE TABLE participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(schedule_id, user_id)
);

-- Tournaments table
CREATE TABLE tournaments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    registration_period TEXT,
    location TEXT NOT NULL,
    capacity TEXT,
    fee TEXT,
    condition TEXT,
    reward TEXT,
    rules TEXT,
    link TEXT,
    creator_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Chats table
CREATE TABLE chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    sender_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    time TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ========================================================
-- RLS (Row Level Security) 설정 - 테스트를 위해 모두 허용 (public)
-- 실제 서비스 시에는 인증된 사용자만 접근하도록 수정해야 합니다.
-- ========================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on schedules" ON schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on participants" ON participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on tournaments" ON tournaments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on chats" ON chats FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for Chats table
alter publication supabase_realtime add table chats;
