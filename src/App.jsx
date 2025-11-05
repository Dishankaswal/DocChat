import { useState, useEffect } from 'react';
import supabase from './supabaseClient';
import Auth from './components/Auth';
import ChatInterface from './components/ChatInterface';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <h1>Loading...</h1>
      </div>
    );
  }

  return (
    <>
      {!session ? (
        <div className="auth-container">
          <Auth />
        </div>
      ) : (
        <ChatInterface 
          userId={session.user.id}
          userEmail={session.user.email}
          onLogout={handleLogout}
        />
      )}
    </>
  );
}

export default App;
