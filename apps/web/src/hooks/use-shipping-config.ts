'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ShippingConfig {
  freeShippingThreshold: number // 0 = always free
  standardShippingCost: number
  expressShippingCost: number
  loaded: boolean
}

const DEFAULT_CONFIG: ShippingConfig = {
  freeShippingThreshold: 500,
  standardShippingCost: 29.99,
  expressShippingCost: 49.99,
  loaded: false,
}

/**
 * Fetches shipping config from the store(s) associated with cart products.
 * If products span multiple stores, uses the minimum threshold (most customer-friendly).
 * Falls back to defaults if no store config is found.
 */
export function useShippingConfig(productIds: string[]): ShippingConfig {
  const [config, setConfig] = useState<ShippingConfig>(DEFAULT_CONFIG)

  useEffect(() => {
    if (productIds.length === 0) {
      setConfig({ ...DEFAULT_CONFIG, loaded: true })
      return
    }

    const supabase = createClient()

    const fetchConfig = async () => {
      try {
        // Get store_ids from products
        const { data: products } = await supabase
          .from('products')
          .select('store_id')
          .in('id', productIds)

        if (!products || products.length === 0) {
          setConfig({ ...DEFAULT_CONFIG, loaded: true })
          return
        }

        const storeIds = [...new Set(products.map(p => p.store_id).filter(Boolean))] as string[]
        
        if (storeIds.length === 0) {
          setConfig({ ...DEFAULT_CONFIG, loaded: true })
          return
        }

        // Get store shipping settings
        const { data: stores } = await supabase
          .from('stores')
          .select('free_shipping_threshold, shipping_methods')
          .in('id', storeIds)

        if (!stores || stores.length === 0) {
          setConfig({ ...DEFAULT_CONFIG, loaded: true })
          return
        }

        // Use the minimum threshold across all stores (most customer-friendly)
        const thresholds = stores
          .map(s => s.free_shipping_threshold)
          .filter((t): t is number => t !== null && t !== undefined)

        const threshold = thresholds.length > 0 ? Math.min(...thresholds) : DEFAULT_CONFIG.freeShippingThreshold

        setConfig({
          freeShippingThreshold: threshold,
          standardShippingCost: DEFAULT_CONFIG.standardShippingCost,
          expressShippingCost: DEFAULT_CONFIG.expressShippingCost,
          loaded: true,
        })
      } catch (error) {
        console.error('Error fetching shipping config:', error)
        setConfig({ ...DEFAULT_CONFIG, loaded: true })
      }
    }

    fetchConfig()
  }, [productIds.join(',')])

  return config
}

/**
 * Calculate shipping cost based on config
 */
export function calculateShippingCost(
  config: ShippingConfig,
  subtotal: number,
  method: 'standard' | 'express' = 'standard',
  options?: { freeShipping?: boolean }
): number {
  if (options?.freeShipping && method === 'standard') {
    return 0
  }
  if (method === 'express') {
    return config.expressShippingCost
  }
  // threshold of 0 means always free shipping
  if (config.freeShippingThreshold === 0) {
    return 0
  }
  return subtotal >= config.freeShippingThreshold ? 0 : config.standardShippingCost
}
