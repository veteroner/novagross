import { Skeleton } from '@novagross/ui'

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Skeleton className="h-10 w-64 mb-6" />

        <div className="space-y-6">
          <div className="p-6 border rounded-lg space-y-4">
            <Skeleton className="h-7 w-48 mb-4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-5/6" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-6 border rounded-lg space-y-3">
                <Skeleton className="h-7 w-40 mb-4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </div>

          <div className="p-6 border rounded-lg space-y-4">
            <Skeleton className="h-7 w-56 mb-4" />
            <div className="grid md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
