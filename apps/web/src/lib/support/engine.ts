// NovaGross AI destek motoru — Google Gemini ile triyaj + yanıt.
// Sunucu tarafında çalışır (GEMINI_API_KEY gizli).

export type ChatMsg = { role: 'user' | 'assistant'; content: string }

export type SupportContext = {
  source: 'customer' | 'seller'
  userName?: string | null
  storeName?: string | null
  orderNumber?: string | null
}

export type EngineResult = {
  reply: string
  escalate: boolean
  category: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  subject: string
  summary: string
  needs_seller: boolean
}

const GEMINI_MODEL = 'gemini-2.0-flash'

const GREETINGS = /^(merhaba|selam|hey|iyi günler|iyi akşamlar|iyi sabahlar|günaydın|nasılsınız|hello|hi|naber|ne haber|sağlıcakla)[!.,?]?\s*$/i

function isGreeting(messages: ChatMsg[]): boolean {
  const userMsgs = messages.filter((m) => m.role === 'user')
  if (userMsgs.length !== 1) return false
  return GREETINGS.test(userMsgs[0].content.trim())
}

function systemInstruction(ctx: SupportContext): string {
  const who =
    ctx.source === 'seller'
      ? `Şu an bir SATICI ile konuşuyorsun${ctx.storeName ? ` (mağaza: ${ctx.storeName})` : ''}.`
      : `Şu an bir MÜŞTERİ ile konuşuyorsun${ctx.userName ? ` (${ctx.userName})` : ''}.`

  return `Sen Novagross adlı Türk e-ticaret pazaryerinin profesyonel, nazik ve çözüm odaklı yapay zeka müşteri temsilcisisin. ${who}

GÖREVİN:
- Türkçe, kibar ve net konuş. Kısa ve anlaşılır cevaplar ver.
- Önce kullanıcıyı dinle; tek bir selamlama ya da belirsiz mesajda asla escalate etme.
- Sıkça sorulanları yanıtla: kargo süreleri (genelde 1-3 iş günü), 14 gün cayma/iade hakkı, iyzico ile güvenli ödeme, hesap/şifre işlemleri, sipariş takibi.
- Asla tutamayacağın söz verme. İade onayı, para iadesi, kargo tazmini gibi kararları SEN veremezsin; bunları ilgili ekibe/satıcıya yönlendirirsin.
- Eksik bilgi varsa nazikçe iste: sipariş numarası, e-posta, sorunun detayı.

YÖNLENDİRME (escalate) KURALLARI — ÇOK ÖNEMLİ:
- Kullanıcı sadece selamlama yaptıysa (merhaba, selam, hey vb.) → escalate=false, ona nasıl yardımcı olabileceğini sor.
- Kullanıcı genel soru sorduysa, bilgi talep ettiyse → escalate=false, yanıtla.
- Şikayet, kusurlu/yanlış/eksik ürün, teslim edilmeyen kargo, iade/değişim anlaşmazlığı, ödeme sorunu → escalate=true.
- Belirli bir satıcının ürünü/siparişi/kargosuyla ilgiliyse needs_seller=true.
- Satıcı talepleri için escalate=true (admin'e iletilir).
- Kural: İlk mesajda SADECE şikayet/sorun/talep varsa escalate=true. Sadece selamlama veya belirsiz mesajda escalate=false.

ÇIKTI BİÇİMİ: SADECE şu JSON'u döndür, başka metin yok:
{
  "reply": "<kullanıcıya gösterilecek nazik Türkçe yanıt>",
  "escalate": <true|false>,
  "category": "<order|return|payment|shipping|product|account|seller_complaint|seller_request|other>",
  "priority": "<low|normal|high|urgent>",
  "subject": "<talebin kısa başlığı, selamlama ise 'Genel sorgu'>",
  "summary": "<temsilci/satıcı için 1-2 cümlelik özet>",
  "needs_seller": <true|false>
}`
}

function conversationalFallback(messages: ChatMsg[], ctx: SupportContext): EngineResult {
  if (isGreeting(messages)) {
    const name = ctx.userName ? ` ${ctx.userName}` : ''
    return {
      reply: `Merhaba${name}! 👋 Novagross destek asistanınım. Sipariş, kargo, iade veya başka bir konuda nasıl yardımcı olabilirim?`,
      escalate: false,
      category: 'other',
      priority: 'low',
      subject: 'Genel sorgu',
      summary: '',
      needs_seller: false,
    }
  }
  const userMsgs = messages.filter((m) => m.role === 'user')
  const hasRealIssue = userMsgs.length >= 2
  return {
    reply: hasRealIssue
      ? 'Talebinizi aldım, ilgili ekibimize ilettim. En kısa sürede dönüş yapılacaktır. Eklemek istediğiniz bir bilgi var mı?'
      : 'Anlıyorum. Sorununuzu biraz daha detaylı anlatabilir misiniz? Sipariş numaranız varsa paylaşırsanız daha hızlı yardımcı olabilirim.',
    escalate: hasRealIssue,
    category: 'other',
    priority: 'normal',
    subject: userMsgs[userMsgs.length - 1]?.content.slice(0, 80) || 'Destek talebi',
    summary: 'Yapay zeka yanıt veremedi, manuel inceleme gerekiyor.',
    needs_seller: false,
  }
}

export async function runSupportEngine(
  messages: ChatMsg[],
  ctx: SupportContext
): Promise<EngineResult> {
  const apiKey = process.env.GEMINI_API_KEY
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || ''

  if (!apiKey) {
    return conversationalFallback(messages, ctx)
  }

  try {
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction(ctx) }] },
          contents,
          generationConfig: { responseMimeType: 'application/json', temperature: 0.4, maxOutputTokens: 800 },
        }),
      }
    )

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[support engine] gemini http', res.status, errText)
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        console.error('[support engine] API key geçersiz olabilir. Gemini anahtarları AIza... ile başlar.')
      }
      return conversationalFallback(messages, ctx)
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    let parsed: any = {}
    try {
      parsed = JSON.parse(text)
    } catch {
      // JSON parse edilemezse düz metni reply olarak kullan
      return { ...fallback(text || 'Talebinizi aldım.'), escalate: false }
    }

    return {
      reply: String(parsed.reply || 'Talebinizi aldım.'),
      escalate: Boolean(parsed.escalate),
      category: String(parsed.category || 'other'),
      priority: ['low', 'normal', 'high', 'urgent'].includes(parsed.priority) ? parsed.priority : 'normal',
      subject: String(parsed.subject || lastUser.slice(0, 80) || 'Destek talebi'),
      summary: String(parsed.summary || ''),
      needs_seller: Boolean(parsed.needs_seller),
    }
  } catch (e) {
    console.error('[support engine] error', e)
    return conversationalFallback(messages, ctx)
  }
}
