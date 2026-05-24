'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@novagross/ui';
import { Button } from '@novagross/ui';
import { createClient } from '../../../../../lib/supabase/client';
import { XCircle, ArrowLeft, Loader2, Store, AlertTriangle } from 'lucide-react';

export default function RejectApplicationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchApplication();
  }, []);

  const fetchApplication = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('store_applications')
        .select(`
          *,
          profiles:user_id (
            id,
            email,
            first_name,
            last_name
          )
        `)
        .eq('id', params.id)
        .single();

      setApplication(data);
    } catch (error) {
      console.error('Failed to fetch application:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      alert('Lütfen reddetme sebebini belirtin');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch('/api/seller/applications/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: params.id,
          reason: reason.trim(),
          adminNotes: adminNotes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Reddetme başarısız');
      }

      router.push('/satici-basvurulari?success=rejected');
    } catch (error: any) {
      alert(error.message || 'Bir hata oluştu');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Başvuru bulunamadı</p>
            <Button onClick={() => router.back()} className="mt-4">
              Geri Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri Dön
        </Button>
        <h1 className="text-3xl font-bold">Satıcı Başvurusunu Reddet</h1>
        <p className="text-gray-600 mt-2">
          Bu başvuruyu reddetmek için sebep belirtmeniz gerekiyor.
        </p>
      </div>

      {/* Application Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Başvuru Özeti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Mağaza Adı: </span>
              <span className="font-medium">{application.store_name}</span>
            </div>
            <div>
              <span className="text-gray-600">Başvuru Sahibi: </span>
              <span className="font-medium">
                {application.profiles?.first_name} {application.profiles?.last_name}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Email: </span>
              <span className="font-medium">{application.email}</span>
            </div>
            <div>
              <span className="text-gray-600">Başvuru Tarihi: </span>
              <span className="font-medium">
                {new Date(application.created_at).toLocaleDateString('tr-TR')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rejection Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Reddetme Sebebi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Reddetme Sebebi <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-600 mb-2">
              Bu sebep başvuru sahibine email ile gönderilecektir.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Örn: Eksik belgeler, yetersiz bilgi, kriterlere uyumsuzluk..."
              rows={4}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Admin Notları (İsteğe Bağlı)
            </label>
            <p className="text-xs text-gray-600 mb-2">
              Bu notlar sadece admin panelinde görünür, başvuru sahibine gönderilmez.
            </p>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="İç notlar, takip bilgileri vb."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Quick Reasons */}
          <div>
            <p className="text-sm font-medium mb-2">Hızlı Sebepler:</p>
            <div className="flex flex-wrap gap-2">
              {[
                'Eksik veya hatalı belgeler',
                'Yetersiz mağaza açıklaması',
                'İletişim bilgileri doğrulanamadı',
                'Ürün kategorisi uygun değil',
                'Başvuru kriterleri karşılanmadı',
              ].map((quickReason) => (
                <Button
                  key={quickReason}
                  variant="outline"
                  size="sm"
                  onClick={() => setReason(quickReason)}
                  type="button"
                >
                  {quickReason}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning & Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Dikkat</h3>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• Başvuru reddedilecek ve durum değiştirilecek</li>
                  <li>• Başvuru sahibine red sebebi email ile gönderilecek</li>
                  <li>• Kullanıcı yeni bir başvuru yapabilir</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleReject}
              disabled={submitting || !reason.trim()}
              variant="destructive"
              className="flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Reddediliyor...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Başvuruyu Reddet
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
            >
              İptal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
