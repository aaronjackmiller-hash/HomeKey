const PR_NUMBER_LINK_PATTERN = /^\*\*PR:\*\* \[#\d+\]\(https?:\/\/[^\s)]+\)\s*(?:\r?\n|$)/gm;

function ensurePrNumberLink(body, number, url) {
  if (!number) {
    throw new Error('A pull request number is required.');
  }

  if (!url) {
    throw new Error('A pull request URL is required.');
  }

  const header = `**PR:** [#${number}](${url})`;
  const bodyWithoutExistingLinks = (body || '')
    .replace(PR_NUMBER_LINK_PATTERN, '')
    .replace(/^\r?\n+/, '');

  if (!bodyWithoutExistingLinks) {
    return header;
  }

  return `${header}\n\n${bodyWithoutExistingLinks}`;
}

module.exports = {
  ensurePrNumberLink,
};
