import test from 'node:test';
import assert from 'node:assert/strict';
import {assertHtmlSnapshot,sitemapUrls,crawlerAllowed} from '../scripts/seo-http.mjs';
const canonical='https://awesome.pawel.in/example/';
const html=robots=>`<title>Example</title><meta name="robots" content="${robots}"><link rel="canonical" href="${canonical}"><h1>Example</h1>`;

test('indexing verification distinguishes noindex from index and honors HTTP headers',()=>{
 assert.throws(()=>assertHtmlSnapshot({status:200,html:html('noindex,follow'),canonical,indexable:true}),/Indexing blocked/);
 assert.throws(()=>assertHtmlSnapshot({status:200,html:html('index,follow'),robotsHeader:'noindex, nofollow',canonical,indexable:true}),/Indexing blocked/);
 assert.throws(()=>assertHtmlSnapshot({status:301,html:html('index,follow'),canonical,indexable:true}),/Expected 200/);
 assertHtmlSnapshot({status:200,html:html('index,follow'),canonical,indexable:true});
 assertHtmlSnapshot({status:200,html:html('noindex,follow'),canonical,indexable:false});
 assert.throws(()=>assertHtmlSnapshot({status:200,html:html('index,follow'),canonical,indexable:false}),/Expected noindex/);
});
test('sitemap rejects duplicates and noncanonical hosts or URL states',()=>{
 const xml=urls=>`<urlset>${urls.map(url=>`<url><loc>${url}</loc></url>`).join('')}</urlset>`;
 assert.deepEqual(sitemapUrls(xml([canonical]),'https://awesome.pawel.in'),[canonical]);
 assert.throws(()=>sitemapUrls(xml([canonical,canonical]),'https://awesome.pawel.in'),/duplicate/);
 for(const url of ['https://example.org/','https://awesome.pawel.in/example/?q=test','https://awesome.pawel.in/example/#test'])assert.throws(()=>sitemapUrls(xml([url]),'https://awesome.pawel.in'),/Invalid sitemap/);
});
test('search crawler access stays independent of training preferences',()=>{
 const policy='User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: OAI-SearchBot\nDisallow: /private/\nAllow: /private/public/\n';
 assert.equal(crawlerAllowed(policy,'GPTBot','/'),false);
 assert.equal(crawlerAllowed(policy,'Googlebot','/'),true);
 assert.equal(crawlerAllowed(policy,'OAI-SearchBot','/discover/'),true);
 assert.equal(crawlerAllowed(policy,'OAI-SearchBot','/private/'),false);
 assert.equal(crawlerAllowed(policy,'OAI-SearchBot','/private/public/'),true);
 assert.equal(crawlerAllowed('User-agent: *\nDisallow: /*?q=\n','Bingbot','/search/?q=rust'),false);
 assert.equal(crawlerAllowed('User-agent: Googlebot\nDisallow:\nUser-agent: GPTBot\nDisallow: /\n','Googlebot','/'),true);
});
