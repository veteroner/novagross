import { Skeleton } from '@novagross/ui'

export default function Loading() {
  return (
    <div className="container max-w-4xl py-12">
      <Skeleton className="h-10 w-96 mb-8" />
      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, sectionIdx) => (
          <div key={sectionIdx} className="space-y-4">
            <Skeleton className="h-7 w-64 mb-4" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border-b pb-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
