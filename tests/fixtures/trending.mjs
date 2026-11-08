export function trendingFixture(now = Date.now()) {
  return {
    version: 1, fetchedAt: new Date(now).toISOString(),
    repositories: [
      { id: 1, key: 'rust-lang/book', description: 'The Rust programming language book.', language: 'Rust', stars: 20000, forks: 1000, gains: { daily: 25, weekly: 180, monthly: 600 } },
      { id: 2, key: 'example/python-project', description: 'A Python project outside the catalog.', language: 'Python', stars: 500, forks: 20, gains: { daily: 50, weekly: 100, monthly: 150 } },
      { id: 3, key: 'example/cpp-project', description: 'A C++ project.', language: 'C++', stars: 1000, forks: 10, gains: { daily: 0, weekly: 15, monthly: 40 } },
      { id: 4, key: 'example/javascript-project', description: 'A JavaScript project.', language: 'JavaScript', stars: 1000, forks: 10, gains: { daily: 25, weekly: 50, monthly: 100 } },
    ],
    coverage: { candidateCount: 5, successCount: 4, excludedCount: 1, searchCount: 16, failures: [{ id: 5, reason: 'history_unavailable' }] },
  };
}
