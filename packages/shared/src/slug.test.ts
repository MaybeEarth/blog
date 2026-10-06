import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from './slug.js';

test('Türkçe karakterleri dönüştürür', () => {
  assert.equal(slugify('Çağrı Merkezi: Işık & Öğrenci'), 'cagri-merkezi-isik-ogrenci');
});

test('Almanca ß ve ä', () => {
  assert.equal(slugify('Große Straße Äpfel'), 'grosse-strasse-apfel');
});

test('baştaki/sondaki tire olmaz ve uzunluk kısıtlanır', () => {
  assert.equal(slugify('  --Merhaba--  '), 'merhaba');
  assert.ok(slugify('a'.repeat(200)).length <= 80);
});
