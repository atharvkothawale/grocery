// Supabase Client Initialization
// Replace the placeholder values below with your actual Supabase Project details.
// You can retrieve these values from your Supabase dashboard: Project Settings -> API.

const SUPABASE_URL = "https://gnkyyuppycoutqcoqshe.supabase.co/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdua3l5dXBweWNvdXRxY29xc2hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMDEzOTcsImV4cCI6MjA5OTc3NzM5N30.4pT79j9IZXeKbuHMuQXLp5gOyEVR6R1utUZAXN_jxF0";

// Initialize the client client globally
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Supabase Client initialized successfully.");
