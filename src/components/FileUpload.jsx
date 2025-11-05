import { useState } from 'react';
import supabase from '../supabaseClient';
import { GoogleGenAI } from '@google/genai';

function FileUpload({ userId, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [extractedInfo, setExtractedInfo] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMessage({ text: '', type: '' });
      setExtractedInfo(null);
    }
  };

  const extractTextFromFile = async (file) => {
    const fileType = file.type;
    
    if (fileType.startsWith('image/') || fileType === 'application/pdf') {
      // For images and PDFs, convert to base64 for direct API upload
      return await convertToBase64(file);
    } else {
      // For text files, read as text
      const text = await file.text();
      return { type: 'document', content: text, name: file.name };
    }
  };

  const convertToBase64 = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          type: file.type.startsWith('image/') ? 'image' : 'pdf',
          base64: e.target.result,
          mimeType: file.type,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const analyzeWithLLM = async (fileData) => {
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not found. Please add VITE_GEMINI_API_KEY to your .env file');
    }

    const ai = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
    });

    const model = 'gemini-2.0-flash-exp';
    
    const parts = [];

    if (fileData.type === 'image' || fileData.type === 'pdf') {
      // Send file directly to Gemini
      const promptText = fileData.type === 'image' 
        ? 'Analyze this image and extract all relevant information including: objects, text, people, locations, dates, and any other important details. Provide a comprehensive structured summary.'
        : 'Analyze this PDF document thoroughly and extract ALL information including: main topics, key points, important dates, names, locations, data, tables, and any other relevant details. Provide a comprehensive structured summary of the ENTIRE document.';
      
      parts.push({ text: promptText });
      
      const base64Data = fileData.base64.split(',')[1];
      
      parts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: base64Data
        }
      });
      
      const contents = [{
        role: 'user',
        parts: parts
      }];

      const response = await ai.models.generateContentStream({
        model,
        contents,
      });

      let fullText = '';
      for await (const chunk of response) {
        fullText += chunk.text;
      }

      return fullText;
    } else {
      // For text documents, store the full content directly
      const contentPreview = fileData.content.substring(0, 10000);
      const prompt = `Provide a brief summary (2-3 sentences) of this document:\n\n${contentPreview}`;
      parts.push({ text: prompt });
      
      const contents = [{
        role: 'user',
        parts: parts
      }];

      const response = await ai.models.generateContentStream({
        model,
        contents,
      });

      let summary = '';
      for await (const chunk of response) {
        summary += chunk.text;
      }

      // Return summary + full content
      return `SUMMARY:\n${summary}\n\n---\n\nFULL CONTENT:\n${fileData.content}`;
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage({ text: 'Please select a file', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: 'Processing file...', type: 'info' });

    try {
      const fileData = await extractTextFromFile(file);
      
      setMessage({ text: 'Analyzing with AI...', type: 'info' });
      
      const analysis = await analyzeWithLLM(fileData);
      
      setExtractedInfo(analysis);
      
      const { error } = await supabase
        .from('file_uploads')
        .insert({
          user_id: userId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          extracted_info: analysis,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      setMessage({ text: 'File processed and saved successfully!', type: 'success' });
      setFile(null);
      
      // Notify parent component to refresh file list
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-upload">
      <h2>Upload File</h2>
      <div className="upload-section">
        <input
          type="file"
          onChange={handleFileChange}
          accept="image/*,.pdf,.doc,.docx,.txt"
          className="file-input"
          disabled={loading}
        />
        {file && (
          <div className="file-info">
            <p><strong>Selected:</strong> {file.name}</p>
            <p><strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB</p>
          </div>
        )}
        <button
          className="button upload-button"
          onClick={handleUpload}
          disabled={!file || loading}
        >
          {loading ? 'Processing...' : 'Upload & Analyze'}
        </button>
      </div>
      {message.text && (
        <p className={message.type}>{message.text}</p>
      )}
      {extractedInfo && (
        <div className="extracted-info">
          <h3>Extracted Information:</h3>
          <pre>{extractedInfo}</pre>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
