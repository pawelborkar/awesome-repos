import { origin, type Resource } from './catalog';

interface Entry { name: string; path: string; description?: string }

// Describe the complete list rendered in HTML, including its initial order.
export function collectionPage(name: string, entries: Entry[]) {
  return {
    '@type': 'CollectionPage',
    mainEntity: {
      '@type': 'ItemList',
      name,
      numberOfItems: entries.length,
      itemListElement: entries.map((entry, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: entry.name,
        url: new URL(entry.path, origin).href,
        ...(entry.description ? { description: entry.description } : {}),
      })),
    },
  };
}

export function resourcePage(resource: Resource) {
  const annotation = resource.annotation?.reviewed ? resource.annotation : null;
  return {
    '@type': 'WebPage',
    mainEntity: {
      '@type': 'CreativeWork',
      '@id': resource.url,
      name: resource.name,
      description: resource.description,
      url: resource.url,
      identifier: `${resource.owner}/${resource.repository}`,
      license: resource.licenses.flatMap(license => license.url ? [license.url] : []),
    },
    ...(annotation ? { citation: annotation.sources, lastReviewed: annotation.updated } : {}),
  };
}
