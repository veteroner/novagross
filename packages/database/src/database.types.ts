export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          address_type: string | null
          city: string
          country: string | null
          created_at: string | null
          district: string
          first_name: string
          id: string
          is_default: boolean | null
          last_name: string
          phone: string
          postal_code: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          address_type?: string | null
          city: string
          country?: string | null
          created_at?: string | null
          district: string
          first_name: string
          id?: string
          is_default?: boolean | null
          last_name: string
          phone: string
          postal_code?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          address_type?: string | null
          city?: string
          country?: string | null
          created_at?: string | null
          district?: string
          first_name?: string
          id?: string
          is_default?: boolean | null
          last_name?: string
          phone?: string
          postal_code?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          cart_id: string
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          cart_id?: string
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string | null
          id: string
          session_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          free_shipping: boolean | null
          id: string
          is_active: boolean | null
          maximum_discount: number | null
          minimum_amount: number | null
          starts_at: string | null
          updated_at: string | null
          usage_limit: number | null
          used_count: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          free_shipping?: boolean | null
          id?: string
          is_active?: boolean | null
          maximum_discount?: number | null
          minimum_amount?: number | null
          starts_at?: string | null
          updated_at?: string | null
          usage_limit?: number | null
          used_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          free_shipping?: boolean | null
          id?: string
          is_active?: boolean | null
          maximum_discount?: number | null
          minimum_amount?: number | null
          starts_at?: string | null
          updated_at?: string | null
          usage_limit?: number | null
          used_count?: number | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          bounced_at: string | null
          clicked_at: string | null
          created_at: string | null
          data: Json | null
          delivered_at: string | null
          error: string | null
          id: string
          ip_address: unknown
          opened_at: string | null
          recipient: string
          resend_id: string | null
          sent_at: string | null
          status: string
          subject: string
          template: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          bounced_at?: string | null
          clicked_at?: string | null
          created_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          error?: string | null
          id?: string
          ip_address?: unknown
          opened_at?: string | null
          recipient: string
          resend_id?: string | null
          sent_at?: string | null
          status: string
          subject: string
          template: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          bounced_at?: string | null
          clicked_at?: string | null
          created_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          error?: string | null
          id?: string
          ip_address?: unknown
          opened_at?: string | null
          recipient?: string
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          abandoned_cart: boolean | null
          bounced: boolean | null
          created_at: string | null
          email: string
          frequency: string | null
          id: string
          marketing: boolean | null
          newsletters: boolean | null
          order_updates: boolean | null
          product_updates: boolean | null
          review_requests: boolean | null
          unsubscribed_all: boolean | null
          unsubscribed_at: string | null
          updated_at: string | null
          user_id: string | null
          wishlist_alerts: boolean | null
        }
        Insert: {
          abandoned_cart?: boolean | null
          bounced?: boolean | null
          created_at?: string | null
          email: string
          frequency?: string | null
          id?: string
          marketing?: boolean | null
          newsletters?: boolean | null
          order_updates?: boolean | null
          product_updates?: boolean | null
          review_requests?: boolean | null
          unsubscribed_all?: boolean | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          wishlist_alerts?: boolean | null
        }
        Update: {
          abandoned_cart?: boolean | null
          bounced?: boolean | null
          created_at?: string | null
          email?: string
          frequency?: string | null
          id?: string
          marketing?: boolean | null
          newsletters?: boolean | null
          order_updates?: boolean | null
          product_updates?: boolean | null
          review_requests?: boolean | null
          unsubscribed_all?: boolean | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          wishlist_alerts?: boolean | null
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          last_error: string | null
          priority: string
          recipient: string
          retry_count: number | null
          scheduled_at: string
          status: string
          subject: string
          template: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          id?: string
          last_error?: string | null
          priority?: string
          recipient: string
          retry_count?: number | null
          scheduled_at?: string
          status?: string
          subject: string
          template: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          last_error?: string | null
          priority?: string
          recipient?: string
          retry_count?: number | null
          scheduled_at?: string
          status?: string
          subject?: string
          template?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_templates_analytics: {
        Row: {
          bounce_rate: number | null
          bounced_count: number | null
          click_rate: number | null
          clicked_count: number | null
          created_at: string | null
          delivered_count: number | null
          id: string
          open_rate: number | null
          opened_count: number | null
          period: string
          sent_count: number | null
          template: string
          unsubscribed_count: number | null
          updated_at: string | null
        }
        Insert: {
          bounce_rate?: number | null
          bounced_count?: number | null
          click_rate?: number | null
          clicked_count?: number | null
          created_at?: string | null
          delivered_count?: number | null
          id?: string
          open_rate?: number | null
          opened_count?: number | null
          period: string
          sent_count?: number | null
          template: string
          unsubscribed_count?: number | null
          updated_at?: string | null
        }
        Update: {
          bounce_rate?: number | null
          bounced_count?: number | null
          click_rate?: number | null
          clicked_count?: number | null
          created_at?: string | null
          delivered_count?: number | null
          id?: string
          open_rate?: number | null
          opened_count?: number | null
          period?: string
          sent_count?: number | null
          template?: string
          unsubscribed_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_unsubscribes: {
        Row: {
          category: string | null
          email: string
          id: string
          ip_address: unknown
          reason: string | null
          unsubscribed_at: string | null
          user_agent: string | null
        }
        Insert: {
          category?: string | null
          email: string
          id?: string
          ip_address?: unknown
          reason?: string | null
          unsubscribed_at?: string | null
          user_agent?: string | null
        }
        Update: {
          category?: string | null
          email?: string
          id?: string
          ip_address?: unknown
          reason?: string | null
          unsubscribed_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      email_verification_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token_hash: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token_hash: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token_hash?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          commission_amount: number | null
          commission_rate: number | null
          created_at: string | null
          id: string
          name: string
          options: Json | null
          order_id: string
          price: number
          product_id: string | null
          quantity: number
          seller_amount: number | null
          sku: string | null
          store_id: string | null
          total: number
          variant_id: string | null
        }
        Insert: {
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          name: string
          options?: Json | null
          order_id: string
          price: number
          product_id?: string | null
          quantity: number
          seller_amount?: number | null
          sku?: string | null
          store_id?: string | null
          total: number
          variant_id?: string | null
        }
        Update: {
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          name?: string
          options?: Json | null
          order_id?: string
          price?: number
          product_id?: string | null
          quantity?: number
          seller_amount?: number | null
          sku?: string | null
          store_id?: string | null
          total?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_order_items_store"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_shipments: {
        Row: {
          carrier_id: string
          created_at: string | null
          delivered_at: string | null
          estimated_delivery_at: string | null
          id: string
          method_id: string
          notes: string | null
          order_id: string
          package_dimensions: Json | null
          package_weight: number | null
          shipped_at: string | null
          shipping_cost: number
          shipping_label_url: string | null
          status: string
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string | null
        }
        Insert: {
          carrier_id: string
          created_at?: string | null
          delivered_at?: string | null
          estimated_delivery_at?: string | null
          id?: string
          method_id: string
          notes?: string | null
          order_id: string
          package_dimensions?: Json | null
          package_weight?: number | null
          shipped_at?: string | null
          shipping_cost: number
          shipping_label_url?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
        }
        Update: {
          carrier_id?: string
          created_at?: string | null
          delivered_at?: string | null
          estimated_delivery_at?: string | null
          id?: string
          method_id?: string
          notes?: string | null
          order_id?: string
          package_dimensions?: Json | null
          package_weight?: number | null
          shipped_at?: string | null
          shipping_cost?: number
          shipping_label_url?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_shipments_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "shipping_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_shipments_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "shipping_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          cancelled_at: string | null
          cancelled_reason: string | null
          created_at: string | null
          currency: string | null
          delivered_at: string | null
          discount_amount: number | null
          email: string
          has_multiple_stores: boolean | null
          id: string
          notes: string | null
          order_number: string
          payment_status: string | null
          phone: string
          primary_store_id: string | null
          return_deadline: string | null
          shipping_address: Json
          shipping_cost: number | null
          shipping_method: string | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          total: number
          tracking_number: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          billing_address?: Json | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string | null
          currency?: string | null
          discount_amount?: number | null
          email: string
          has_multiple_stores?: boolean | null
          id?: string
          notes?: string | null
          order_number: string
          payment_status?: string | null
          phone: string
          primary_store_id?: string | null
          shipping_address: Json
          shipping_cost?: number | null
          shipping_method?: string | null
          status?: string | null
          subtotal: number
          tax_amount?: number | null
          total: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          billing_address?: Json | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string | null
          currency?: string | null
          discount_amount?: number | null
          email?: string
          has_multiple_stores?: boolean | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_status?: string | null
          phone?: string
          primary_store_id?: string | null
          shipping_address?: Json
          shipping_cost?: number | null
          shipping_method?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total?: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_orders_store"
            columns: ["primary_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          purpose: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          purpose?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          purpose?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          card_brand: string | null
          card_last_four: string | null
          created_at: string | null
          currency: string | null
          error_message: string | null
          id: string
          installment: number | null
          metadata: Json | null
          order_id: string
          paid_at: string | null
          payment_method: string | null
          provider: string
          provider_payment_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string | null
          currency?: string | null
          error_message?: string | null
          id?: string
          installment?: number | null
          metadata?: Json | null
          order_id: string
          paid_at?: string | null
          payment_method?: string | null
          provider: string
          provider_payment_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string | null
          currency?: string | null
          error_message?: string | null
          id?: string
          installment?: number | null
          metadata?: Json | null
          order_id?: string
          paid_at?: string | null
          payment_method?: string | null
          provider?: string
          provider_payment_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          product_id: string
          sort_order: number | null
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          product_id: string
          sort_order?: number | null
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          product_id?: string
          sort_order?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          compare_price: number | null
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          options: Json | null
          price: number
          product_id: string
          sku: string | null
          stock: number | null
          updated_at: string | null
        }
        Insert: {
          compare_price?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          options?: Json | null
          price: number
          product_id: string
          sku?: string | null
          stock?: number | null
          updated_at?: string | null
        }
        Update: {
          compare_price?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          options?: Json | null
          price?: number
          product_id?: string
          sku?: string | null
          stock?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          barcode: string | null
          brand: string | null
          category_id: string | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          dimensions: Json | null
          id: string
          is_active: boolean | null
          is_digital: boolean | null
          is_featured: boolean | null
          low_stock_threshold: number | null
          meta_description: string | null
          meta_title: string | null
          name: string
          price: number
          rejection_reason: string | null
          sku: string | null
          slug: string
          stock: number | null
          store_id: string | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          id?: string
          is_active?: boolean | null
          is_digital?: boolean | null
          is_featured?: boolean | null
          low_stock_threshold?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          price: number
          rejection_reason?: string | null
          sku?: string | null
          slug: string
          stock?: number | null
          store_id?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          id?: string
          is_active?: boolean | null
          is_digital?: boolean | null
          is_featured?: boolean | null
          low_stock_threshold?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          price?: number
          rejection_reason?: string | null
          sku?: string | null
          slug?: string
          stock?: number | null
          store_id?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_products_store"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          email_verified: boolean | null
          email_verified_at: string | null
          first_name: string | null
          id: string
          is_seller: boolean | null
          last_name: string | null
          metadata: Json | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          email_verified?: boolean | null
          email_verified_at?: string | null
          first_name?: string | null
          id: string
          is_seller?: boolean | null
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          email_verified?: boolean | null
          email_verified_at?: string | null
          first_name?: string | null
          id?: string
          is_seller?: boolean | null
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          is_approved: boolean | null
          is_verified: boolean | null
          order_id: string | null
          product_id: string
          rating: number
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_verified?: boolean | null
          order_id?: string | null
          product_id: string
          rating: number
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_verified?: boolean | null
          order_id?: string | null
          product_id?: string
          rating?: number
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_carriers: {
        Row: {
          api_enabled: boolean | null
          api_endpoint: string | null
          api_key_required: boolean | null
          code: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          tracking_url_template: string | null
          updated_at: string | null
        }
        Insert: {
          api_enabled?: boolean | null
          api_endpoint?: string | null
          api_key_required?: boolean | null
          code: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          tracking_url_template?: string | null
          updated_at?: string | null
        }
        Update: {
          api_enabled?: boolean | null
          api_endpoint?: string | null
          api_key_required?: boolean | null
          code?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          tracking_url_template?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shipping_methods: {
        Row: {
          carrier_id: string
          code: string
          created_at: string | null
          description: string | null
          estimated_delivery_days: number | null
          estimated_delivery_days_max: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          carrier_id: string
          code: string
          created_at?: string | null
          description?: string | null
          estimated_delivery_days?: number | null
          estimated_delivery_days_max?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          carrier_id?: string
          code?: string
          created_at?: string | null
          description?: string | null
          estimated_delivery_days?: number | null
          estimated_delivery_days_max?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_methods_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "shipping_carriers"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_rates: {
        Row: {
          base_price: number
          created_at: string | null
          free_shipping_threshold: number | null
          id: string
          is_active: boolean | null
          max_order_value: number | null
          max_weight: number | null
          method_id: string
          min_order_value: number | null
          min_weight: number | null
          price_per_kg: number | null
          region: string | null
          updated_at: string | null
        }
        Insert: {
          base_price?: number
          created_at?: string | null
          free_shipping_threshold?: number | null
          id?: string
          is_active?: boolean | null
          max_order_value?: number | null
          max_weight?: number | null
          method_id: string
          min_order_value?: number | null
          min_weight?: number | null
          price_per_kg?: number | null
          region?: string | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          created_at?: string | null
          free_shipping_threshold?: number | null
          id?: string
          is_active?: boolean | null
          max_order_value?: number | null
          max_weight?: number | null
          method_id?: string
          min_order_value?: number | null
          min_weight?: number | null
          price_per_kg?: number | null
          region?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rates_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "shipping_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_status_history: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          location: string | null
          raw_data: Json | null
          shipment_id: string
          status: string
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          raw_data?: Json | null
          shipment_id: string
          status: string
          timestamp: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          raw_data?: Json | null
          shipment_id?: string
          status?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_status_history_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "order_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      store_applications: {
        Row: {
          account_holder: string | null
          address: string | null
          admin_notes: string | null
          bank_name: string | null
          business_license_url: string | null
          city: string | null
          company_name: string | null
          created_at: string | null
          description: string | null
          district: string | null
          email: string | null
          iban: string | null
          id: string
          identity_document_url: string | null
          other_documents: Json | null
          phone: string | null
          postal_code: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          store_name: string
          store_slug: string
          tax_certificate_url: string | null
          tax_number: string | null
          user_id: string
        }
        Insert: {
          account_holder?: string | null
          address?: string | null
          admin_notes?: string | null
          bank_name?: string | null
          business_license_url?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          description?: string | null
          district?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          identity_document_url?: string | null
          other_documents?: Json | null
          phone?: string | null
          postal_code?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          store_name: string
          store_slug: string
          tax_certificate_url?: string | null
          tax_number?: string | null
          user_id: string
        }
        Update: {
          account_holder?: string | null
          address?: string | null
          admin_notes?: string | null
          bank_name?: string | null
          business_license_url?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          description?: string | null
          district?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          identity_document_url?: string | null
          other_documents?: Json | null
          phone?: string | null
          postal_code?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          store_name?: string
          store_slug?: string
          tax_certificate_url?: string | null
          tax_number?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_balance: {
        Row: {
          available_balance: number | null
          id: string
          last_payout_date: string | null
          next_payout_date: string | null
          pending_balance: number | null
          store_id: string
          total_withdrawn: number | null
          updated_at: string | null
        }
        Insert: {
          available_balance?: number | null
          id?: string
          last_payout_date?: string | null
          next_payout_date?: string | null
          pending_balance?: number | null
          store_id: string
          total_withdrawn?: number | null
          updated_at?: string | null
        }
        Update: {
          available_balance?: number | null
          id?: string
          last_payout_date?: string | null
          next_payout_date?: string | null
          pending_balance?: number | null
          store_id?: string
          total_withdrawn?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_balance_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_followers: {
        Row: {
          created_at: string | null
          id: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_followers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_followers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          is_hidden: boolean | null
          is_verified: boolean | null
          order_id: string | null
          rating: number
          store_id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_hidden?: boolean | null
          is_verified?: boolean | null
          order_id?: string | null
          rating: number
          store_id: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_hidden?: boolean | null
          is_verified?: boolean | null
          order_id?: string | null
          rating?: number
          store_id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_shipping_settings: {
        Row: {
          created_at: string | null
          custom_base_price: number | null
          custom_free_shipping_threshold: number | null
          id: string
          is_enabled: boolean | null
          method_id: string
          processing_time_days: number | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_base_price?: number | null
          custom_free_shipping_threshold?: number | null
          id?: string
          is_enabled?: boolean | null
          method_id: string
          processing_time_days?: number | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_base_price?: number | null
          custom_free_shipping_threshold?: number | null
          id?: string
          is_enabled?: boolean | null
          method_id?: string
          processing_time_days?: number | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_shipping_settings_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "shipping_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_shipping_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string | null
          description: string | null
          id: string
          is_paid: boolean | null
          metadata: Json | null
          order_id: string | null
          order_item_id: string | null
          payout_date: string | null
          store_id: string
          type: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_paid?: boolean | null
          metadata?: Json | null
          order_id?: string | null
          order_item_id?: string | null
          payout_date?: string | null
          store_id: string
          type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_paid?: boolean | null
          metadata?: Json | null
          order_id?: string | null
          order_item_id?: string | null
          payout_date?: string | null
          store_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_transactions_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          account_holder: string | null
          address: string | null
          approved_at: string | null
          approved_by: string | null
          bank_name: string | null
          banner_url: string | null
          city: string | null
          commission_rate: number | null
          company_name: string | null
          country: string | null
          created_at: string | null
          description: string | null
          district: string | null
          email: string | null
          free_shipping_threshold: number | null
          iban: string | null
          id: string
          is_verified: boolean | null
          logo_url: string | null
          owner_id: string
          phone: string | null
          postal_code: string | null
          rating: number | null
          shipping_methods: Json | null
          status: string | null
          store_name: string
          store_slug: string
          tax_number: string | null
          tax_office: string | null
          total_revenue: number | null
          total_reviews: number | null
          total_sales: number | null
          updated_at: string | null
          verification_badge: string | null
        }
        Insert: {
          account_holder?: string | null
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bank_name?: string | null
          banner_url?: string | null
          city?: string | null
          commission_rate?: number | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          district?: string | null
          email?: string | null
          free_shipping_threshold?: number | null
          iban?: string | null
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          owner_id: string
          phone?: string | null
          postal_code?: string | null
          rating?: number | null
          shipping_methods?: Json | null
          status?: string | null
          store_name: string
          store_slug: string
          tax_number?: string | null
          tax_office?: string | null
          total_revenue?: number | null
          total_reviews?: number | null
          total_sales?: number | null
          updated_at?: string | null
          verification_badge?: string | null
        }
        Update: {
          account_holder?: string | null
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bank_name?: string | null
          banner_url?: string | null
          city?: string | null
          commission_rate?: number | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          district?: string | null
          email?: string | null
          free_shipping_threshold?: number | null
          iban?: string | null
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          owner_id?: string
          phone?: string | null
          postal_code?: string | null
          rating?: number | null
          shipping_methods?: Json | null
          status?: string | null
          store_name?: string
          store_slug?: string
          tax_number?: string | null
          tax_office?: string | null
          total_revenue?: number | null
          total_reviews?: number | null
          total_sales?: number | null
          updated_at?: string | null
          verification_badge?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stores_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          account_holder: string
          admin_notes: string | null
          amount: number
          bank_name: string
          completed_at: string | null
          created_at: string | null
          fee: number | null
          iban: string
          id: string
          net_amount: number
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          requested_at: string | null
          status: string | null
          store_id: string
          transaction_id: string | null
        }
        Insert: {
          account_holder: string
          admin_notes?: string | null
          amount: number
          bank_name: string
          completed_at?: string | null
          created_at?: string | null
          fee?: number | null
          iban: string
          id?: string
          net_amount: number
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          status?: string | null
          store_id: string
          transaction_id?: string | null
        }
        Update: {
          account_holder?: string
          admin_notes?: string | null
          amount?: number
          bank_name?: string
          completed_at?: string | null
          created_at?: string | null
          fee?: number | null
          iban?: string
          id?: string
          net_amount?: number
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          status?: string | null
          store_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_payout_date: { Args: { order_date: string }; Returns: string }
      calculate_shipping_cost: {
        Args: {
          p_method_id: string
          p_order_value: number
          p_region?: string
          p_store_id: string
          p_weight?: number
        }
        Returns: number
      }
      check_email_rate_limit: {
        Args: {
          p_limit_daily?: number
          p_limit_hourly?: number
          p_recipient: string
        }
        Returns: boolean
      }
      cleanup_expired_otp_codes: { Args: never; Returns: undefined }
      cleanup_expired_reset_tokens: { Args: never; Returns: undefined }
      cleanup_expired_verification_tokens: { Args: never; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      normalize_slug: { Args: { input: string }; Returns: string }
      owns_store: { Args: { store_id_param: string }; Returns: boolean }
      process_order_commissions: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      sanitize_text: { Args: { input: string }; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      validate_commission_rate: { Args: { rate: number }; Returns: boolean }
      validate_email: { Args: { email: string }; Returns: boolean }
      validate_iban: { Args: { iban: string }; Returns: boolean }
      validate_phone: { Args: { phone: string }; Returns: boolean }
      validate_price: { Args: { price: number }; Returns: boolean }
      validate_stock: { Args: { stock: number }; Returns: boolean }
      validate_tc_kimlik: { Args: { tc: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_level: { Args: { name: string }; Returns: number }
      get_prefix: { Args: { name: string }; Returns: string }
      get_prefixes: { Args: { name: string }; Returns: string[] }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      lock_top_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
