'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@novagross/ui';
import { Button } from '@novagross/ui';
import { Input } from '@novagross/ui';
import { Store, User, Mail, Phone, MapPin, FileText, CheckCircle } from 'lucide-react';
import { KVKKConsent } from '@/components/kvkk-consent';
import { AgreementCheckbox, allRequiredAccepted, type AgreementsState } from '@/components/agreements/agreement-checkbox';

export default function BecomeSellerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [kvkkConsent, setKvkkConsent] = useState(false);
  const [agreements, setAgreements] = useState<AgreementsState>({
    pazaryeri_satici_sozlesmesi: false,
    kvkk_aydinlatma: false,
  });
  
  const [formData, setFormData] = useState({
    storeName: '',
    storeDescription: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    businessAddress: '',
    businessCity: '',
    businessState: '',
    businessPostalCode: '',
    taxNumber: '',
    companyName: '',
    bankName: '',
    bankAccountNumber: '',
    iban: '',
    accountHolder: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!kvkkConsent) {
      setError('KVKK onayını kabul etmelisiniz');
      return;
    }

    if (!allRequiredAccepted(['pazaryeri_satici_sozlesmesi', 'kvkk_aydinlatma'], agreements)) {
      setError('Pazaryeri Satıcı Sözleşmesi ve KVKK Aydınlatma Metni\'ni kabul etmelisiniz.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/seller/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bir hata oluştu');
      }

      // Sözleşme onaylarını yasal kanıt olarak logla
      const acceptedTypes = Object.entries(agreements).filter(([, v]) => v).map(([k]) => k)
      if (acceptedTypes.length > 0) {
        const body: any = { agreements: acceptedTypes }
        if (data?.application_id) body.store_application_id = data.application_id
        await fetch('/api/agreements/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        }).catch(() => {})
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-12 pb-8">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2">Başvurunuz Alındı!</h2>
                <p className="text-gray-600 text-lg">
                  Satıcı başvurunuz başarıyla kaydedildi.
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
                <h3 className="font-semibold text-blue-900 mb-2">Sıradaki Adımlar:</h3>
                <ul className="space-y-2 text-blue-800">
                  <li className="flex gap-2">
                    <span>1.</span>
                    <span>Başvurunuz 1-2 iş günü içinde incelenecektir</span>
                  </li>
                  <li className="flex gap-2">
                    <span>2.</span>
                    <span>Onay sonrası email adresinize <strong>satıcı admin paneli</strong> giriş bilgileri gönderilecektir</span>
                  </li>
                  <li className="flex gap-2">
                    <span>3.</span>
                    <span>Admin panelinizden ürün eklemeye ve mağazanızı yönetmeye başlayabilirsiniz</span>
                  </li>
                </ul>
              </div>
              <Button onClick={() => router.push('/')} size="lg">
                Ana Sayfaya Dön
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3">Satıcı Olun</h1>
          <p className="text-lg text-gray-600">
            Novagross'da mağazanızı açın ve ürünlerinizi binlerce müşteriye ulaştırın
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <Store className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Kendi Mağazanız</h3>
              <p className="text-sm text-gray-600">Markanızı öne çıkaran özel mağaza sayfanız</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <User className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Geniş Müşteri Kitlesi</h3>
              <p className="text-sm text-gray-600">Binlerce aktif alıcıya ulaşın</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <FileText className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Kolay Yönetim</h3>
              <p className="text-sm text-gray-600">Satıcı paneliyle tüm işlemlerinizi yönetin</p>
            </CardContent>
          </Card>
        </div>

        {/* Application Form */}
        <Card>
          <CardHeader>
            <CardTitle>Başvuru Formu</CardTitle>
            <CardDescription>
              Lütfen aşağıdaki bilgileri eksiksiz doldurun
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Store Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Mağaza Bilgileri
                </h3>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Mağaza Adı *
                  </label>
                  <Input
                    required
                    value={formData.storeName}
                    onChange={(e) => handleChange('storeName', e.target.value)}
                    placeholder="Örn: Teknoloji Dünyası"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Mağaza Açıklaması *
                  </label>
                  <textarea
                    required
                    value={formData.storeDescription}
                    onChange={(e) => handleChange('storeDescription', e.target.value)}
                    placeholder="Mağazanız hakkında kısa bir açıklama..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-h-24"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="w-5 h-5" />
                  İletişim Bilgileri
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Yetkili Adı Soyadı *
                    </label>
                    <Input
                      required
                      value={formData.contactName}
                      onChange={(e) => handleChange('contactName', e.target.value)}
                      placeholder="Ahmet Yılmaz"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email *
                    </label>
                    <Input
                      type="email"
                      required
                      value={formData.contactEmail}
                      onChange={(e) => handleChange('contactEmail', e.target.value)}
                      placeholder="ahmet@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Telefon *
                  </label>
                  <Input
                    type="tel"
                    required
                    value={formData.contactPhone}
                    onChange={(e) => handleChange('contactPhone', e.target.value)}
                    placeholder="0532 123 45 67"
                  />
                </div>
              </div>

              {/* Business Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  İşyeri Adresi
                </h3>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Adres *
                  </label>
                  <Input
                    required
                    value={formData.businessAddress}
                    onChange={(e) => handleChange('businessAddress', e.target.value)}
                    placeholder="Cadde, Sokak, No"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      İlçe *
                    </label>
                    <Input
                      required
                      value={formData.businessState}
                      onChange={(e) => handleChange('businessState', e.target.value)}
                      placeholder="Kadıköy"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      İl *
                    </label>
                    <Input
                      required
                      value={formData.businessCity}
                      onChange={(e) => handleChange('businessCity', e.target.value)}
                      placeholder="İstanbul"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Posta Kodu *
                    </label>
                    <Input
                      required
                      value={formData.businessPostalCode}
                      onChange={(e) => handleChange('businessPostalCode', e.target.value)}
                      placeholder="34710"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Şirket ve Vergi Bilgileri
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Şirket / Firma Adı
                    </label>
                    <Input
                      value={formData.companyName}
                      onChange={(e) => handleChange('companyName', e.target.value)}
                      placeholder="ABC Ticaret Ltd. Şti."
                    />
                    <p className="text-xs text-gray-500 mt-1">Bireysel satıcılar boş bırakabilir</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Vergi Numarası *
                    </label>
                    <Input
                      required
                      value={formData.taxNumber}
                      onChange={(e) => handleChange('taxNumber', e.target.value)}
                      placeholder="1234567890"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Banka Adı *
                    </label>
                    <Input
                      required
                      value={formData.bankName}
                      onChange={(e) => handleChange('bankName', e.target.value)}
                      placeholder="Örn: Ziraat Bankası"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Hesap Sahibi *
                    </label>
                    <Input
                      required
                      value={formData.accountHolder}
                      onChange={(e) => handleChange('accountHolder', e.target.value)}
                      placeholder="Ad Soyad veya Şirket Adı"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      IBAN *
                    </label>
                    <Input
                      required
                      value={formData.iban}
                      onChange={(e) => handleChange('iban', e.target.value)}
                      placeholder="TR00 0000 0000 0000 0000 0000 00"
                      className="font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Hesap Numarası
                    </label>
                    <Input
                      value={formData.bankAccountNumber}
                      onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
                      placeholder="1234567890"
                    />
                    <p className="text-xs text-gray-500 mt-1">Opsiyonel</p>
                  </div>
                </div>
              </div>

              <KVKKConsent
                checked={kvkkConsent}
                onChange={setKvkkConsent}
                variant="seller"
                required
              />

              <div className="space-y-2 border-t pt-4">
                <AgreementCheckbox
                  type="pazaryeri_satici_sozlesmesi"
                  checked={!!agreements.pazaryeri_satici_sozlesmesi}
                  onChange={(v) => setAgreements((s) => ({ ...s, pazaryeri_satici_sozlesmesi: v }))}
                  disabled={loading}
                />
                <AgreementCheckbox
                  type="kvkk_aydinlatma"
                  checked={!!agreements.kvkk_aydinlatma}
                  onChange={(v) => setAgreements((s) => ({ ...s, kvkk_aydinlatma: v }))}
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                  size="lg"
                >
                  {loading ? 'Gönderiliyor...' : 'Başvuruyu Gönder'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/')}
                  size="lg"
                >
                  İptal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Başvuru yapmakla{' '}
            <a href="/satici-sozlesmesi" className="text-primary hover:underline">
              Satıcı Sözleşmesi
            </a>
            'ni kabul etmiş olursunuz.
          </p>
        </div>
      </div>
    </div>
  );
}
