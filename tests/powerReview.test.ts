import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const script = path.resolve(__dirname, '../powers/photo-capsule-review/skills/review/scripts/review.cjs');
const binaries = ['typescript/bin/tsc', 'jest/bin/jest.js'];

describe('review Power dependency preflight', () => {
  test.each(binaries)('runs no checks when %s is missing', missing => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'capsule-power-'));
    try {
      for (const binary of binaries.filter(x => x !== missing)) {
        const file = path.join(root, 'node_modules', binary);
        fs.mkdirSync(path.dirname(file), {recursive: true});
        fs.writeFileSync(file, "require('node:fs').writeFileSync('executed', 'yes');");
      }
      const result = spawnSync(process.execPath, [script, root], {encoding: 'utf8', timeout: 10_000});
      expect(result.status).toBe(1);
      expect(fs.existsSync(path.join(root, 'executed'))).toBe(false);
      const report = JSON.parse(fs.readFileSync(path.join(root, 'data/evidence/power-review.json'), 'utf8'));
      expect(report.passed).toBe(false);
      expect(report.checks).toHaveLength(2);
      expect(report.checks.every((c: {exitCode: number | null}) => c.exitCode === null)).toBe(true);
      expect(report.checks.some((c: {error: string}) => c.error === 'Required local dependency missing')).toBe(true);
    } finally { fs.rmSync(root, {recursive: true, force: true}); }
  });

  test('executes both checks and reports success when dependencies are present', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'capsule-power-'));
    try {
      for (const [i, binary] of binaries.entries()) {
        const file = path.join(root, 'node_modules', binary);
        fs.mkdirSync(path.dirname(file), {recursive: true});
        fs.writeFileSync(file, `require('node:fs').appendFileSync('executed', '${i}');`);
      }
      const result = spawnSync(process.execPath, [script, root], {encoding: 'utf8', timeout: 10_000});
      expect(result.status).toBe(0);
      expect(fs.readFileSync(path.join(root, 'executed'), 'utf8')).toBe('01');
      const report = JSON.parse(fs.readFileSync(path.join(root, 'data/evidence/power-review.json'), 'utf8'));
      expect(report.passed).toBe(true);
      expect(report.checks.map((c: {exitCode: number}) => c.exitCode)).toEqual([0, 0]);
    } finally { fs.rmSync(root, {recursive: true, force: true}); }
  });
});
