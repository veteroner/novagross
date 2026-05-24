import { Skeleton } from '@novagross/ui'

export default function Loading() {
  return (
    <div className="container max-w-4xl py-12">
      <Skeleton className="h-10 w-80 mb-8" />
      <div className="space-y-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  )
}
