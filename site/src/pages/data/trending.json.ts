import { trendingSnapshot } from '../../lib/trending';

export function GET() {
  return new Response(JSON.stringify(trendingSnapshot), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
