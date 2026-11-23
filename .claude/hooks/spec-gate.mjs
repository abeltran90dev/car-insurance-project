#!/usr/bin/env node
// Spec gate (PreToolUse hook for Write|Edit|NotebookEdit).
//
// Blocks writes under frontend/ or cms/ unless:
//   (a) the current branch is feat/US-XX-* and docs/specs/SPEC-US-XX.md has
//       front matter `status: Approved`, or
//   (b) the current branch is chore/scaffold-* (infrastructure only: writes to
//       feature code under frontend/src/app/features/ are still blocked).
// Anything else (main, detached HEAD, other branches, git errors) is blocked.
// Writes outside frontend/ and cms/ are always allowed.
//
// Contract: read the hook JSON from stdin; exit 0 = allow, exit 2 = block
// (stderr is shown to Claude as the reason). Fails closed on unexpected errors
// for gated paths.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const GATED_ROOTS = ['frontend', 'cms'];
const FEATURE_CODE = 'frontend/src/app/features/';

function block(reason) {
  process.stderr.write(`SPEC GATE: ${reason}\nSee CLAUDE.md > "Status gates".\n`);
  process.exit(2);
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

let input;
try {
  input = JSON.parse(readStdin() || '{}');
} catch {
  block('could not parse hook input; refusing by default.');
}

const projectDir = path.resolve(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
const rawPath = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path;
if (!rawPath) process.exit(0); // nothing path-based to gate

const absTarget = path.resolve(projectDir, rawPath);
let rel = path.relative(projectDir, absTarget).split(path.sep).join('/');
if (process.platform === 'win32') rel = rel.toLowerCase();

// Outside the project, or not under a gated root -> allow.
if (rel.startsWith('../') || path.isAbsolute(rel)) process.exit(0);
const isGated = GATED_ROOTS.some((root) => rel === root || rel.startsWith(`${root}/`));
if (!isGated) process.exit(0);

let branch;
try {
  branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: projectDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
} catch {
  block(`cannot determine git branch; writes to ${rel} are blocked.`);
}

if (branch === 'HEAD') block(`detached HEAD; writes to ${rel} are blocked.`);
if (branch === 'main' || branch === 'master') {
  block(`writes to ${rel} are not allowed on ${branch}. Use feat/US-XX-<slug> (approved spec) or chore/scaffold-<slug>.`);
}

// (b) Scaffolding branch: infrastructure only.
if (branch.startsWith('chore/scaffold-')) {
  if (rel.startsWith(FEATURE_CODE)) {
    block(`${rel} is feature code; it is not allowed on scaffolding branch ${branch}. Use feat/US-XX-<slug>.`);
  }
  process.exit(0);
}

// (a) Story branch with an approved spec.
const match = /^feat\/(US-\d{2})-.+/.exec(branch);
if (!match) {
  block(`branch "${branch}" is not feat/US-XX-<slug> or chore/scaffold-<slug>; writes to ${rel} are blocked.`);
}

const storyId = match[1];
const specPath = path.join(projectDir, 'docs', 'specs', `SPEC-${storyId}.md`);
if (!existsSync(specPath)) block(`docs/specs/SPEC-${storyId}.md does not exist.`);

const spec = readFileSync(specPath, 'utf8').replace(/^﻿/, '');
const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(spec);
if (!frontMatter) block(`SPEC-${storyId} has no front matter.`);

const status = /^status:\s*["']?([A-Za-z]+)/m.exec(frontMatter[1])?.[1];
if (status !== 'Approved') {
  block(`SPEC-${storyId} has status "${status ?? 'missing'}", not "Approved". Get HC1 approval first.`);
}

process.exit(0);
