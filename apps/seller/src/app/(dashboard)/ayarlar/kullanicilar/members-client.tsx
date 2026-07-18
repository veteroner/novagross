'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from '@novagross/ui'
import { Loader2, UserPlus, Trash2, Shield, Crown, User as UserIcon, Clock } from 'lucide-react'

type Member = {
  id: string
  user_id: string
  role: 'owner' | 'manager' | 'staff'
  created_at: string
  profile?: { first_name: string | null; last_name: string | null; email: string | null } | null
}

const fullName = (p?: { first_name: string | null; last_name: string | null } | null) =>
  `${p?.first_name || ''} ${p?.last_name || ''}`.trim()
type Invitation = {
  id: string
  email: string
  role: 'manager' | 'staff'
  status: string
  created_at: string
  expires_at: string
}

const ROLE_LABEL: Record<string, string> = { owner: 'Sahip', manager: 'Yönetici', staff: 'Personel' }
const ROLE_DESC: Record<string, string> = {
  owner: 'Tüm yetkiler — banka, kullanıcı yönetimi dahil',
  manager: 'Operasyon + pazarlama + finans görme + para çekme (banka değiştirme hariç)',
  staff: 'Sipariş, kargo, fatura, ürün/stok, müşteri soruları',
}

export function MembersClient({ storeName }: { storeName: string }) {
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'manager' | 'staff'>('staff')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/store/members')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Yüklenemedi')
      setMembers(data.members || [])
      setInvitations(data.invitations || [])
    } catch (e: any) {
      setError(e?.message || 'Yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const invite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/store/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Davet gönderilemedi')
      setNotice(`${email} adresine davet gönderildi.`)
      setEmail('')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Davet gönderilemedi')
    } finally {
      setSubmitting(false)
    }
  }

  const changeRole = async (memberId: string, role: 'manager' | 'staff') => {
    const res = await fetch(`/api/store/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (!res.ok) {
      const d = await res.json()
      alert(d?.error || 'Rol değiştirilemedi')
      return
    }
    await load()
  }

  const removeMember = async (memberId: string, label: string) => {
    if (!confirm(`${label} mağazadan çıkarılsın mı?`)) return
    const res = await fetch(`/api/store/members/${memberId}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      alert(d?.error || 'Çıkarılamadı')
      return
    }
    await load()
  }

  const revokeInvite = async (id: string) => {
    const res = await fetch(`/api/store/invitations/${id}`, { method: 'DELETE' })
    if (res.ok) await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Kullanıcı Yönetimi</h1>
        <p className="text-gray-600">
          <b>{storeName}</b> mağazasını yöneten kullanıcılar ve rolleri
        </p>
      </div>

      {/* Davet formu */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Yeni Kullanıcı Davet Et
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={invite} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kullanici@ornek.com"
                required
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="role">Rol</Label>
              <select
                id="role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'manager' | 'staff')}
                disabled={submitting}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="staff">Personel</option>
                <option value="manager">Yönetici</option>
              </select>
            </div>
            <Button type="submit" disabled={submitting} className="text-white" style={{ backgroundColor: '#16A34A' }}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Davet Gönder'}
            </Button>
          </form>
          <p className="mt-2 text-xs text-gray-500">{ROLE_DESC[inviteRole]}</p>
          {error && <div className="mt-3 rounded-md bg-red-50 border border-red-200 p-2 text-sm text-red-600">{error}</div>}
          {notice && <div className="mt-3 rounded-md bg-green-50 border border-green-200 p-2 text-sm text-green-700">{notice}</div>}
        </CardContent>
      </Card>

      {/* Üyeler */}
      <Card>
        <CardHeader>
          <CardTitle>Mağaza Kullanıcıları</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    {m.role === 'owner' ? <Crown className="h-5 w-5 text-amber-500" /> : m.role === 'manager' ? <Shield className="h-5 w-5 text-blue-500" /> : <UserIcon className="h-5 w-5 text-gray-400" />}
                    <div>
                      <p className="font-medium">{(fullName(m.profile) || undefined) || m.profile?.email || 'Kullanıcı'}</p>
                      <p className="text-xs text-gray-500">{m.profile?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.role === 'owner' ? (
                      <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">Sahip (değiştirilemez)</span>
                    ) : (
                      <>
                        <select
                          value={m.role}
                          onChange={(e) => changeRole(m.id, e.target.value as 'manager' | 'staff')}
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="staff">Personel</option>
                          <option value="manager">Yönetici</option>
                        </select>
                        <button
                          onClick={() => removeMember(m.id, (fullName(m.profile) || undefined) || m.profile?.email || 'Kullanıcı')}
                          className="rounded p-2 text-red-500 hover:bg-red-50"
                          title="Çıkar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bekleyen davetler */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Bekleyen Davetler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-3">
                  <div>
                    <p className="font-medium">{inv.email}</p>
                    <p className="text-xs text-gray-500">
                      {ROLE_LABEL[inv.role]} · {new Date(inv.expires_at).toLocaleDateString('tr-TR')} tarihine kadar geçerli
                    </p>
                  </div>
                  <button onClick={() => revokeInvite(inv.id)} className="text-sm text-red-600 hover:underline">
                    İptal
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
