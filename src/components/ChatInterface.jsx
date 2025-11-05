import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import supabase from '../supabaseClient';

function ChatInterface({ userId, onLogout, userEmail }) {
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [savingChat, setSavingChat] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const GEMINI_TOKEN_LIMIT = 200000; // 200k tokens for Gemini

  // Estimate tokens (rough: ~1 token per 4 characters)
  const estimateTokens = (text) => {
    return Math.ceil(text.length / 4);
  };

  // Calculate total tokens for selected files
  const calculateSelectedTokens = () => {
    const selectedFilesData = files.filter(f => selectedFiles.includes(f.id));
    return selectedFilesData.reduce((sum, file) => {
      return sum + estimateTokens(file.extracted_info);
    }, 0);
  };

  // Check if adding a file would exceed token limit
  const wouldExceedLimit = (fileId) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return false;

    const currentTokens = calculateSelectedTokens();
    const fileTokens = estimateTokens(file.extracted_info);
    return (currentTokens + fileTokens) > GEMINI_TOKEN_LIMIT;
  };

  useEffect(() => {
    fetchUserFiles();
    fetchUserChats();
  }, [userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Auto-save chat after messages change
    if (messages.length > 0 && !loading) {
      saveCurrentChat();
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchUserFiles = async () => {
    const { data, error } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFiles(data);
    }
  };

  const fetchUserChats = async () => {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setChats(data);
    }
  };

  const saveCurrentChat = async () => {
    if (savingChat || messages.length === 0) return;

    setSavingChat(true);
    try {
      let chatId = currentChatId;

      // Create new chat if doesn't exist
      if (!chatId) {
        const title = messages[0]?.content.substring(0, 50) || 'New Chat';
        const { data: newChat, error: chatError } = await supabase
          .from('chats')
          .insert({
            user_id: userId,
            title: title,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (chatError) throw chatError;
        chatId = newChat.id;
        setCurrentChatId(chatId);

        // Save selected files for this chat
        if (selectedFiles.length > 0) {
          const chatFiles = selectedFiles.map(fileId => ({
            chat_id: chatId,
            file_id: fileId
          }));
          await supabase.from('chat_files').insert(chatFiles);
        }
      } else {
        // Update existing chat timestamp
        await supabase
          .from('chats')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', chatId);
      }

      // Delete old messages and insert new ones
      await supabase.from('chat_messages').delete().eq('chat_id', chatId);

      const chatMessages = messages.map(msg => ({
        chat_id: chatId,
        role: msg.role,
        content: msg.content
      }));

      await supabase.from('chat_messages').insert(chatMessages);

      // Refresh chat list
      fetchUserChats();
    } catch (error) {
      console.error('Error saving chat:', error);
    } finally {
      setSavingChat(false);
    }
  };

  const loadChat = async (chatId) => {
    try {
      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Load selected files
      const { data: filesData, error: filesError } = await supabase
        .from('chat_files')
        .select('file_id')
        .eq('chat_id', chatId);

      if (filesError) throw filesError;

      setMessages(messagesData.map(m => ({ role: m.role, content: m.content })));
      setSelectedFiles(filesData.map(f => f.file_id));
      setCurrentChatId(chatId);
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  const deleteChat = async (chatId, e) => {
    e.stopPropagation();
    if (!confirm('Delete this chat?')) return;

    try {
      await supabase.from('chats').delete().eq('id', chatId);

      if (currentChatId === chatId) {
        newChat();
      }

      fetchUserChats();
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => {
      // If already selected, remove it
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      }

      // Check if adding would exceed limit
      if (wouldExceedLimit(fileId)) {
        alert(`Cannot select this file. It would exceed the ${GEMINI_TOKEN_LIMIT.toLocaleString()} token limit for Gemini API.`);
        return prev;
      }

      // Add the file
      return [...prev, fileId];
    });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

      if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not found');
      }

      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const model = 'gemini-2.5-flash';

      // Build context from selected files
      const selectedFilesData = files.filter(f => selectedFiles.includes(f.id));
      let context = '';

      if (selectedFilesData.length > 0) {
        context = 'Context from uploaded files:\n\n';
        selectedFilesData.forEach(file => {
          context += `File: ${file.file_name}\n`;
          context += `Information: ${file.extracted_info}\n\n`;
        });
      }

      const prompt = context + '\nUser question: ' + input;

      const contents = [{
        role: 'user',
        parts: [{ text: prompt }]
      }];

      const response = await ai.models.generateContentStream({
        model,
        contents,
      });

      let fullText = '';
      const assistantMessage = { role: 'assistant', content: '' };
      setMessages(prev => [...prev, assistantMessage]);

      for await (const chunk of response) {
        fullText += chunk.text;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = fullText;
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error: ' + error.message
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  const newChat = () => {
    setMessages([]);
    setSelectedFiles([]);
    setCurrentChatId(null);
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
      throw new Error('Gemini API key not found');
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
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

      const contents = [{ role: 'user', parts: parts }];

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

      const contents = [{ role: 'user', parts: parts }];

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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadProgress('Processing file...');

    try {
      const fileData = await extractTextFromFile(file);

      setUploadProgress('Analyzing with AI...');

      const analysis = await analyzeWithLLM(fileData);

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

      setUploadProgress('✓ File uploaded successfully!');
      setTimeout(() => setUploadProgress(''), 2000);

      fetchUserFiles();
      e.target.value = '';
    } catch (error) {
      console.error('Error:', error);
      setUploadProgress('✗ Error: ' + error.message);
      setTimeout(() => setUploadProgress(''), 3000);
    }
  };

  const deleteFile = async (fileId, e) => {
    e.stopPropagation();
    if (!confirm('Delete this file?')) return;

    try {
      await supabase.from('file_uploads').delete().eq('id', fileId);
      setSelectedFiles(prev => prev.filter(id => id !== fileId));
      fetchUserFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  return (
    <div className="fullscreen-chat">
      {/* Sidebar */}
      <div className={`chat-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={newChat}>
            <span>+</span> New chat
          </button>
        </div>

        <div className="sidebar-content">
          <div className="sidebar-section">
            <h3>Recent Chats</h3>
            <div className="sidebar-chats">
              {chats.length === 0 ? (
                <p className="no-chats-sidebar">No chat history yet</p>
              ) : (
                chats.map(chat => (
                  <div
                    key={chat.id}
                    className={`sidebar-chat-item ${currentChatId === chat.id ? 'active' : ''}`}
                    onClick={() => loadChat(chat.id)}
                  >
                    <div className="sidebar-chat-info">
                      <div className="sidebar-chat-title">{chat.title}</div>
                      <div className="sidebar-chat-date">
                        {new Date(chat.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      className="delete-chat-btn"
                      onClick={(e) => deleteChat(chat.id, e)}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Your Documents</h3>
            <div className="upload-section-sidebar">
              <input
                type="file"
                id="file-upload-input"
                onChange={handleFileUpload}
                accept="image/*,.pdf,.doc,.docx,.txt"
                style={{ display: 'none' }}
              />
              <label htmlFor="file-upload-input" className="upload-btn-sidebar">
                📎 Upload File
              </label>
              {uploadProgress && (
                <div className="upload-progress">{uploadProgress}</div>
              )}
            </div>
            <div className="sidebar-files">
              {files.length === 0 ? (
                <p className="no-files-sidebar">No files uploaded yet</p>
              ) : (
                files.map(file => {
                  const fileTokens = estimateTokens(file.extracted_info);
                  const isSelected = selectedFiles.includes(file.id);
                  const canSelect = isSelected || !wouldExceedLimit(file.id);

                  return (
                    <div
                      key={file.id}
                      className={`sidebar-file-item ${isSelected ? 'selected' : ''} ${!canSelect ? 'disabled' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFileSelection(file.id)}
                        disabled={!canSelect && !isSelected}
                      />
                      <div
                        className="sidebar-file-info"
                        onClick={() => canSelect && toggleFileSelection(file.id)}
                      >
                        <div className="sidebar-file-name">{file.file_name}</div>
                        <div className="sidebar-file-meta">
                          <span className="sidebar-file-size">
                            {(file.file_size / 1024).toFixed(1)} KB
                          </span>
                          <span className="sidebar-file-tokens">
                            {fileTokens.toLocaleString()} tokens
                          </span>
                        </div>
                      </div>
                      <button
                        className="delete-file-btn"
                        onClick={(e) => deleteFile(file.id, e)}
                      >
                        ×
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Token Usage Display */}
            {files.length > 0 && (
              <div className="token-usage-display">
                <div className="token-usage-bar-container">
                  <div
                    className="token-usage-bar"
                    style={{
                      width: `${Math.min((calculateSelectedTokens() / GEMINI_TOKEN_LIMIT) * 100, 100)}%`,
                      backgroundColor: calculateSelectedTokens() > GEMINI_TOKEN_LIMIT * 0.9 ? '#e74c3c' :
                        calculateSelectedTokens() > GEMINI_TOKEN_LIMIT * 0.7 ? '#f39c12' : '#27ae60'
                    }}
                  />
                </div>
                <div className="token-usage-text">
                  <span className="token-current">{calculateSelectedTokens().toLocaleString()}</span>
                  <span className="token-separator">/</span>
                  <span className="token-limit">{GEMINI_TOKEN_LIMIT.toLocaleString()}</span>
                  <span className="token-label">tokens</span>
                </div>
                {calculateSelectedTokens() > GEMINI_TOKEN_LIMIT * 0.9 && (
                  <div className="token-warning">
                    ⚠️ Approaching token limit
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-info-sidebar">
            <div className="user-email-sidebar">{userEmail}</div>
            <button className="logout-btn-sidebar" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main-area">
        <div className="chat-topbar">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          {selectedFiles.length > 0 && (
            <div className="topbar-info">
              <span className="selected-badge">
                {selectedFiles.length} document{selectedFiles.length !== 1 ? 's' : ''} selected
              </span>
              <span className="selected-tokens-badge">
                {calculateSelectedTokens().toLocaleString()} / {GEMINI_TOKEN_LIMIT.toLocaleString()} tokens
              </span>
            </div>
          )}
        </div>

        <div className="chat-messages-area">
          {messages.length === 0 ? (
            <div className="chat-empty-state">
              <h1>Ready when you are.</h1>
              <p className="empty-hint">Select documents from the sidebar and ask me anything</p>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((msg, idx) => (
                <div key={idx} className={`chat-message ${msg.role}`}>
                  <div className="message-avatar">
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="message-text">
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="chat-input-area">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your documents..."
              disabled={loading}
              rows={1}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="send-btn"
            >
              {loading ? '⋯' : '↑'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;
