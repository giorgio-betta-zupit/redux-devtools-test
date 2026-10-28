import React from 'react';
import type { Interpolation, Theme } from '@emotion/react';

const matchCss: Interpolation<Theme> = (theme) => ({
  borderRadius: '2px',
  color: 'inherit',

  backgroundColor: theme.SEARCH_MATCH_COLOR,
});

export default function highlightMatches(
  text: string,
  query: string | undefined,
): React.ReactNode {
  const needle = query?.trim().toLowerCase();
  const haystack = text.toLowerCase();
  // Bail out when lowercasing changes the length, indexes wouldn't line up
  if (!needle || haystack.length !== text.length) return text;

  const parts: React.ReactNode[] = [];
  let from = 0;
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    parts.push(
      text.slice(from, idx),
      <mark key={idx} css={matchCss}>
        {text.slice(idx, idx + needle.length)}
      </mark>,
    );
    from = idx + needle.length;
    idx = haystack.indexOf(needle, from);
  }

  if (!parts.length) return text;
  parts.push(text.slice(from));
  return parts;
}
