'use client'

import { Card, CardContent } from '@novagross/ui'

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery Skeleton */}
        <div className="space-y-4">
          <div className="aspect-square bg-muted rounded-lg" />
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-20 h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </div>

        {/* Product Info Skeleton */}
        <div className="space-y-6">
          <div className="h-3 bg-muted rounded w-24" />
          <div className="h-8 bg-muted rounded w-full" />
          <div className="h-6 bg-muted rounded w-32" />
          <div className="h-12 bg-muted rounded w-full" />
          <div className="h-10 bg-muted rounded w-48" />
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </div>
      </div>

      {/* Related Products Skeleton */}
      <div className="mt-12">
        <div className="h-6 bg-muted rounded w-48 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-square bg-muted" />
              <CardContent className="p-4">
                <div className="h-3 bg-muted rounded w-16 mb-2" />
                <div className="h-4 bg-muted rounded w-full mb-2" />
                <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                <div className="h-6 bg-muted rounded w-24 mb-4" />
                <div className="h-9 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
