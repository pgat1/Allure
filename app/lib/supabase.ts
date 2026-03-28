import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ykapunsogzyhhnajkowz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrYXB1bnNvZ3p5aGhuYWprb3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMjM4NzMsImV4cCI6MjA4OTY5OTg3M30.b37ahvfxadnzjvP5is7pnEtaHWIVshPeyf4717Wny9M';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storageKey: 'allure-auth',
  },
});

export default supabase;