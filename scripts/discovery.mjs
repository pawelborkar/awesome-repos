const inline = value => value.replace(/\s+/g, ' ').trim().replace(/[\\\[\]*_`]/g, '\\$&');

// This optional reading guide uses the same eligibility decision as the sitemap.
// It is a convenience for tools, not a ranking signal or a crawler permission.
export function discoveryGuide(pages) {
  const introduction = '# Awesome Repositories\n\n> A community-maintained catalog of GitHub repositories for learning programming and building software.\n';
  if (!pages.length) return `${introduction}\nThis preview is not published for indexing.\n`;

  const sections = [
    ['Start here', page => !/^\/(categories|discover|repositories)\//.test(new URL(page.canonical).pathname)],
    ['Guided collections', page => new URL(page.canonical).pathname.startsWith('/discover/')],
    ['Topic guides', page => new URL(page.canonical).pathname.startsWith('/categories/')],
    ['Reviewed repository notes', page => new URL(page.canonical).pathname.startsWith('/repositories/')],
  ];
  return `${introduction}\nThe links below point to canonical, indexable pages. Resource notes describe audience, practical use, limitations, sources, and editorial review dates. Popularity snapshots have their own dates. Follow each original repository for current documentation, requirements, and licensing; public course access does not mean associated services are free.\n${sections.map(([heading, matches]) => {
    const selected = pages.filter(matches).sort((a, b) => a.canonical.localeCompare(b.canonical));
    return selected.length ? `\n## ${heading}\n\n${selected.map(page => `- [${inline(page.title)}](${page.canonical}): ${inline(page.description)}`).join('\n')}\n` : '';
  }).join('')}`;
}
