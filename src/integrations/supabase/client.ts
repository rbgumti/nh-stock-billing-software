import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://akmsadbrvvhqijqfqpev.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrbXNhZGJydnZocWlqcWZxcGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3MTA1NjcsImV4cCI6MjA2MjI4NjU2N30.vd3Ud3s94X-XDXVTvmD0KNj_i5VYLK0TVPbNsxN0lDM";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
