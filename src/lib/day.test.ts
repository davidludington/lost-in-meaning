import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, today } from './day.ts';

test('rolls over at midnight New York time, not UTC', () => {
  assert.equal(today(new Date('2026-11-10T04:59:00Z')), '2026-11-09'); // 23:59 EST
  assert.equal(today(new Date('2026-11-10T05:00:00Z')), '2026-11-10'); // 00:00 EST
});

test('handles DST transitions', () => {
  // DST ends 2026-11-01: midnight is UTC-4 before, UTC-5 after
  assert.equal(today(new Date('2026-11-01T03:59:00Z')), '2026-10-31');
  assert.equal(today(new Date('2026-11-01T04:00:00Z')), '2026-11-01');
  // DST starts 2026-03-08 at 02:00, midnight is still UTC-5
  assert.equal(today(new Date('2026-03-08T05:00:00Z')), '2026-03-08');
  assert.equal(today(new Date('2026-03-09T03:59:00Z')), '2026-03-08');
});

test('addDays crosses months, years and DST', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2026-11-01', 1), '2026-11-02');
});
