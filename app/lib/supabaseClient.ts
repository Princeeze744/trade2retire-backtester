import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iaosveyodzcazgbhgmgc.supabase.co";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlhb3N2ZXlvZHpjYXpnYmhnbWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMDIwODMsImV4cCI6MjA5Nzc3ODA4M30.2U8X0uxydQS7w0kZMIla85kMJ8WgyXkfWcZGhNVqUnM";
export const supabase = createClient(url, anon);
