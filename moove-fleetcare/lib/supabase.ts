// lib/supabase.ts
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

// You can find these in your Supabase dashboard under Project Settings > API
const supabaseUrl = 'https://ltcypvibwnkxojsnxxiq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0Y3lwdmlid25reG9qc254eGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyNDczNTksImV4cCI6MjEwNDgyMzM1OX0.iCbFQX1irRyimljfwHvFJMxCbEVWdnnMmwwwmgRp-SE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // React Native doesn't use URL-based sessions
  },
})