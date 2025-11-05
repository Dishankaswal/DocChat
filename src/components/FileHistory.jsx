import { useState, useEffect } from 'react';
import supabase from '../supabaseClient';

function FileHistory({ userId }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchFiles();
  }, [userId]);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('file_uploads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const { error } = await supabase
        .from('file_uploads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setFiles(files.filter(f => f.id !== id));
      if (selectedFile?.id === id) setSelectedFile(null);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  if (loading) return <div className="loading">Loading files...</div>;

  return (
    <div className="file-history">
      <h2>Your Files</h2>
      {files.length === 0 ? (
        <p className="no-files">No files uploaded yet</p>
      ) : (
        <div className="files-grid">
          {files.map((file) => (
            <div key={file.id} className="file-card">
              <div className="file-header">
                <h3>{file.file_name}</h3>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(file.id)}
                >
                  ×
                </button>
              </div>
              <p className="file-meta">
                <strong>Type:</strong> {file.file_type}
              </p>
              <p className="file-meta">
                <strong>Size:</strong> {(file.file_size / 1024).toFixed(2)} KB
              </p>
              <p className="file-meta">
                <strong>Date:</strong> {new Date(file.created_at).toLocaleDateString()}
              </p>
              <button
                className="button view-btn"
                onClick={() => setSelectedFile(file)}
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      )}
      {selectedFile && (
        <div className="modal" onClick={() => setSelectedFile(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setSelectedFile(null)}>
              ×
            </button>
            <h2>{selectedFile.file_name}</h2>
            <div className="modal-info">
              <h3>Extracted Information:</h3>
              <pre>{selectedFile.extracted_info}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FileHistory;
