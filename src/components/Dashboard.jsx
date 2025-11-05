import { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import FileUpload from './FileUpload';
import FileHistory from './FileHistory';
import ChatInterface from './ChatInterface';

function Dashboard({ session }) {
  const [activeTab, setActiveTab] = useState('upload');
  const [files, setFiles] = useState([]);

  useEffect(() => {
    fetchFiles();
  }, [session.user.id]);

  const fetchFiles = async () => {
    const { data, error } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFiles(data);
    }
  };

  const estimateTokens = (text) => {
    // Rough estimate: ~1 token per 4 characters
    return Math.ceil(text.length / 4);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>File Analyzer</h1>
        <div className="user-section">
          <span className="user-email">{session.user.email}</span>
          <button className="button logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
      
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload File
        </button>
        <button
          className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          My Files
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'upload' && <FileUpload userId={session.user.id} onUploadComplete={fetchFiles} />}
        {activeTab === 'chat' && (
          <ChatInterface 
            userId={session.user.id} 
            onLogout={handleLogout}
            userEmail={session.user.email}
          />
        )}
        {activeTab === 'history' && <FileHistory userId={session.user.id} />}
      </div>

      {/* Token Count Display */}
      <div className="token-stats">
        <h3>📊 File Token Statistics</h3>
        {files.length === 0 ? (
          <p className="no-stats">No files uploaded yet</p>
        ) : (
          <div className="token-list">
            {files.map((file) => {
              const tokens = estimateTokens(file.extracted_info);
              return (
                <div key={file.id} className="token-item">
                  <div className="token-file-name">{file.file_name}</div>
                  <div className="token-count">
                    <span className="token-badge">{tokens.toLocaleString()} tokens</span>
                    <span className="token-size">{(file.file_size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              );
            })}
            <div className="token-total">
              <strong>Total Tokens:</strong> {files.reduce((sum, f) => sum + estimateTokens(f.extracted_info), 0).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
