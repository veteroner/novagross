export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = async (
  err: Error,
  request: {
    method: string
    path: string
    headers: Record<string, string>
  },
  context: {
    routerKind: 'Pages Router' | 'App Router'
  }
) => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs')
    Sentry.captureException(err, {
      contexts: {
        request: {
          method: request.method,
          url: request.path,
          headers: request.headers,
        },
        router: {
          kind: context.routerKind,
        },
      },
    })
  }
}
