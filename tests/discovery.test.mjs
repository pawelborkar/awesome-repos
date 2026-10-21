import test from 'node:test';
import assert from 'node:assert/strict';
import {discoveryGuide} from '../scripts/discovery.mjs';

test('preview reading guide does not expose discovery URLs', () => {
  const guide = discoveryGuide([]);
  assert.match(guide, /preview is not published for indexing/);
  assert.doesNotMatch(guide, /https?:\/\//);
});

test('reading guide groups eligible canonical pages and escapes catalog text', () => {
  const pages = [
    {canonical:'https://awesome.pawel.in/repositories/o/r/', title:'A [useful] repository', description:'A description\nwith a newline.'},
    {canonical:'https://awesome.pawel.in/discover/example/', title:'A collection', description:'Practical guidance.'},
    {canonical:'https://awesome.pawel.in/categories/python/', title:'Python', description:'Python resources.'},
    {canonical:'https://awesome.pawel.in/about/', title:'Curation', description:'Selection policy.'},
  ];
  const guide = discoveryGuide(pages);
  assert.match(guide, /## Reviewed repository notes\n\n- \[A \\\[useful\\\] repository\]/);
  assert.match(guide, /A description with a newline\./);
  assert.match(guide, /## Start here[\s\S]*## Guided collections[\s\S]*## Topic guides[\s\S]*## Reviewed repository notes/);
  const links = [...guide.matchAll(/\]\((https:\/\/[^\s)]+)\)/g)].map(match=>match[1]);
  assert.deepEqual(links.sort(), pages.map(page=>page.canonical).sort());
});
