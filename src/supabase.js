import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://flundjmctddrlnzndbvm.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdW5kam1jdGRkcmxuem5kYnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDU5ODAsImV4cCI6MjA4OTc4MTk4MH0.zgkeRNzheXIJWbYAcnhHuRxMNw0OReC0ZTiWB_uTfKk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
