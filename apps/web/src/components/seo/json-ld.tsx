import Script from 'next/script'

interface JsonLdProps {
  data: any
}

/**
 * Component to render JSON-LD structured data
 * Usage: <JsonLd data={generateOrganizationSchema()} />
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <Script
      id={`jsonld-${data['@type']?.toLowerCase() || 'schema'}`}
      type="application/ld+json"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data, null, 2)
      }}
    />
  )
}
