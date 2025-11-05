const { supabase } = require('./supabase');

async function testConnection() {
  try {
    // Test the connection by getting the current user (if authenticated)
    const { data, error } = await supabase.auth.getUser();

    if (error && error.message !== 'Auth session missing!') {
      console.error('Connection error:', error);
      return;
    }

    console.log('✅ Successfully connected to Supabase!');
    console.log('Project URL:', 'https://fxxjsmoseozvfnlfhvhx.supabase.co');

    // You can add more tests here, like querying a table
    // const { data: tableData, error: tableError } = await supabase
    //   .from('your_table_name')
    //   .select('*')
    //   .limit(1);

  } catch (err) {
    console.error('Failed to connect:', err.message);
  }
}

// Run the test
testConnection();

