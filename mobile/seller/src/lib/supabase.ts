import 'expo-sqlite/localStorage/install'
import { createClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'

// Oturum cihazda expo-sqlite localStorage'da tutulur (Expo + Supabase önerisi).
// Anon key herkese açık anahtardır; yetki RLS ile sağlanır.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL!
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Token yenileme döngüsünü uygulama ön plandayken çalıştır
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})
