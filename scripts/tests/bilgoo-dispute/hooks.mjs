const map = {
  'next/server': new URL('./fake-next.mjs', import.meta.url).href,
  '@/lib/auth/requireAdminApi': new URL('./fake-auth.mjs', import.meta.url).href,
  '@/lib/supabase/service': new URL('./fake-supabase.mjs', import.meta.url).href,
  'iyzipay': new URL('./fake-iyzipay.mjs', import.meta.url).href,
}
export async function resolve(spec, ctx, next) {
  if (map[spec]) return { url: map[spec], shortCircuit: true }
  return next(spec, ctx)
}
