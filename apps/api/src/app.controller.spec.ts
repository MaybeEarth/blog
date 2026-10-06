import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AppController } from './app.controller';
import { AppService } from './app.service';

test('AppController getHealth returns status ok', () => {
  const service = new AppService();
  const controller = new AppController(service);

  const result = controller.getHealth();
  assert.equal(result.status, 'ok');
  assert.ok(result.locales.includes('tr'));
  assert.ok(result.locales.includes('en'));
});
