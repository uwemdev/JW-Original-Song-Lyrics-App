import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ydwlhvedmurwsdnrkgsa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlkd2xodmVkbXVyd3NkbnJrZ3NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyOTc1OTUsImV4cCI6MjEwNDg3MzU5NX0.GNqWQFk7900wmKCuDJ8k1a_BwoIBXG6IBuF1hq3UDik';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
