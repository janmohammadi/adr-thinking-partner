#!/usr/bin/env node
// Generate .github/prompts/<name>.prompt.md files from skills/<name>/SKILL.md.
//
// GitHub Copilot Chat discovers slash-invokable prompts from
// .github/prompts/*.prompt.md, not from .agents/skills/ — so we keep a
// parallel copy tailored to Copilot's frontmatter format.
//
// Run after editing any skills/*/SKILL.md:
//   node scripts/build-copilot-prompts.mjs
//
// No dependencies — plain Node, no npm install needed.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const skillsDir = path.join(repoRoot, 'skills');
const promptsDir = path.join(repoRoot, '.github', 'prompts');

fs.mkdirSync(promptsDir, { recursive: true });

const skillDirs = fs
  .readdirSync(skillsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

let built = 0;
for (const name of skillDirs) {
  const skillPath = path.join(skillsDir, name, 'SKILL.md');
  if (!fs.existsSync(skillPath)) {
    console.warn(`skip ${name}: no SKILL.md`);
    continue;
  }

  const src = fs.readFileSync(skillPath, 'utf8');
  const match = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    console.warn(`skip ${name}: missing YAML frontmatter`);
    continue;
  }

  const [, yaml, body] = match;
  const descMatch = yaml.match(/^description:\s*(.+)$/m);
  const description = (descMatch ? descMatch[1] : '').trim();

  // Copilot frontmatter — see
  // https://code.visualstudio.com/docs/copilot/customization/prompt-files
  // - name: the /<name> slash command in Copilot Chat
  // - description: shown in the slash-command picker
  // - agent: 'agent' keeps tool use enabled (matches Claude Code UX)
  const escapedDesc = description.replace(/'/g, "''");
  const frontmatter = [
    '---',
    `description: '${escapedDesc}'`,
    `name: '${name}'`,
    `agent: 'agent'`,
    '---',
    '',
  ].join('\n');

  const outPath = path.join(promptsDir, `${name}.prompt.md`);
  fs.writeFileSync(outPath, frontmatter + body);
  console.log(`built ${name} -> .github/prompts/${name}.prompt.md`);
  built += 1;
}

console.log(`\nBuilt ${built} Copilot prompt file(s) from ${skillDirs.length} skill(s).`);
