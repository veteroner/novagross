'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@novagross/ui';
import { Button } from '@novagross/ui';
import { Input } from '@novagross/ui';
import { 
  Store, 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/client';

export default function SellerApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    let filtered = applications;

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter((app) => app.status === filter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (app) =>
          app.store_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredApplications(filtered);
  }, [searchQuery, filter, applications]);

  const fetchApplications = async () => {
    try {
      const supabase = createClient();

      const { data } = await supabase
        .from('store_applications')
        .select('*')
        .order('created_at', { ascending: false });

      setApplications(data || []);
      setFilteredApplications(data || []);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Beklemede',
      approved: 'Onaylandı',
      rejected: 'Reddedildi',
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Satıcı Başvuruları</h1>
        <p className="text-gray-600">{applications.length} başvuru</p>
      </div>

      {/* Filters & Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Mağaza adı, yetkili veya email ile ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filters */}
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                size="sm"
              >
                Tümü ({applications.length})
              </Button>
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                onClick={() => setFilter('pending')}
                size="sm"
              >
                Beklemede ({applications.filter((a) => a.status === 'pending').length})
              </Button>
              <Button
                variant={filter === 'approved' ? 'default' : 'outline'}
                onClick={() => setFilter('approved')}
                size="sm"
              >
                Onaylı ({applications.filter((a) => a.status === 'approved').length})
              </Button>
              <Button
                variant={filter === 'rejected' ? 'default' : 'outline'}
                onClick={() => setFilter('rejected')}
                size="sm"
              >
                Reddedilen ({applications.filter((a) => a.status === 'rejected').length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Store className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>
              {searchQuery || filter !== 'all'
                ? 'Başvuru bulunamadı'
                : 'Henüz başvuru yok'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => (
            <Card key={application.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(application.status)}
                    <div>
                      <h3 className="text-lg font-bold">{application.store_name}</h3>
                      <p className="text-sm text-gray-600">
                        Başvuru #{application.id.slice(0, 8)} •{' '}
                        {new Date(application.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      application.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : application.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {getStatusText(application.status)}
                  </span>
                </div>

                {/* Application Details */}
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-semibold mb-2">İletişim Bilgileri:</p>
                    <div className="space-y-1 text-sm text-gray-600">
                      {application.email && (
                        <p className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {application.email}
                        </p>
                      )}
                      {application.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {application.phone}
                        </p>
                      )}
                      {(application.city || application.district) && (
                        <p className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {[application.district, application.city].filter(Boolean).join(' / ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold mb-2">Mağaza Açıklaması:</p>
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {application.description || 'Açıklama yok'}
                    </p>
                    {application.company_name && (
                      <p className="text-xs text-gray-500 mt-2">
                        Firma: {application.company_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link href={`/satici-basvurulari/${application.id}`} className="flex-1">
                    <Button variant="outline" className="w-full flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Detayları Görüntüle
                    </Button>
                  </Link>
                  
                  {application.status === 'pending' && (
                    <>
                      <Link href={`/satici-basvurulari/${application.id}/approve`}>
                        <Button className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Onayla
                        </Button>
                      </Link>
                      <Link href={`/satici-basvurulari/${application.id}/reject`}>
                        <Button variant="outline" className="text-red-600 hover:bg-red-50">
                          <XCircle className="w-4 h-4 mr-2" />
                          Reddet
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
