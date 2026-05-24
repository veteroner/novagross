'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@novagross/ui';
import { Button } from '@novagross/ui';
import { createClient } from '../../../../../lib/supabase/client';
import { CheckCircle, ArrowLeft, Loader2, Store, Mail, Phone, MapPin, Building } from 'lucide-react';

export default function ApproveApplicationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  const handleApprove = async () => {
    try {
      setSubmitting(true);

      const response = await fetch('/api/seller/applications/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: params.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Onaylama başarısız');
      }

      router.push('/satici-basvurulari?success=approved');
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
        <h1 className="text-3xl font-bold">Satıcı Başvurusunu Onayla</h1>
        <p className="text-gray-600 mt-2">
          Bu başvuruyu onaylamak, kullanıcıya satıcı yetkisi verecek ve mağaza oluşturacaktır.
        </p>
      </div>

      {/* Application Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Başvuru Detayları
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Store Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Mağaza Bilgileri</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Mağaza Adı</p>
                <p className="font-medium">{application.store_name}</p>
              </div>
              <div>
                <p className="text-gray-600">URL Slug</p>
                <p className="font-medium">{application.store_slug}</p>
              </div>
            </div>
            {application.description && (
              <div className="mt-4">
                <p className="text-gray-600">Açıklama</p>
                <p className="text-sm">{application.description}</p>
              </div>
            )}
          </div>

          {/* Company Info */}
          {(application.company_name || application.tax_number) && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Building className="w-5 h-5" />
                Firma Bilgileri
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {application.company_name && (
                  <div>
                    <p className="text-gray-600">Firma Adı</p>
                    <p className="font-medium">{application.company_name}</p>
                  </div>
                )}
                {application.tax_number && (
                  <div>
                    <p className="text-gray-600">Vergi Numarası</p>
                    <p className="font-medium">{application.tax_number}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3">İletişim Bilgileri</h3>
            <div className="space-y-2 text-sm">
              {application.email && (
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-600" />
                  {application.email}
                </p>
              )}
              {application.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-600" />
                  {application.phone}
                </p>
              )}
              {(application.address || application.city || application.district) && (
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-600 mt-0.5" />
                  <span>
                    {[application.address, application.district, application.city, application.postal_code]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* User Info */}
          {application.profiles && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Başvuru Sahibi</h3>
              <div className="text-sm">
                <p className="font-medium">
                  {application.profiles.first_name} {application.profiles.last_name}
                </p>
                <p className="text-gray-600">{application.profiles.email}</p>
              </div>
            </div>
          )}

          {/* Created Date */}
          <div>
            <p className="text-sm text-gray-600">
              Başvuru Tarihi: {new Date(application.created_at).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation */}
      <Card>
        <CardContent className="pt-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-900 mb-2">Onaylama Sonrası:</h3>
            <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
              <li>Kullanıcıya satıcı yetkisi verilecek</li>
              <li>Mağaza otomatik olarak oluşturulacak</li>
              <li>Satıcıya onay emaili gönderilecek</li>
              <li>Satıcı, admin panelinden satıcı paneline giriş yapabilecek</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleApprove}
              disabled={submitting}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Onaylanıyor...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Başvuruyu Onayla
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
