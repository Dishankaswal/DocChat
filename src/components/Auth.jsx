import { useState } from 'react';
import supabase from '../supabaseClient';

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ text: 'Login successful!', type: 'success' });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({
          text: 'Sign up successful! Check your email for confirmation.',
          type: 'success',
        });
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="auth-logo">
          <span className="logo-icon">📄</span>
          <span className="logo-text">DocChat</span>
        </div>
        <h1 className="auth-title">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
        <p className="auth-subtitle">
          {isLogin 
            ? 'Sign in to continue to your documents' 
            : 'Sign up to start analyzing your documents'}
        </p>
      </div>

      <form className="auth-form" onSubmit={handleAuth}>
        <div className="form-group">
          <label htmlFor="email" className="form-label">Email Address</label>
          <input
            id="email"
            className="auth-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">Password</label>
          <input
            id="password"
            className="auth-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />
          {!isLogin && (
            <p className="form-hint">Must be at least 6 characters</p>
          )}
        </div>

        {message.text && (
          <div className={`auth-message ${message.type}`}>
            <span className="message-icon">
              {message.type === 'success' ? '✓' : '⚠'}
            </span>
            {message.text}
          </div>
        )}

        <button className="auth-button" type="submit" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner"></span>
              Processing...
            </>
          ) : (
            isLogin ? 'Sign In' : 'Create Account'
          )}
        </button>
      </form>

      <div className="auth-footer">
        <p className="auth-toggle-text">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
        </p>
        <button 
          className="auth-toggle-button" 
          onClick={() => {
            setIsLogin(!isLogin);
            setMessage({ text: '', type: '' });
          }}
        >
          {isLogin ? 'Sign Up' : 'Sign In'}
        </button>
      </div>
    </div>
  );
}

export default Auth;
