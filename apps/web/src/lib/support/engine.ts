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

function systemInstruction(ctx: SupportContext): string {
  const who =
    ctx.source === 'seller'
      ? `Şu an bir SATICI ile konuşuyorsun${ctx.storeName ? ` (mağaza: ${ctx.storeName})` : ''}.`
      : `Şu an bir MÜŞTERİ ile konuşuyorsun${ctx.userName ? ` (${ctx.userName})` : ''}.`

  return `Sen Novagross adlı Türk e-ticaret pazaryerinin profesyonel, nazik ve çözüm odaklı yapay zeka müşteri temsilcisisin. ${who}

GÖREVİN:
- Türkçe, kibar ve net konuş. Kısa ve anlaşılır cevaplar ver.
- Sıkça sorulanları yanıtla: kargo süreleri (genelde 1-3 iş günü), 14 gün cayma/iade hakkı, iyzico ile güvenli ödeme, hesap/şifre işlemleri, sipariş takibi.
- Asla tutamayacağın söz verme. İade onayı, para iadesi, kargo tazmini gibi kararları SEN veremezsin; bunları ilgili ekibe/satıcıya yönlendirirsin.
- Eksik bilgi varsa nazikçe iste: sipariş numarası, e-posta, sorunun detayı.

YÖNLENDİRME (escalate):
- Şikayet, kusurlu/yanlış/eksik ürün, teslim edilmeyen kargo, iade/değişim anlaşmazlığı, ödeme sorunu, satıcıya iletilmesi gereken her konu → escalate=true yap.
- Belirli bir satıcının ürünü/siparişi/kargosuyla ilgiliyse needs_seller=true yap.
- Satıcı talepleri için her zaman escalate=true (admin'e iletilir).
- Basit bilgi sorularını (kargo kaç günde gelir vb.) escalate=false ile yanıtla.

ÇIKTI BİÇİMİ: SADECE şu JSON'u döndür, başka metin yok:
{
  "reply": "<kullanıcıya gösterilecek nazik Türkçe yanıt>",
  "escalate": <true|false>,
  "category": "<order|return|payment|shipping|product|account|seller_complaint|seller_request|other>",
  "priority": "<low|normal|high|urgent>",
  "subject": "<talebin kısa başlığı>",
  "summary": "<temsilci/satıcı için 1-2 cümlelik özet>",
  "needs_seller": <true|false>
}`
}

function fallback(reply: string): EngineResult {
  return {
    reply,
    escalate: true,
    category: 'other',
    priority: 'normal',
    subject: 'Destek talebi',
    summary: 'Otomatik özet oluşturulamadı.',
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
    return fallback(
      'Talebinizi aldım, en kısa sürede ilgili ekibimiz/satıcımız sizinle iletişime geçecek. Eklemek istediğiniz bir detay var mı?'
    )
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
      console.error('[support engine] gemini http', res.status, await res.text().catch(() => ''))
      return fallback('Talebinizi aldım, ilgili ekibimize ilettim. En kısa sürede dönüş yapılacaktır.')
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
    return fallback('Talebinizi aldım, ilgili ekibimize ilettim. En kısa sürede dönüş yapılacaktır.')
  }
}
