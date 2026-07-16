-- MNG resmi barkod desteği:
-- createbarcode yanıtındaki gerçek barkod değeri (takip numarasından FARKLI,
-- örn. "C@56@DN1PGVEAIAAA6J") ve ZPL formatındaki resmi etiket verisi.
-- Yerel Code128 etiket takip numarasını kodladığı için MNG şubesi tarafından
-- reddedildi (2026-07-16) — okuyucular bu resmi değeri bekliyor.
alter table order_shipments
  add column if not exists official_barcode text,
  add column if not exists label_zpl text;

comment on column order_shipments.official_barcode is
  'MNG createbarcode yanıtındaki gerçek barkod değeri (barcodes[0].barcode) — etiket Code128/DataMatrix içeriği bu olmalı, takip numarası DEĞİL';
comment on column order_shipments.label_zpl is
  'MNG resmi etiketi ZPL (Zebra) formatında (barcodes[0].value) — termal yazıcı için ham veri';
