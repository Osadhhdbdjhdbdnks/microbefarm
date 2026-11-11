import fs from 'node:fs';
import path from 'node:path';

const OUT = 'public/assets/agrumea';

const circleTextEn = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1168 1171" role="img" aria-label="We grow, process and preserve">
  <g fill="#e94e1b" font-family="ivymode, 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif" font-size="126" font-weight="500" text-anchor="middle">
    <rect x="572" y="49" width="24" height="24" transform="rotate(45 584 61)"/>
    <text x="584" y="105.5" transform="rotate(11.613 584 585.5)">W</text>
    <text x="584" y="105.5" transform="rotate(23.226 584 585.5)">E</text>
    <text x="584" y="105.5" transform="rotate(46.452 584 585.5)">G</text>
    <text x="584" y="105.5" transform="rotate(58.065 584 585.5)">R</text>
    <text x="584" y="105.5" transform="rotate(69.677 584 585.5)">O</text>
    <text x="584" y="105.5" transform="rotate(81.290 584 585.5)">W</text>
    <text x="584" y="105.5" transform="rotate(92.903 584 585.5)">,</text>
    <text x="584" y="105.5" transform="rotate(116.129 584 585.5)">P</text>
    <text x="584" y="105.5" transform="rotate(127.742 584 585.5)">R</text>
    <text x="584" y="105.5" transform="rotate(139.355 584 585.5)">O</text>
    <text x="584" y="105.5" transform="rotate(150.968 584 585.5)">C</text>
    <text x="584" y="105.5" transform="rotate(162.581 584 585.5)">E</text>
    <text x="584" y="105.5" transform="rotate(174.194 584 585.5)">S</text>
    <text x="584" y="105.5" transform="rotate(185.806 584 585.5)">S</text>
    <text x="584" y="105.5" transform="rotate(209.032 584 585.5)">A</text>
    <text x="584" y="105.5" transform="rotate(220.645 584 585.5)">N</text>
    <text x="584" y="105.5" transform="rotate(232.258 584 585.5)">D</text>
    <text x="584" y="105.5" transform="rotate(255.484 584 585.5)">P</text>
    <text x="584" y="105.5" transform="rotate(267.097 584 585.5)">R</text>
    <text x="584" y="105.5" transform="rotate(278.710 584 585.5)">E</text>
    <text x="584" y="105.5" transform="rotate(290.323 584 585.5)">S</text>
    <text x="584" y="105.5" transform="rotate(301.935 584 585.5)">E</text>
    <text x="584" y="105.5" transform="rotate(313.548 584 585.5)">R</text>
    <text x="584" y="105.5" transform="rotate(325.161 584 585.5)">V</text>
    <text x="584" y="105.5" transform="rotate(336.774 584 585.5)">E</text>
    <text x="584" y="105.5" transform="rotate(348.387 584 585.5)">.</text>
  </g>
</svg>
`;

const backSliderHome = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1407 601">
  <path fill="#762530" d="M0 601 L0 470 Q0 431 22 397 L232 176 Q258 148 296 136 L640 22 Q700 2 760 20 L1096 128 Q1136 141 1163 172 L1382 400 Q1407 428 1407 468 L1407 601 Z"/>
</svg>
`;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'circle-text-en.svg'), circleTextEn, 'utf8');
fs.writeFileSync(path.join(OUT, 'back-slider-home.svg'), backSliderHome, 'utf8');
console.log('✔ 已生成图片文件:');
console.log('  ', path.join(OUT, 'circle-text-en.svg'));
console.log('  ', path.join(OUT, 'back-slider-home.svg'));