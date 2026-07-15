# MNG Kargo sabit-IP relay kurulumu

## Neden gerekli

MNG'nin barkod/tekli işlem uçları IP whitelist istiyor (kanıtlanmış hata:
`20011 "... IP adresi için tek barkod yetkiniz yoktur"`). Netlify
fonksiyonlarının çıkış IP'si sabit değil, bu yüzden whitelist'e girecek bir
IP veremiyoruz. Çözüm: sabit IP'li ucuz bir VPS'e bu küçük relay'i kurup
Netlify → VPS → MNG şeklinde çalışmak. Relay hiçbir iş mantığı içermez,
sadece isteği aynen iletir — tüm auth/hata ayrıştırma kodu değişmeden
`packages/cargo/src/mng.ts`'te kalır.

## 1. VPS oluştur (Hetzner)

1. https://www.hetzner.com/cloud adresinden hesap aç (kredi kartı gerekir).
2. **New Project** → **Add Server**:
   - Location: Falkenstein veya Nuremberg (Almanya) — MNG Türkiye'de olsa da
     gecikme sorun değil, zaten Netlify de global.
   - Image: **Ubuntu 24.04**
   - Type: **CX22** (en ucuz, ~4-5€/ay) yeterli.
   - SSH key ekle (yoksa şifreyle de olur, ama SSH key önerilir).
3. Sunucu oluşunca **IP adresini not al** — bu, MNG'ye bildireceğimiz sabit IP.

## 2. DNS kaydı ekle

`mng-proxy.novagross.com` (ya da benzeri) için VPS IP'sine giden bir **A
kaydı** ekle (novagross.com'un DNS yönetimi neredeyse oradan). TTL düşük
tutulabilir (300).

## 3. Sunucuyu hazırla

SSH ile bağlan: `ssh root@<VPS_IP>`

```bash
# Node.js 20 kur
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Caddy kur (otomatik HTTPS için)
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update && apt-get install -y caddy

# www-data kullanıcısı zaten var; uygulama klasörü
mkdir -p /opt/mng-proxy
```

## 4. Dosyaları kopyala

Bu klasördeki `server.js`, `mng-proxy.service`, `Caddyfile` dosyalarını
VPS'ye kopyala (`scp` ile ya da içeriği yapıştırarak):

```bash
scp server.js root@<VPS_IP>:/opt/mng-proxy/server.js
scp mng-proxy.service root@<VPS_IP>:/etc/systemd/system/mng-proxy.service
scp Caddyfile root@<VPS_IP>:/etc/caddy/Caddyfile
```

## 5. Secret üret ve servisi başlat

```bash
# VPS üzerinde:
SECRET=$(openssl rand -hex 32)
sed -i "s/__CHANGE_ME__/$SECRET/" /etc/systemd/system/mng-proxy.service
echo "PROXY_SECRET: $SECRET"   # bunu kaydet, Netlify env'e gireceğiz

chown -R www-data:www-data /opt/mng-proxy
systemctl daemon-reload
systemctl enable --now mng-proxy
systemctl reload caddy

# Test (sunucunun kendisinden):
curl -s -X POST http://localhost:8080/mngapi/api/token \
  -H "x-relay-secret: $SECRET" -H "Content-Type: application/json" \
  -d '{"test":true}'
# 403 değil, MNG'den gerçek bir yanıt (muhtemelen kimlik hatası) dönmeli
```

## 6. Dışarıdan doğrula

```bash
curl -s -X POST https://mng-proxy.novagross.com/mngapi/api/token \
  -H "x-relay-secret: <SECRET>" -H "Content-Type: application/json" \
  -d '{"test":true}'
```

## 7. Netlify tarafını güncelle

Admin + Seller sitelerinde (her ikisi de `@novagross/cargo` kullanıyor):

```bash
netlify env:set MNG_BASE_URL "https://mng-proxy.novagross.com" --secret --context production
netlify env:set MNG_PROXY_SECRET "<SECRET>" --secret --context production
```

(Kod tarafında `MNG_PROXY_SECRET` okuyup `x-relay-secret` header'ı olarak
ekleyen değişiklik ayrıca yapıldı — bkz. `packages/cargo/src/mng.ts`.)

## 8. MNG'ye IP'yi bildir

Destek ekibine VPS'nin IP adresini ve müşteri numaranızı (Netlify env
`MNG_CUSTOMER_NUMBER` değeri) göndererek bu IP'nin barkod/tekli işlem
uçları için whitelist'e eklenmesini isteyin.

## Bakım notları

- Sunucu yeniden başlarsa `mng-proxy` servisi `enable` sayesinde otomatik
  ayağa kalkar.
- Loglar: `journalctl -u mng-proxy -f`
- Caddy sertifikaları otomatik yenilenir, elle işlem gerekmez.
- VPS'nin IP'si DEĞİŞMEMELİDİR (Hetzner'de sunucuyu silip yeniden
  oluşturmadıkça değişmez) — değişirse MNG'ye tekrar whitelist talebi
  göndermek gerekir.
