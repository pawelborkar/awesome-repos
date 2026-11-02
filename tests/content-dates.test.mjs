import test from 'node:test';
import assert from 'node:assert/strict';
import {contentModificationDate} from '../scripts/content-dates.mjs';

test('first-time reviewed pages use their actual editorial date instead of a README fallback',()=>{
 const input={fingerprint:'new',today:'2026-11-02',baseline:'2026-10-20'};
 assert.equal(contentModificationDate({...input,reviewed:'2026-11-02'}),'2026-11-02');
 assert.equal(contentModificationDate({...input}),'2026-10-20');
 assert.equal(contentModificationDate({...input,reviewed:'2027-01-01'}),'2026-10-20');
});
test('unchanged content keeps its date while changed cached content advances',()=>{
 const previous={hash:'same',date:'2026-10-21'};
 const input={previous,today:'2026-11-02',baseline:'2026-10-20',reviewed:'2026-10-20'};
 assert.equal(contentModificationDate({...input,fingerprint:'same'}),'2026-10-21');
 assert.equal(contentModificationDate({...input,fingerprint:'different'}),'2026-11-02');
});
