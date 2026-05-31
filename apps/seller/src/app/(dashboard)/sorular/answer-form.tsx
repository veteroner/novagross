'use client'

import { useState, useTransition } from 'react'
import { Button } from '@novagross/ui'
import { Loader2 } from 'lucide-react'
import { answerQuestion } from './actions'

export function AnswerForm({
  questionId,
  initialAnswer,
  status,
}: {
  questionId: string
  initialAnswer: string | null
  status: string | null
}) {
  const [answer, setAnswer] = useState(initialAnswer ?? '')
  const [editing, setEditing] = useState(!initialAnswer)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (initialAnswer && !editing) {
    return (
      <div className="bg-gray-50 rounded-md p-3 border border-gray-200 mt-3">
        <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
          <span className="font-medium">Cevabınız</span>
          {status === 'approved' ? (
            <span className="text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
              ✓ Yayında
            </span>
          ) : status === 'rejected' ? (
            <span className="text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
              ✕ Reddedildi
            </span>
          ) : (
            <span className="text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-2 py-0.5">
              ⏳ Moderasyonda
            </span>
          )}
        </div>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{initialAnswer}</p>
        <button
          type="button"
          className="text-xs text-green-700 hover:underline mt-1"
          onClick={() => setEditing(true)}
        >
          Düzenle
        </button>
      </div>
    )
  }

  const onSubmit = () => {
    setError(null)
    startTransition(async () => {
      try {
        await answerQuestion(questionId, answer)
        setEditing(false)
      } catch (err: any) {
        setError(err?.message ?? 'Cevap kaydedilemedi.')
      }
    })
  }

  return (
    <div className="mt-3 space-y-2">
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Müşterinizin sorusuna cevap yazın…"
        rows={3}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        disabled={isPending}
      />
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onSubmit} disabled={isPending || answer.trim().length < 2}>
          {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          {initialAnswer ? 'Güncelle' : 'Cevap Gönder'}
        </Button>
        {initialAnswer && (
          <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={isPending}>
            İptal
          </Button>
        )}
        <span className="text-xs text-gray-500">
          Cevabınız admin onayından sonra ürün sayfasında gösterilir.
        </span>
      </div>
    </div>
  )
}
