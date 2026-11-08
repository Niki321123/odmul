// Mózgol: the brain buddy, drawn as inline SVG. Static markup only (no user input).

const BODY = {
  rotten: { fill: '#b9c79a', stroke: '#7f8f5e' },
  tired: { fill: '#f2b8cf', stroke: '#c9819d' },
  ok: { fill: '#ffb3d1', stroke: '#e07ba4' },
  happy: { fill: '#ffa6cb', stroke: '#e0699c' },
  buff: { fill: '#ff94c2', stroke: '#d9548e' },
};

const EYES = {
  rotten: '<path d="M70 92 l12 8 M82 92 l-12 8 M118 92 l12 8 M130 92 l-12 8" stroke="#3b3b3b" stroke-width="4" stroke-linecap="round"/>',
  tired: '<path d="M68 98 q8 -6 16 0 M116 98 q8 -6 16 0" stroke="#2b2b2b" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M66 90 h20 M114 90 h20" stroke="#2b2b2b" stroke-width="3" stroke-linecap="round" opacity=".5"/>',
  ok: '<circle cx="76" cy="96" r="7" fill="#2b2b2b"/><circle cx="124" cy="96" r="7" fill="#2b2b2b"/><circle cx="78" cy="93" r="2.4" fill="#fff"/><circle cx="126" cy="93" r="2.4" fill="#fff"/>',
  happy: '<path d="M66 98 q10 -12 20 0 M114 98 q10 -12 20 0" stroke="#2b2b2b" stroke-width="5" fill="none" stroke-linecap="round"/>',
  buff: '<path d="M66 90 l18 6 M134 90 l-18 6" stroke="#2b2b2b" stroke-width="4" stroke-linecap="round"/><circle cx="76" cy="100" r="6" fill="#2b2b2b"/><circle cx="124" cy="100" r="6" fill="#2b2b2b"/>',
};

const MOUTH = {
  rotten: '<path d="M84 124 q16 -10 32 0" stroke="#3b3b3b" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M110 124 q3 10 0 14" stroke="#9fd3a0" stroke-width="4" fill="none" stroke-linecap="round"/>',
  tired: '<ellipse cx="100" cy="124" rx="8" ry="6" fill="#7a2a45"/>',
  ok: '<path d="M86 118 q14 10 28 0" stroke="#2b2b2b" stroke-width="4" fill="none" stroke-linecap="round"/>',
  happy: '<path d="M82 114 q18 22 36 0 z" fill="#7a2a45"/><path d="M90 122 q10 6 20 0" fill="#ff8fb1"/>',
  buff: '<path d="M80 114 h40 q-4 16 -20 16 q-16 0 -20 -16z" fill="#fff" stroke="#2b2b2b" stroke-width="3"/>',
};

const EXTRA = {
  rotten: '<g fill="#3b3b3b"><circle cx="40" cy="40" r="3"/><circle cx="160" cy="30" r="3"/><circle cx="170" cy="60" r="2.5"/></g><path d="M36 36 l-6 -4 M44 36 l6 -4 M156 26 l-6 -4 M164 26 l6 -4" stroke="#3b3b3b" stroke-width="1.5"/>',
  tired: '<text x="150" y="44" font-size="22" font-family="sans-serif" fill="#8a6b7a">z</text><text x="166" y="28" font-size="16" font-family="sans-serif" fill="#8a6b7a">z</text>',
  ok: '',
  happy: '<ellipse cx="62" cy="112" rx="10" ry="6" fill="#ff7ea8" opacity=".55"/><ellipse cx="138" cy="112" rx="10" ry="6" fill="#ff7ea8" opacity=".55"/>',
  buff: '<g><rect x="6" y="138" width="40" height="8" rx="3" fill="#555"/><rect x="2" y="128" width="10" height="28" rx="3" fill="#333"/><rect x="40" y="128" width="10" height="28" rx="3" fill="#333"/><rect x="154" y="138" width="40" height="8" rx="3" fill="#555"/><rect x="150" y="128" width="10" height="28" rx="3" fill="#333"/><rect x="188" y="128" width="10" height="28" rx="3" fill="#333"/></g><path d="M40 150 q-6 -30 20 -40 M160 150 q6 -30 -20 -40" stroke="#d9548e" stroke-width="10" fill="none" stroke-linecap="round"/>',
};

export function brainSvg(mood = 'ok', size = 160) {
  const b = BODY[mood] || BODY.ok;
  return `<svg viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="Mózgol">
  <g class="brain-bob">
    <path d="M100 30c-14-12-40-10-48 6-18-2-32 14-28 30-14 8-16 30-4 40-6 16 4 34 22 36 6 16 26 22 40 14 8 8 28 8 36 0 14 8 34 2 40-14 18-2 28-20 22-36 12-10 10-32-4-40 4-16-10-32-28-30-8-16-34-18-48-6z" fill="${b.fill}" stroke="${b.stroke}" stroke-width="4"/>
    <path d="M100 34v26 M70 50q10 10 0 22 M130 50q-10 10 0 22 M44 80q14 0 18 12 M156 80q-14 0 -18 12 M60 140q8-10 20-6 M140 140q-8-10 -20-6" stroke="${b.stroke}" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".7"/>
    ${EYES[mood] || EYES.ok}
    ${MOUTH[mood] || MOUTH.ok}
  </g>
  ${EXTRA[mood] || ''}
</svg>`;
}
