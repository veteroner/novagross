'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Fetches the default shipping threshold from the first active store.
 * Used in static information pages to display dynamic shipping policy.
 */
export function useDefaultShippingThreshold() {
  const [threshold, setThreshold] = useState<number>(500)

  useEffect(() => {
    const fetchThreshold = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('stores')
        .select('free_shipping_threshold')
        .eq('status', 'active')
        .order('created_at')
        .limit(1)
        .maybeSingle()

      if (data?.free_shipping_threshold !== undefined && data.free_shipping_threshold !== null) {
        setThreshold(data.free_shipping_threshold)
      }
    }
    fetchThreshold()
  }, [])

  return threshold
}

/** Renders shipping cost FAQ answer dynamically */
export function ShippingCostFaqText() {
  const threshold = useDefaultShippingThreshold()

  if (threshold === 0) {
    return (
      <p className="mt-2 text-muted-foreground">
        Tüm alışverişlerde kargo ücretsizdir.
      </p>
    )
  }

  return (
    <p className="mt-2 text-muted-foreground">
      {threshold} TL ve üzeri alışverişlerde kargo ücretsizdir.
      {' '}{threshold} TL altındaki siparişlerde kargo ücreti 29,90 TL&apos;dir.
    </p>
  )
}

/** Renders shipping cost list items dynamically */
export function ShippingCostList() {
  const threshold = useDefaultShippingThreshold()

  if (threshold === 0) {
    return (
      <ul className="list-disc list-inside text-muted-foreground space-y-1">
        <li>Tüm alışverişlerde kargo <strong>ÜCRETSİZ</strong></li>
        <li>Aynı gün kargo (seçili bölgeler): 49,90 TL</li>
      </ul>
    )
  }

  return (
    <ul className="list-disc list-inside text-muted-foreground space-y-1">
      <li>{threshold} TL ve üzeri alışverişlerde kargo <strong>ÜCRETSİZ</strong></li>
      <li>{threshold} TL altı alışverişlerde kargo ücreti: 29,90 TL</li>
      <li>Aynı gün kargo (seçili bölgeler): 49,90 TL</li>
    </ul>
  )
}

/** Renders shipping feature text for about page */
export function ShippingFeatureText() {
  const threshold = useDefaultShippingThreshold()

  return (
    <p className="text-sm text-foreground">
      {threshold === 0
        ? 'Tüm alışverişlerde ücretsiz kargo ve hızlı teslimat garantisi'
        : `${threshold} TL üzeri alışverişlerde ücretsiz kargo ve hızlı teslimat garantisi`}
    </p>
  )
}
