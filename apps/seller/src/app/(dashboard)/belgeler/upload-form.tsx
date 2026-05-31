'use client'

import { useState, useTransition } from 'react'
import { Button, Card, Input, Label } from '@novagross/ui'
import { Loader2, Upload, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createDocument, type DocType } from './actions'

const DOC_TYPE_LABEL: Record<DocType, string> = {
  tax_certificate: 'Vergi Levhası',
  id_card: 'Kimlik Belgesi',
  contract: 'Sözleşme',
  signature_circular: 'İmza Sirküleri',
  trade_registry: 'Ticaret Sicil Gazetesi',
  other: 'Diğer',
}

export function UploadForm({ storeId }: { storeId: string }) {
  const [open, setOpen] = useState(false)
  const [docType, setDocType] = useState<DocType>('tax_certificate')
  const [title, setTitle] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const close = () => {
    setOpen(false)
    setTitle('')
    setExpiresAt('')
    setFile(null)
    setError(null)
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!file) {
      setError('Lütfen bir dosya seçin.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Dosya 10 MB üstünde olamaz.')
      return
    }

    startTransition(async () => {
      try {
        const supabase = createClient()
        const ext = file.name.split('.').pop() || 'bin'
        const path = `${storeId}/${Date.now()}_${Math.random()
          .toString(36)
          .slice(2)}.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(path, file, { upsert: false, contentType: file.type })

        if (uploadErr) throw uploadErr

        await createDocument({
          doc_type: docType,
          title: title.trim(),
          file_url: path,
          file_size_bytes: file.size,
          mime_type: file.type,
          expires_at: expiresAt || null,
        })

        close()
      } catch (err: any) {
        setError(err?.message ?? 'Yükleme başarısız.')
      }
    })
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        style={{ backgroundColor: '#16A34A' }}
        className="text-white"
      >
        <Upload className="h-4 w-4 mr-2" />
        Belge Yükle
      </Button>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Yeni Belge Yükle</h2>
        <Button variant="ghost" size="sm" onClick={close} disabled={isPending}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="doc_type">Belge Tipi *</Label>
          <select
            id="doc_type"
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocType)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={isPending}
          >
            {(Object.keys(DOC_TYPE_LABEL) as DocType[]).map((t) => (
              <option key={t} value={t}>
                {DOC_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="title">Başlık *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={DOC_TYPE_LABEL[docType]}
            required
            disabled={isPending}
          />
        </div>

        <div>
          <Label htmlFor="file">Dosya * (max 10 MB)</Label>
          <input
            id="file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm rounded-md border border-input bg-background px-3 py-2"
            disabled={isPending}
            required
          />
          {file && (
            <p className="text-xs text-gray-500 mt-1">
              {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="expires_at">Geçerlilik Sonu (opsiyonel)</Label>
          <Input
            id="expires_at"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            disabled={isPending}
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={close} disabled={isPending}>
            İptal
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            style={{ backgroundColor: '#16A34A' }}
            className="text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Yükleniyor…
              </>
            ) : (
              'Yükle'
            )}
          </Button>
        </div>
      </form>
    </Card>
  )
}
