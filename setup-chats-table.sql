-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_files junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS chat_files (
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES file_uploads(id) ON DELETE CASCADE,
  PRIMARY KEY (chat_id, file_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_files_chat_id ON chat_files(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_files_file_id ON chat_files(file_id);

-- Enable Row Level Security
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_files ENABLE ROW LEVEL SECURITY;

-- Chats policies
CREATE POLICY "Users can view their own chats"
  ON chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chats"
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats"
  ON chats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats"
  ON chats FOR DELETE
  USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can view messages from their chats"
  ON chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chats WHERE chats.id = chat_messages.chat_id AND chats.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert messages to their chats"
  ON chat_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM chats WHERE chats.id = chat_messages.chat_id AND chats.user_id = auth.uid()
  ));

-- Chat files policies
CREATE POLICY "Users can view their chat files"
  ON chat_files FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chats WHERE chats.id = chat_files.chat_id AND chats.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their chat files"
  ON chat_files FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM chats WHERE chats.id = chat_files.chat_id AND chats.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their chat files"
  ON chat_files FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM chats WHERE chats.id = chat_files.chat_id AND chats.user_id = auth.uid()
  ));
