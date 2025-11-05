-- Create file_uploads table
CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  extracted_info TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_created_at ON file_uploads(created_at DESC);

-- Enable Row Level Security
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own files
CREATE POLICY "Users can view their own files"
  ON file_uploads
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own files
CREATE POLICY "Users can insert their own files"
  ON file_uploads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own files
CREATE POLICY "Users can delete their own files"
  ON file_uploads
  FOR DELETE
  USING (auth.uid() = user_id);
