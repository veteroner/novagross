import { Card, CardContent, Skeleton } from '@novagross/ui'

export default function Loading() {
  return (
    <div className="container py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters Skeleton */}
        <aside className="w-full lg:w-64 space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-24" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-40" />
          </div>

          {/* Products Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(12)].map((_, i) => (
              <Card key={i} className="overflow-hidden animate-pulse">
                <div className="aspect-square bg-muted" />
                <CardContent className="p-4">
                  <Skeleton className="h-3 bg-muted rounded w-16 mb-2" />
                  <Skeleton className="h-4 bg-muted rounded w-full mb-2" />
                  <Skeleton className="h-4 bg-muted rounded w-3/4 mb-4" />
                  <Skeleton className="h-6 bg-muted rounded w-24 mb-2" />
                  <Skeleton className="h-3 bg-muted rounded w-20 mb-4" />
                  <Skeleton className="h-9 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Skeleton */}
          <div className="flex items-center justify-center gap-2 mt-8">
            <Skeleton className="h-9 w-20" />
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-9" />
            ))}
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </div>
    </div>
  )
}
