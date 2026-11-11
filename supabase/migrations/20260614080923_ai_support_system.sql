-- Canlıya 2026-06-14'te uygulanmış (supabase_migrations.schema_migrations
-- version 20260614080923) ama dosyası repoya hiç eklenmemişti. Schema
-- Reproducibility (DR) 20261007100000_mobile_notifications'taki
-- support_messages trigger'ında kırılıyordu. İçerik canlıdaki kayıtla birebir.

CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START 1000;

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_no text NOT NULL UNIQUE DEFAULT ('NG-' || lpad(nextval('support_ticket_seq')::text, 6, '0')),
  source text NOT NULL DEFAULT 'customer' CHECK (source IN ('customer','seller')),
  user_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  store_id uuid REFERENCES stores(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'other',
  subject text,
  summary text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_customer','resolved','closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  route_to text NOT NULL DEFAULT 'admin' CHECK (route_to IN ('admin','seller','both')),
  session_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_store ON support_tickets(store_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','agent')),
  sender_name text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id, created_at);

-- RLS: yalnızca service role (tüm erişim sunucu tarafından kontrollü)
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
-- Müşteri kendi ticket'larını (giriş yaptıysa) görebilir
CREATE POLICY "user reads own tickets" ON support_tickets FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "user reads own ticket messages" ON support_messages FOR SELECT
  USING (ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid()));
