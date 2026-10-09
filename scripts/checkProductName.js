import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// The product name is a setting on the server (decision 0001). This check fails when the name is
// typed into the client code: it must come from useBranding().
// Run by CI and by: npm run check:names

// The only places where the name may appear.
const ALLOWED = ['scripts/checkProductName.js', 'package-lock.json'];
const NAME = /EngenX\s?Suite/i;
const TEXT_FILE = /\.(js|jsx|mjs|json|html|css|md|yml|yaml)$/;

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter((file) => file && TEXT_FILE.test(file) && !ALLOWED.includes(file));

const problems = [];
for (const file of files) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, index) => {
      if (NAME.test(line)) problems.push(`${file}:${index + 1}`);
    });
}

if (problems.length > 0) {
  process.stderr.write(
    `The product name is written into the code in:\n  ${problems.join('\n  ')}\n` +
      'Use the branding setting instead: useBranding().\n',
  );
  process.exit(1);
}
process.stdout.write(`Product name check passed (${files.length} files).\n`);
