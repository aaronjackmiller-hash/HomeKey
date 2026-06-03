const assert = require('assert');

const { ensurePrNumberLink } = require('./ensure-pr-number-link');

const NUMBER = 42;
const URL = 'https://github.com/owner/repo/pull/42';
const HEADER = `**PR:** [#${NUMBER}](${URL})`;

assert.strictEqual(
  ensurePrNumberLink('', NUMBER, URL),
  HEADER,
  'adds the PR number link when the body is empty',
);

assert.strictEqual(
  ensurePrNumberLink('## Summary\n- Adds a thing\n', NUMBER, URL),
  `${HEADER}\n\n## Summary\n- Adds a thing\n`,
  'places the PR number link before the template content',
);

assert.strictEqual(
  ensurePrNumberLink(`${HEADER}\n\n## Summary\n- Adds a thing\n`, NUMBER, URL),
  `${HEADER}\n\n## Summary\n- Adds a thing\n`,
  'does not duplicate an existing top PR number link',
);

assert.strictEqual(
  ensurePrNumberLink(
    `## Summary\n- Adds a thing\n\n${HEADER}\n\n## Evidence\n- Checked locally\n`,
    NUMBER,
    URL,
  ),
  `${HEADER}\n\n## Summary\n- Adds a thing\n\n## Evidence\n- Checked locally\n`,
  'moves an existing PR number link back to the top',
);

assert.throws(
  () => ensurePrNumberLink('## Summary\n', null, URL),
  /pull request number/,
  'requires a PR number',
);

assert.throws(
  () => ensurePrNumberLink('## Summary\n', NUMBER, ''),
  /pull request URL/,
  'requires a PR URL',
);
