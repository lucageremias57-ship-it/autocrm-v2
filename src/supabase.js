import { createClient } from '@supabase/supabase-js'

// O código agora busca as chaves de forma segura no Netlify
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)