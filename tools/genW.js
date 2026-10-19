// 確率の裏技の問題データ生成: node genP.js -> src/data.js
// 手書き10問（src/handmade.js）＋ 計算で作る問題。誤答は「よくあるまちがい」から作り、理由も一緒に付ける。
const fs = require('fs'), path = require('path');

let seed = 20261020;
function R() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const MINUS = '−';
const lab = v => (v < 0 ? MINUS + (-v) : String(v));
const T = v => String(v);
const fr = (n, d) => '\\dfrac{' + n + '}{' + d + '}';
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
function lcmBrute(a, b) { for (let x = Math.max(a, b); ; x++) if (x % a === 0 && x % b === 0) return x; }
const key = v => (v == null ? 'null:' + Math.random() : Array.isArray(v) ? v.map(x => x.toFixed(9)).join(',') : v.toFixed(9));

/* 問題を組み立てる。truth={v,tex}, cands=[{v,tex,why}]（先のものほど優先） */
function build(o) {
  const unit = o.unit || '';
  const wrap = (tex, raw) => (raw ? tex : '$' + tex + '$' + unit);
  const seen = [o.truth.tex], seenV = [key(o.truth.v)], wrongs = [];
  for (const c of o.cands) {
    if (wrongs.length >= 3) break;
    if (seen.includes(c.tex)) continue;
    if (!c.same && seenV.includes(key(c.v))) continue;
    seen.push(c.tex); seenV.push(key(c.v)); wrongs.push(c);
  }
  if (wrongs.length < 3) throw new Error(o.id + ': 誤答の候補が足りない');
  const all = shuffle([{ t: wrap(o.truth.tex, o.truth.raw), v: o.truth.v, ok: true }].concat(wrongs.map(c => (c.same ? { t: wrap(c.tex, c.raw), v: c.v, why: c.why, same: true } : { t: wrap(c.tex, c.raw), v: c.v, why: c.why }))));
  const ans = all.findIndex(x => x.ok);
  all.forEach(x => delete x.ok);
  const q = { id: o.id, expr: o.expr, p: o.p, ch: all, ans, steps: o.steps, point: o.point };
  if (o.fig) q.fig = o.fig;
  if (o.figAfter) q.figAfter = o.figAfter;
  return q;
}

/* ---------- 共通の小物 ---------- */
const LT = a => a.join(',\\ ');                                  // 数のならび（TeX）
const dfmt = x => String(+x.toFixed(8));                         // 小数の表示
const divisors = n => { const r = []; for (let i = 1; i <= n; i++) if (n % i === 0) r.push(i); return r; };
const reduceF = (n, d) => { const g = gcd(n, d); return [n / g, d / g]; };
const frT = (n, d) => (d === 1 ? String(n) : fr(n, d));           // 分母1なら整数で表示
const Fv = (n, d) => { const [a, b] = reduceF(n, d); return { v: n / d, tex: frT(a, b) }; };
const C = (n, d, why, same) => { const o = { v: n / d, tex: (n * d < 0 ? '-' : '') + frT(Math.abs(n), Math.abs(d)), why }; if (same) o.same = true; return o; };
const mixT = (w, n, d) => String(w) + fr(n, d);
function fracOfDec(x) { const s = Math.round(x * 10000); const g = gcd(s, 10000); return [s / g, 10000 / g]; }
const RAWQ = (id, p, truth, wrongs, steps, point, extra) => build(Object.assign({
  id, expr: '1', p, raw: true, truth: { v: 1, tex: truth, raw: true },
  cands: wrongs.map(([t, why]) => ({ v: null, raw: true, tex: t, why })), steps, point
}, extra || {}));
const lcmOf = (a, b) => a / gcd(a, b) * b;

/* ---------- 共通の小物（確率の裏技） ---------- */
const fp = n => (n < 0 ? '(' + n + ')' : String(n));       // かっこつきで表示
const sgnWord = s => (s < 0 ? 'マイナス' : 'プラス');
const cnt = a => a.filter(x => x < 0).length;


/* ---------- 文字式の道具 ---------- */
const D = s => (String(s).includes('$') || /[ぁ-んァ-ヶ一-龥]/.test(String(s)) ? s : '$' + s + '$');
// RQ: 4択（式が選択肢）。texはそのまま渡すと $…$ で包む
const RQ = (id, p, t, ws, steps, point, extra) => RAWQ(id, p, D(t), ws.map(([w, why]) => [D(w), why]), steps, point, extra);
// 1次式 a x + b を TeX に
const xt = (a, v) => (a === 1 ? v : a === -1 ? '-' + v : a + v);
const lin = (a, b, v) => { v = v || 'x'; if (a === 0) return String(b); let s = xt(a, v); if (b > 0) s += '+' + b; else if (b < 0) s += '-' + (-b); return s; };
const sgn = n => (n < 0 ? '-' + (-n) : '+' + n);
const num = n => String(n);
// 数値問題（答えがひとつの数）
const NQ = (id, p, t, ws, steps, point, unit) => build({ id, expr: String(t), p, truth: { v: t, tex: dfmt(t) }, cands: ws.map(([v, why]) => ({ v, tex: dfmt(v), why })), steps, point, unit });
const S_ = s => ' style="' + s + '"';
const svgW = (h, inner) => '<svg viewBox="0 0 260 ' + h + '" role="img" aria-label="図"' + S_('width:100%;max-width:320px;height:auto;display:block;margin:8px auto') + '>' + inner + '</svg>';
const ln = (x1, y1, x2, y2, c, w, dash) => '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' + S_('stroke:var(' + c + ');stroke-width:' + (w || 2) + ';stroke-linecap:round' + (dash ? ';stroke-dasharray:5 4' : '')) + '/>';
const tx = (x, y, t, a) => '<text x="' + x + '" y="' + y + '"' + S_('font:700 13px sans-serif;fill:var(--fg);text-anchor:' + (a || 'middle')) + '>' + t + '</text>';
const circ = (cx, cy, r) => '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="var(--card)"' + S_('stroke:var(--fg);stroke-width:2.5') + '/>';
const TT = s => '$' + s + '$';
const RT = rows => '<table class="rtab">' + rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</table>';
const txc = (x, y, t, c, a) => '<text x="' + x + '" y="' + y + '"' + S_('font:700 14px sans-serif;fill:var(' + (c || '--fg') + ');text-anchor:' + (a || 'middle')) + '>' + t + '</text>';
const isU = t => /[x?]/.test(String(t));
const RA = (a, b) => TT(a + ':' + b);

/* ===== 放物線 y=ax² と直線ABの図 ===== */
const aT = a => a === 1 ? 'x^2' : a === -1 ? '-x^2' : a === 0.5 ? '\\dfrac{1}{2}x^2' : a === -0.5 ? '-\\dfrac{1}{2}x^2' : a === 0.25 ? '\\dfrac{1}{4}x^2' : a + 'x^2';
const yA = a => '$y=' + aT(a) + '$';
const nt = v => (v < 0 ? '-' + (-v) : String(v));
/* 直接計算（2点から）と公式を突き合わせる */
function geo(a, p, q) {
  const y1 = a * p * p, y2 = a * q * q, sl = (y2 - y1) / (q - p), ic = y1 - sl * p, ar = Math.abs(p * y2 - q * y1) / 2;
  if (Math.abs(sl - a * (p + q)) > 1e-9 || Math.abs(ic + a * p * q) > 1e-9 || Math.abs(ar - Math.abs(a * p * q) * (q - p) / 2) > 1e-9) throw new Error('公式ちがい ' + [a, p, q]);
  return { sl, ic, ar };
}
function figPL(o) {
  const a = o.a, p = o.p, q = o.q, m = o.m, c = -a * p * q, sl = a * (p + q);
  const xs = [p, q].concat(m === undefined ? [] : [m]);
  const X = Math.max.apply(null, xs.map(Math.abs)) + 0.8, cx = 130, sx = 112 / X;
  const ys = [0, a * p * p, a * q * q, c].concat(m === undefined ? [] : [a * m * m]);
  let ymax = Math.max.apply(null, ys), ymin = Math.min.apply(null, ys); if (ymax - ymin < 1) ymax = ymin + 1;
  const pad = (ymax - ymin) * 0.14; ymax += pad; ymin -= pad;
  const sy = 165 / (ymax - ymin), cy = 14 + sy * ymax;
  const X_ = x => +(cx + sx * x).toFixed(1), Y_ = y => +(cy - sy * y).toFixed(1);
  let s = ln(8, Y_(0), 252, Y_(0), '--muted', 1.5) + ln(cx, 4, cx, 196, '--muted', 1.5);
  if (o.tri) s += '<polygon points="' + o.tri.map(t => X_(t[0]) + ',' + Y_(t[1])).join(' ') + '" fill="var(--pos)" fill-opacity=".2"' + S_('stroke:none') + '/>';
  const path = f => { let d = '', pen = false; for (let k = -120; k <= 120; k++) { const x = X * k / 120, y = f(x), Y = Y_(y); if (Y < 3 || Y > 197) { pen = false; continue; } d += (pen ? 'L' : 'M') + X_(x) + ' ' + Y; pen = true; } return d; };
  s += '<path d="' + path(x => a * x * x) + '" fill="none"' + S_('stroke:var(--fg);stroke-width:2.4') + '/>';
  s += '<path d="' + path(x => sl * x + c) + '" fill="none"' + S_('stroke:var(--pos);stroke-width:2.6') + '/>';
  const pts = [[p, 'A'], [q, 'B']].concat(m === undefined ? [] : [[m, o.mName || 'P']]);
  pts.forEach(([x, nm]) => {
    const y = a * x * x;
    s += ln(X_(x), Y_(y), X_(x), Y_(0), '--muted', 1, true);
    if (x !== 0) s += txc(X_(x), Y_(0) + (y >= 0 ? 14 : -6), lab(x), '--muted');
    s += '<circle cx="' + X_(x) + '" cy="' + Y_(y) + '" r="4.2" fill="var(--pos)"/>';
    s += txc(X_(x) + (x < 0 ? -9 : 9), Y_(y) + (a > 0 ? -8 : 14), nm, '--fg');
  });
  if (o.showC) { s += '<circle cx="' + cx + '" cy="' + Y_(c) + '" r="4.2" fill="var(--neg)"/>' + txc(cx + 9, Y_(c) + 4, 'C', '--fg', 'start'); }
  s += txc(cx + 7, Y_(0) + 14, 'O', '--fg', 'start') + txc(248, Y_(0) - 5, 'x', '--muted', 'end') + txc(cx + 6, 14, 'y', '--muted', 'start');
  return { type: 'svg', html: svgW(200, s) };
}
const WR = (id, p, t, ws, steps, point, fig) => Object.assign(NQ(id, p, t, ws, steps, point), fig ? { fig } : {});
const pts2 = (p, q) => 'A、B の $x$ 座標は $' + nt(p) + '$、$' + nt(q) + '$';
const qHead = (a, p, q) => '放物線 ' + yA(a) + ' 上に、$x$ 座標が $' + nt(p) + '$、$' + nt(q) + '$ の2点 A、B がある。';

/* ---- ① 傾き ---- */
function sSlope() {
  const L = [[1, -1, 3], [1, -3, 2], [2, -1, 2], [0.5, -2, 4], [-1, -2, 3], [2, -3, 1]];
  const qs = L.map(([a, p, q], i) => { const g = geo(a, p, q), t = g.sl;
    return WR('sl-' + (i + 1), qHead(a, p, q) + '直線 AB の傾きは？', t,
      [[a * (q - p), '引き算ではなく、足し算。傾きは $a\\times(p+q)$。'], [a * p * q, '$a\\times p\\times q$ は、切片の公式（マイナスつき）。'], [p + q, '$p+q$ に、$a$ をかけ忘れている。'], [-t, '符号がぎゃく。$p+q$ をそのまま使う。'], [a * (q - p) * (-1), '傾きは、$x$ 座標の和。差ではない。']],
      ['傾き ＝ $a\\times(p+q)$。', '$' + a + '\\times(' + nt(p) + '+' + (q < 0 ? '(' + q + ')' : q) + ')=' + dfmt(t) + '$。'], '傾き ＝ $a(p+q)$。連立方程式はいらない。', figPL({ a, p, q })); });
  qs.push(WR('sl-7', '放物線 $y=x^2$ 上の2点 A、B を通る直線の傾きが $4$。A の $x$ 座標が $-1$ のとき、B の $x$ 座標は？', 5,
    [[3, '$4-1=3$ は、$p$ の符号をまちがえている。$-1+q=4$ だから $q=5$。'], [4, '4 は傾き。$p+q=4$ から、$q$ を出す。'], [-5, '$q=4-(-1)=5$。符号に注意。'], [-3, '$p+q=4$ の $p$ に $-1$ を入れて、$q=5$。']],
    ['傾き ＝ $a(p+q)$ に代入。', '$1\\times(-1+q)=4$。$q=5$。'], '$a(p+q)=$傾き。$p$ が分かれば $q$ が出る。'));
  return qs;
}
/* ---- ② 切片 ---- */
function sIcpt() {
  const L = [[1, -1, 3], [1, -2, 4], [2, -1, 2], [0.5, -2, 4], [1, -3, 2], [1, 1, 3], [-1, -2, 3]];
  return L.map(([a, p, q], i) => { const g = geo(a, p, q), t = g.ic;
    return WR('ic-' + (i + 1), qHead(a, p, q) + '直線 AB と $y$ 軸の交点 C の $y$ 座標は？', t,
      [[-t, '符号がぎゃく。切片は $-a\\times p\\times q$（マイナスがつく）。'], [a * (p + q), 'これは傾き。切片は $-apq$。'], [p + q, '$p+q$ は傾きの材料。切片は、かけ算 $-apq$。'], [a * q * q, '点 B の $y$ 座標になっている。C は $y$ 軸との交点。'], [a * p * p, '点 A の $y$ 座標になっている。C は $y$ 軸との交点。']],
      ['切片 ＝ $-a\\times p\\times q$。', '$-(' + a + ')\\times(' + nt(p) + ')\\times(' + nt(q) + ')=' + dfmt(t) + '$。'], '切片 ＝ $-apq$。「かけ算にマイナス」。', figPL({ a, p, q, showC: true })); });
}
/* ---- ③ 直線の式 ---- */
function sEq() {
  const L = [[1, -1, 3], [1, -2, 4], [1, -3, 1], [2, -1, 2], [0.5, -2, 6], [1, 1, 4], [-1, -1, 3]];
  return L.map(([a, p, q], i) => { const g = geo(a, p, q), m = g.sl, b = g.ic, e = (m_, b_) => 'y=' + lin(m_, b_);
    return Object.assign(RQ('eq-' + (i + 1), qHead(a, p, q) + '直線 AB の式は？', e(m, b),
      [[e(m, -b), '切片の符号がぎゃく。$-apq$ を計算する。'], [e(a * (q - p), b), '傾きは足し算 $a(p+q)$。差ではない。'], [e(-m, b), '傾きの符号がぎゃく。$p+q$ をそのまま使う。'], [e(m, a * p * q + 0), '切片は $-apq$。マイナスを忘れずに。'], [e(b, m), '傾きと切片が入れかわっている。']],
      ['傾き ＝ $a(p+q)=' + dfmt(m) + '$。', '切片 ＝ $-apq=' + dfmt(b) + '$。', '$' + e(m, b) + '$。'], '$y=a(p+q)x-apq$。一発で式が出る。'), { fig: figPL({ a, p, q, showC: true }) }); });
}

/* ---- ③の次：2点の座標から（ふつうの解き方）と裏技の答え合わせ ---- */
function sBridge() {
  const L = [[1, -1, 3], [1, -2, 1], [2, -1, 2], [0.5, -2, 4], [1, 1, 3], [-1, -1, 2]];
  const P = (x, y) => '(' + nt(x) + ',\\ ' + nt(y) + ')';
  return L.map(([a, p, q], i) => { const g = geo(a, p, q), m = g.sl, b = g.ic, e = (m_, b_) => 'y=' + lin(m_, b_);
    const y1 = a * p * p, y2 = a * q * q;
    return RQ('br-' + (i + 1), '原点が頂点の放物線 $y=ax^2$ 上に、2点 A$' + P(p, y1) + '$、B$' + P(q, y2) + '$ がある。直線 AB の式は？', e(m, b),
      [[e(m, -b), '切片の符号がまちがい。点の座標を代入して確かめる。'], [e((q - p) / (y2 - y1), b), '傾きは、$y$ の増加 ÷ $x$ の増加。ぎゃくになっている。'], [e(-m, b), '傾きの符号がぎゃく。$y$ の差と $x$ の差の、引く順番をそろえる。'], [e(b, m), '傾きと切片が入れかわっている。']],
      ['【裏技】A の座標から $a=y\\div x^2=' + nt(y1) + '\\div' + (p * p) + '=' + dfmt(a) + '$。$x$ 座標は $p=' + nt(p) + '$、$q=' + nt(q) + '$。', '傾き ＝ $a(p+q)=' + dfmt(m) + '$、切片 ＝ $-apq=' + dfmt(b) + '$。', '$' + e(m, b) + '$。', '【答え合わせ】ふつうに、傾き ＝ $(y_2-y_1)\\div(x_2-x_1)=' + dfmt(m) + '$ でも同じ。'], '座標が分かれば、$a=y\\div x^2$、$p$、$q$ が出る。あとは裏技。'); });
}

/* ---- 使える？使えない？ ---- */
function sJudge() {
  const OPT = ['裏技が使える', '使えない（傾き ＝ $y$ の増加 ÷ $x$ の増加 で解く）', '使える（先に $a$ を求めてから）', '使えない（$x$ 座標が足りない）'];
  const J = (id, p, k, w, hint, point) => RAWQ(id, p, OPT[k], OPT.map((o, i) => [o, w[i]]).filter((_, i) => i !== k), hint, point);
  return [
    J('jd-1', '放物線 $y=x^2$ 上の2点 A($-1,\\ 1$)、B($3,\\ 9$)。直線 AB の式を求めたい。', 0, ['', '2点とも $y=x^2$ の上にある（$1=(-1)^2$、$9=3^2$）。使える。', '$a$ は問題に書いてある（$a=1$）。そのまま使える。', '$x$ 座標は $-1$ と $3$ で、そろっている。'], ['$(-1)^2=1$、$3^2=9$。2点とも放物線上。', '裏技が使える。'], '2点とも放物線上 → 使える。'),
    J('jd-2', '2点 A($1,\\ 2$)、B($3,\\ 5$) を通る直線の式を求めたい。（放物線の話はない）', 1, ['放物線の上の点とは限らない。裏技は使えない。', '', '放物線の話がないので、$a$ は求められない。', '$x$ 座標は分かっている。放物線上ではないのが問題。'], ['放物線の話がない。', 'ふつうに、傾き ＝ $(5-2)\\div(3-1)$。'], '放物線上の点でなければ、裏技は使えない。'),
    J('jd-3', '放物線 $y=2x^2$ 上の2点 A、B の $x$ 座標が $-1$、$2$。直線 AB の式を求めたい。', 0, ['', '2点とも放物線上と書いてある。使える。', '$a=2$ は問題に書いてある。先に求める必要はない。', '$x$ 座標は2つとも分かっている。それだけでよい。'], ['2点とも $y=2x^2$ の上。', '$x$ 座標だけで、裏技が使える。'], '$x$ 座標だけで解ける。'),
    J('jd-4', '放物線 $y=x^2$ 上の点 A($-2,\\ 4$) と、$y$ 軸上の点 C($0,\\ 5$) を通る直線の式を求めたい。', 1, ['C は放物線上の点ではない（$5\\ne0^2$）。使えない。', '', 'C は放物線上にないので、$a$ を求めても使えない。', '座標は2つとも分かっている。放物線上かどうかが問題。'], ['A は放物線上。C は $y=0^2=0$ のはずが $5$。放物線上ではない。', 'ふつうの解き方で解く。'], '2点とも放物線上か、確かめる。'),
    J('jd-5', '原点が頂点の放物線 $y=ax^2$ 上に、2点 A($-2,\\ 2$)、B($4,\\ 8$)。直線 AB の式を求めたい。（$a$ は不明）', 2, ['使えるが、$a$ が不明。先に $a$ を求める必要がある。', '2点とも放物線上と書いてある。使える。', '', '$x$ 座標は分かっている。$a$ は A の座標から出せる。'], ['A の座標から $a=2\\div(-2)^2=\\dfrac{1}{2}$。', '$p=-2$、$q=4$ で、裏技が使える。'], '$a$ は、$y\\div x^2$ で出せる。'),
    J('jd-6', '放物線 $y=x^2$ 上の点 A($2,\\ 4$) と、もう1つの点 B がある。直線 AB の傾きを求めたい。（B の座標は不明）', 3, ['B の $x$ 座標が分からないと、計算できない。', '放物線上なので、ふつうに解く必要はない。ただ、B の座標が足りない。', '$a$ は分かっている。足りないのは B の $x$ 座標。', ''], ['裏技には、2点の $x$ 座標が両方いる。', 'B の $x$ 座標が不明 → 傾きは出せない。'], '$p$ と $q$ が両方わからないと、使えない。')
  ];
}
/* ---- ④ △OAB ---- */
function sArea() {
  const L = [[1, -1, 3], [1, -2, 4], [2, -1, 2], [0.5, -2, 4], [1, -3, 3], [1, -1, 2], [2, -2, 2]];
  return L.map(([a, p, q], i) => { const g = geo(a, p, q), t = g.ar, oc = Math.abs(a * p * q);
    return WR('ar-' + (i + 1), qHead(a, p, q) + '原点を O とするとき、△OAB の面積は？', t,
      [[2 * t, '$\\dfrac{1}{2}$ をかけ忘れている。三角形は ÷2。'], [oc / 2, '底辺 OC だけ。高さにあたる $(q-p)$ をかけていない。'], [oc * (q - p) / 2 + oc, '$(q-p)$ は、$x$ 座標の差。'], [Math.abs(a * (p + q)) * (q - p) / 2, '$a(p+q)$ は傾き。面積に使うのは、切片 $|apq|$。'], [oc * Math.abs(p + q) / 2, '高さは $(q-p)$。$p+q$ ではない。'], [a * q * q * (q - p) / 2, 'B の $y$ 座標ではなく、切片 $|apq|$ を使う。']].filter(c => c[0] > 0),
      ['OC ＝ 切片 ＝ $|apq|=' + dfmt(oc) + '$。', '$x$ 座標の差 $q-p=' + (q - p) + '$。', '面積 ＝ $\\dfrac{1}{2}\\times' + dfmt(oc) + '\\times' + (q - p) + '=' + dfmt(t) + '$。'], '△OAB ＝ $\\dfrac{1}{2}|apq|(q-p)$。', figPL({ a, p, q, showC: true, tri: [[0, 0], [p, a * p * p], [q, a * q * q]] })); });
}
/* ---- ⑤ 面積比 ---- */
function sRatio() {
  const L = [[1, -1, 3], [1, -2, 4], [1, -3, 2], [2, -1, 4], [0.5, -4, 2], [1, -6, 3], [1, -2, 6]];
  const rr = (x, y) => { const g = gcd(x, y); return (x / g) + ':' + (y / g); };
  return L.map(([a, p, q], i) => { const t = rr(-p, q);
    return Object.assign(RQ('rt-' + (i + 1), qHead(a, p, q) + '直線 AB と $y$ 軸の交点を C とする。△OCA と △OCB の面積の比は？', t,
      [[rr(q, -p), 'A と B が逆になっている。A 側が $|p|$、B 側が $|q|$。'], [rr(p * p, q * q), '2乗は不要。比は、$x$ 座標の絶対値のまま。'], [rr(-p + q, q), 'AB 全体と B の比になっている。△OCA は $|p|$ だけ。'], [rr(-p, -p + q), 'A と AB 全体の比。△OCA と △OCB の比は $|p|:|q|$。']],
      ['底辺 OC が共通。', '高さは、A と B の $x$ 座標の絶対値。', '比 ＝ $|p|:|q|=' + (-p) + ':' + q + '=' + t + '$。'], '底辺が共通なら、面積比 ＝ 高さの比 ＝ $|x|$ の比。'), { fig: figPL({ a, p, q, showC: true, tri: [[0, 0], [p, a * p * p], [0, -a * p * q]] }) }); });
}
/* ---- ⑥ 放物線上の3点の三角形 ---- */
function sTri3() {
  const L = [[1, -1, 0, 3], [1, -2, 0, 2], [2, -1, 0, 2], [0.5, -2, 0, 4], [1, -3, 0, 1], [1, 0, 1, 3], [2, -2, 1, 3]];
  return L.map(([a, p, m, q], i) => { const d1 = m - p, d2 = q - m, d3 = q - p, t = Math.abs(a) * d1 * d2 * d3 / 2;
    const y = x => a * x * x, sh = Math.abs((p * (y(m) - y(q)) + m * (y(q) - y(p)) + q * (y(p) - y(m)))) / 2;
    if (Math.abs(sh - t) > 1e-9) throw new Error('3点公式ちがい ' + [a, p, m, q]);
    return WR('tp-' + (i + 1), yA(a) + ' 上に、$x$ 座標が $' + nt(p) + '$、$' + nt(m) + '$、$' + nt(q) + '$ の3点 A、P、B がある。△APB の面積は？', t,
      [[2 * t, '$\\dfrac{1}{2}$ をかけ忘れている。'], [d1 * d2 * d3 / 2, '$a$ をかけ忘れている。'], [Math.abs(a) * d1 * d3 / 2, '3つの差のうち、$(m-p)$ と $(q-p)$ しか使っていない。'], [Math.abs(a) * d2 * d3 / 2, '3つの差のうち、$(q-m)$ と $(q-p)$ しか使っていない。'], [Math.abs(a) * d1 * d2 / 2, '3つめの差 $(q-p)$ が抜けている。'], [Math.abs(a) * (d1 + d2 + d3) / 2, '3つの差は、足さずにかける。']].filter(c => c[0] > 0),
      ['3つの差：$' + d1 + '$、$' + d2 + '$、$' + d3 + '$。', '面積 ＝ $\\dfrac{1}{2}\\times|' + a + '|\\times' + d1 + '\\times' + d2 + '\\times' + d3 + '=' + dfmt(t) + '$。'], '放物線上の3点の三角形 ＝ $\\dfrac{1}{2}|a|\\times$（3つの $x$ の差の積）。', figPL({ a, p, q, m, tri: [[p, y(p)], [m, y(m)], [q, y(q)]] })); });
}
/* ---- ⑦ 平行線 ---- */
function sPar() {
  const L = [[1, -1, 3, 0, 'x'], [1, -2, 4, 0, 'x'], [1, -1, 2, 3, 'x'], [1, -3, 1, 0, 'x'], [2, -2, 5, 1, 'x'], [1, 1, 4, -1, 'x'], [1, -1, 5, 1, 'x']];
  const ans = [];
  const qs = L.map(([a, p, q, m], i) => { const t = p + q - m, y = a * t * t;
    const base = '放物線 ' + yA(a) + ' 上に、$x$ 座標が $' + nt(p) + '$、$' + nt(q) + '$ の2点 A、B がある。';
    if (i < 5) return WR('pl-' + (i + 1), base + (m === 0 ? '原点 O を通り AB に平行な直線が、放物線と O 以外で交わる点の $x$ 座標は？' : '$x$ 座標が $' + nt(m) + '$ の点を通り AB に平行な直線が、放物線ともう1点で交わる。その点の $x$ 座標は？'), t,
      [[p + q, m === 0 ? '' : '$p+q$ から、通る点の $x$ 座標 $' + nt(m) + '$ を引く。'], [-t, '符号がぎゃく。$p+q-m$ をそのまま。'], [q - p - m, '平行線の条件は、$x$ 座標の和 ＝ 同じ。差ではない。'], [p + q + m, '$p+q=m+(\\text{もう1点})$。足すのではなく、$m$ を引く。'], [q, 'B の $x$ 座標そのもの。もう1点は、和から求める。'], [p, 'A の $x$ 座標そのもの。もう1点は、和から求める。']].map(c => [c[0], c[1] || '$m=0$ のときも、$p+q$ になるとは限らない。']).filter(c => c[0] !== t),
      ['平行な2本の弦は、「$x$ 座標の和」が等しい。', '$' + nt(p) + '+' + nt(q).replace(/^-/, '(-') + (q < 0 ? ')' : '') + '=' + nt(m) + '+\\square$。', '$\\square=' + t + '$。'], '平行な弦の端の $x$ 座標：和が同じ。', null);
    return null; }).filter(Boolean);
  qs.push(WR('pl-6', '放物線 $y=x^2$ 上に A($-1,\\ 1$)、B($3,\\ 9$)。放物線上の点 P($x>0$)で、△PAB ＝ △OAB となるとき、P の $y$ 座標は？', 4,
    [[2, '2 は P の $x$ 座標。$y=x^2=4$。'], [9, '9 は B の $y$ 座標。P は B と別の点。'], [16, '$x=4$ ではない。$x=-1+3-0=2$。'], [1, '1 は A の $y$ 座標。']],
    ['底辺 AB が共通 → O を通る AB の平行線上に P。', '$p+q=0+x$ より $x=-1+3=2$。', '$y=2^2=4$。'], '等積変形 ＝ 平行線。$x$ 座標の和が同じ点を探す。', figPL({ a: 1, p: -1, q: 3, m: 2, mName: 'P', tri: [[-1, 1], [3, 9], [2, 4]] })));
  qs.push(WR('pl-7', '放物線 $y=2x^2$ 上に A($-1,\\ 2$)、B($2,\\ 8$)。放物線上の点 P($x>0$ で B と別)で、△PAB ＝ △OAB となるとき、P の $x$ 座標は？', 1,
    [[2, '2 は B の $x$ 座標。P は B と別の点。'], [-1, '-1 は A の $x$ 座標。$x>0$ の点を探す。'], [3, '$p+q=-1+2=1$。$-1+2+0$ ではなく、$0+x=1$ から。'], [0, '0 は O。O 以外の点を探す。']],
    ['AB に平行で O を通る直線上に P。', '$p+q=0+x$ より $x=-1+2=1$。'], '等積変形 ＝ 平行線。和が同じ。'));
  return qs;
}
/* ---- ⑧ 総合（連立→解と係数） ---- */
function sSogoW() {
  const eqs = [
    ['sg-1', '放物線 $y=x^2$ と直線 $y=x+2$ が、2点 A、B で交わる。原点を O とするとき、△OAB の面積は？', 3, [[6, '$\\dfrac{1}{2}$ をかけ忘れている。'], [2, '2 は切片 OC。$x$ 座標の差 $3$ をかけて ÷2。'], [4, '$x$ 座標は $-1$ と $2$。差は $3$。'], [9, '$\\dfrac{1}{2}\\times2\\times3=3$。']], ['$x^2=x+2$ より $x^2-x-2=0$。$(x+1)(x-2)=0$。', '$x=-1,\\ 2$。差は 3。切片 OC ＝ 2。', '面積 ＝ $\\dfrac{1}{2}\\times2\\times3=3$。'], 'まず交点の $x$ 座標。あとは $\\dfrac{1}{2}\\times$切片$\\times$差。'],
    ['sg-2', '放物線 $y=x^2$ と直線 $y=x+6$ が、2点 A、B で交わる。△OAB の面積は？', 15, [[30, '$\\dfrac{1}{2}$ をかけ忘れている。'], [6, '6 は切片 OC。差 $5$ をかけて ÷2。'], [18, '$x$ 座標は $-2$ と $3$。差は $5$。'], [12, '$x=-2,\\ 3$。差は 5 で、面積は $\\dfrac{1}{2}\\times6\\times5=15$。']], ['$x^2-x-6=0$。$(x+2)(x-3)=0$。$x=-2,\\ 3$。', '切片 OC ＝ 6。差 ＝ 5。', '$\\dfrac{1}{2}\\times6\\times5=15$。'], '切片は、直線の式から読める。'],
    ['sg-3', '放物線 $y=\\dfrac{1}{2}x^2$ と直線 $y=x+4$ が、2点 A、B で交わる。△OAB の面積は？', 12, [[24, '$\\dfrac{1}{2}$ をかけ忘れている。'], [4, '4 は切片 OC。差 $6$ をかけて ÷2。'], [10, '$x$ 座標は $-2$ と $4$。差は $6$。'], [8, '$x=-2,\\ 4$。差は 6。面積は $\\dfrac{1}{2}\\times4\\times6=12$。']], ['$\\dfrac{1}{2}x^2=x+4$ → $x^2-2x-8=0$。$(x+2)(x-4)=0$。', '$x=-2,\\ 4$。切片 ＝ 4。差 ＝ 6。', '$\\dfrac{1}{2}\\times4\\times6=12$。'], '$a$ があっても、$x$ 座標を出して、同じ公式。'],
    ['sg-4', '放物線 $y=2x^2$ と直線 $y=2x+4$ が、2点 A、B で交わる。△OAB の面積は？', 6, [[12, '$\\dfrac{1}{2}$ をかけ忘れている。'], [4, '4 は切片 OC。差 $3$ をかけて ÷2。'], [8, '$x$ 座標は $-1$ と $2$。差は $3$。'], [3, '$\\dfrac{1}{2}\\times4\\times3=6$。']], ['$2x^2=2x+4$ → $x^2-x-2=0$。$x=-1,\\ 2$。', '切片 ＝ 4。差 ＝ 3。', '$\\dfrac{1}{2}\\times4\\times3=6$。'], '両辺を $a$ で割ると解きやすい。'],
  ];
  const qs = eqs.map(e => WR(e[0], e[1], e[2], e[3], e[4], e[5], null));
  qs.push(Object.assign(RQ('sg-5', '放物線 $y=x^2$ 上に A($-1,\\ 1$)、B($2,\\ 4$)。直線 AB の式は？', 'y=x+2',
    [['y=x-2', '切片の符号がぎゃく。$-apq=-(1)(-1)(2)=2$。'], ['y=3x+2', '傾きは $a(p+q)=1\\times1=1$。差ではない。'], ['y=-x+2', '傾きの符号がぎゃく。'], ['y=2x+1', '傾きと切片が入れかわっている。']],
    ['傾き ＝ $a(p+q)=1\\times(-1+2)=1$。', '切片 ＝ $-apq=-1\\times(-1)\\times2=2$。', '$y=x+2$。'], '$y=a(p+q)x-apq$。'), { fig: figPL({ a: 1, p: -1, q: 2, showC: true }) }));
  qs.push(WR('sg-6', '放物線 $y=\\dfrac{1}{4}x^2$ 上に、$x$ 座標が $-2$、$6$ の2点 A、B がある。直線 AB の傾きは？', 1, [[2, '傾きは $a\\times(p+q)=\\dfrac{1}{4}\\times4=1$。$a$ をかける。'], [4, '$p+q=4$ に $a=\\dfrac{1}{4}$ をかけ忘れ。'], [-1, '符号がぎゃく。'], [0.5, '傾きは差ではなく、和。$\\dfrac{1}{4}\\times4=1$。']], ['傾き ＝ $a(p+q)=\\dfrac{1}{4}\\times(-2+6)=1$。'], '$a$ が分数でも、同じ公式。', figPL({ a: 0.25, p: -2, q: 6 })));
  qs.push(WR('sg-7', '放物線 $y=x^2$ と直線 $y=2x+3$ の交点を A、B とする。A、B の $x$ 座標の和 $p+q$ はいくつ？', 2, [[3, '3 は切片。$x^2=2x+3$ から、和は傾き ÷ $a$ ＝ 2。'], [-3, '$pq=-3$。和ではない。'], [5, '2 と 3 を足したのではない。$x^2-2x-3=0$ の解の和。'], [1, '$x=-1,\\ 3$。和は $2$。']], ['$x^2-2x-3=0$。$(x+1)(x-3)=0$。', '$x=-1,\\ 3$。和 ＝ 2（傾き ÷ $a$ と同じ）。'], '傾き ＝ $a(p+q)$ だから、$p+q=$傾き$\\div a$。'));
  return qs;
}
const WR_ = null;
const I = {
  jd: '<b>この裏技が使えるのは、2点とも放物線 $y=ax^2$ の上にあるとき。</b><br>確かめ方：点の座標が $y=ax^2$ にあてはまるか。<br>例：$y=x^2$ のとき、($3,\\ 9$) は $9=3^2$ なので、放物線上。($3,\\ 5$) は $5\\ne3^2$ なので、放物線上ではない。<br>使えないときは、ふつうの「$y$ の増加 ÷ $x$ の増加」で解く。',
  br: '<b>まず、座標から一気に</b>：放物線 $y=ax^2$ 上の2点 A、B の<b>座標</b>だけで、直線 AB の式が出せる。<br>① 点の座標から $a=y\\div x^2$ を出す。<br>② $p$ ＝ 左の点 A の $x$ 座標、$q$ ＝ 右の点 B の $x$ 座標。<br>③ 傾き ＝ $a(p+q)$、切片 ＝ $-apq$。<br>例：A($-1,\\ 1$)、B($3,\\ 9$) → $a=1\\div1=1$、$p=-1$、$q=3$ → 傾き $2$、切片 $3$。$y=2x+3$。<br>ふつうの「傾き ＝ $y$ の増加 ÷ $x$ の増加」でも、同じ答えになる。<br><mark style="background:#ffe08a;padding:0 4px;border-radius:4px"><b>注意：使えるのは、2点とも放物線 $y=ax^2$ の上にあるときだけ！</b></mark><br>ふつうの2点（放物線の上にない点）には、使えない。',
  sl: '<b>裏技①</b>：放物線 $y=ax^2$ 上の2点を通る直線の<b>傾き</b>は<br>$a\\times(p+q)$ … <b>足し算</b>！' + figPL({ a: 1, p: -1, q: 3 }).html + '例：$y=x^2$、$p=-1$、$q=3$ → 傾き $=1\\times2=2$。<br><b>p と q</b>：左の点 A の $x$ 座標が $p$、右の点 B の $x$ 座標が $q$（$p<q$）。',
  ic: '<b>裏技②</b>：同じ直線の<b>切片</b>（$y$ 軸との交点 C）は<br>$-a\\times p\\times q$ … <b>かけ算にマイナス</b>！' + figPL({ a: 1, p: -1, q: 3, showC: true }).html + '例：$-1\\times(-1)\\times3=3$。<br><mark style="background:#ffe08a;padding:0 4px;border-radius:4px"><b>底辺 OC の長さ ＝ 切片の絶対値 $|apq|$</b></mark><br>長さはマイナスにならないので、切片が $-6$ でも OC ＝ $6$。',
  eq: '<b>裏技③</b>：①と②を合わせると、直線 AB の式が一発。<br>$y=a(p+q)x-apq$<br>連立方程式を解かなくていい。',
  ar: '<b>裏技④</b>：△OAB の面積は<br>$\\dfrac{1}{2}\\times|apq|\\times(q-p)$<br>底辺 ＝ OC ＝ <mark style="background:#ffe08a;padding:0 4px;border-radius:4px"><b>$|apq|$（切片の絶対値）</b></mark>、高さ ＝ $x$ 座標の差 $q-p$。<br><b>$q-p$</b> ＝ 右の $x$ 座標 − 左の $x$ 座標（<b>横の長さ</b>）。$y$ 座標ではない。<br>例：$p=-1$、$q=3$ なら $q-p=3-(-1)=4$。'+'<br><b>｜　｜（絶対値）</b>：マイナスをとって、プラスにする記号。<br>$|-3|=3$、$|5|=5$。長さや面積はマイナスにならないので使う。' + figPL({ a: 1, p: -1, q: 3, showC: true, tri: [[0, 0], [-1, 1], [3, 9]] }).html,
  rt: '<b>裏技⑤</b>：C を $y$ 軸との交点とすると、OC が共通の底辺。<br>△OCA : △OCB ＝ $|p|:|q|$<br>面積比は、$x$ 座標の比で決まる。<br><b>｜　｜（絶対値）</b>：マイナスをとって、プラスにする記号。<br>$|-3|=3$、$|5|=5$。長さや面積はマイナスにならないので使う。',
  tp: '<b>裏技⑥</b>：放物線上の3点 A、P、B の $x$ 座標を小さい順に $p<m<q$ とすると<br>△APB ＝ $\\dfrac{1}{2}|a|\\times(m-p)(q-m)(q-p)$<br>3つの差の積を作るだけ。<br>差は、どれも「右の $x$ − 左の $x$」。例：$m-p$ ＝ 真ん中の $x$ − 左の $x$。<br><b>｜　｜（絶対値）</b>：マイナスをとって、プラスにする記号。<br>$|-3|=3$、$|5|=5$。長さや面積はマイナスにならないので使う。',
  pl: '<b>裏技⑦</b>：放物線上の2本の弦が平行 ⇔ <b>$x$ 座標の和が同じ</b>。<br>AB ∥ CD ならば $p+q=c+d$。<br>△PAB ＝ △OAB（面積が同じ）は、<b>平行線</b>で考える。',
  sg: '<b>総まとめ</b>：直線と放物線の交点は<br>① $ax^2=mx+n$ を解いて $x=p,\\ q$。<br>② 切片 $n$ と $q-p$ を使い、$\\dfrac{1}{2}\\times n\\times(q-p)$。<br>解く式は、連立方程式の途中のたった1行。'
};
const ABOUT = {
  a: [{ p: '放物線 $y=ax^2$ 上の2点を通る直線は、$x$ 座標 $p$、$q$ だけで決まる。<br>$p$ ＝ 左の点の $x$、$q$ ＝ 右の点の $x$。' }, { p: RT([['傾き', '→', '$a(p+q)$'], ['切片', '→', '$-apq$'], ['式', '→', '$y=a(p+q)x-apq$']]) }, { p: '<b>ただし</b>、2点とも放物線 $y=ax^2$ の上にあるときだけ使える。' }, { cap: '連立方程式は、いらない。' }],
  b: [{ p: '面積も、$x$ 座標だけで出せる。<br>$q-p$ ＝ 右の $x$ − 左の $x$（横の長さ）。$y$ 座標ではない。' }, { p: '底辺 OC の長さは、切片 $-apq$ の<b>絶対値 $|apq|$</b>。<br>$-apq$ がマイナスのときも、長さは $|apq|$（プラス）。' }, { p: RT([['△OAB', '→', '$\\dfrac{1}{2}|apq|(q-p)$'], ['面積比', '→', '$|p|:|q|$'], ['3点の三角形', '→', '$\\dfrac{1}{2}|a|\\times$3つの差']]) }, { p: '<b>｜　｜（絶対値）</b>：マイナスをとって、プラスにする記号。<br>$|-3|=3$、$|5|=5$。<br>長さや面積はマイナスにならないので、$|p|$ や $|a|$ のように使う。' }, { cap: '座標を出す → 公式に入れる。' }],
  c: [{ p: '平行線と、入試ふうの問題で仕上げる。' }, { p: RT([['平行な弦', '→', '$x$ 座標の和が同じ'], ['△PAB ＝ △OAB', '→', '平行線'], ['交点', '→', '$ax^2=mx+n$ を解く']]) }, { cap: 'ここまでできれば、関数の大問は強い。' }]
};
const PARTS = [
  { id: 'a', title: '傾きと式', sub: '足し算・かけ算', about: ABOUT.a, aboutTitle: 'まず見てみよう：傾きと切片', aboutSub: 'p と q だけで直線が決まる',
    steps: [{ id: 'a-0', title: '座標から一気に', sub: '2点の座標だけで式が出る', intro: I.br, qs: sBridge() }, { id: 'a-0b', title: '使える？使えない？', sub: '放物線上の2点だけ', intro: I.jd, qs: sJudge() }, { id: 'a-1', title: '傾きは足し算', sub: 'a×(p＋q)', intro: I.sl, qs: sSlope() }, { id: 'a-2', title: '切片はかけ算', sub: '−a×p×q', intro: I.ic, qs: sIcpt() }, { id: 'a-3', title: '直線の式を一発で', sub: 'y＝a(p＋q)x−apq', intro: I.eq, qs: sEq() }] },
  { id: 'b', title: '面積', sub: '三角形・面積比', about: ABOUT.b, aboutTitle: 'まず見てみよう：面積', aboutSub: '公式ひとつ',
    steps: [{ id: 'b-1', title: '△OAB の面積', sub: '½×|apq|×(q−p)', intro: I.ar, qs: sArea() }, { id: 'b-2', title: '面積比', sub: '|p| ： |q|', intro: I.rt, qs: sRatio() }, { id: 'b-3', title: '3点の三角形', sub: '3つの差の積', intro: I.tp, qs: sTri3() }] },
  { id: 'c', title: '平行線と総合', sub: '等積変形・入試', about: ABOUT.c, aboutTitle: 'まず見てみよう：平行線', aboutSub: '和が同じ',
    steps: [{ id: 'c-1', title: '平行線と面積', sub: '和が同じ', intro: I.pl, qs: sPar() }, { id: 'c-2', title: '入試レベルの総合', sub: '交点から面積へ', intro: I.sg, qs: sSogoW() }] }
];
const RBM = { '放物線': 'ほうぶつせん', '傾き': 'かたむき', '絶対値': 'ぜったいち', '切片': 'せっぺん', '座標': 'ざひょう', '交点': 'こうてん', '直線': 'ちょくせん', '面積': 'めんせき', '三角形': 'さんかくけい', '平行': 'へいこう', '原点': 'げんてん', '関数': 'かんすう', '公式': 'こうしき', '底辺': 'ていへん', '連立方程式': 'れんりつほうていしき', '対称': 'たいしょう' };
const RBR = new RegExp(Object.keys(RBM).sort((a, b) => b.length - a.length).join('|'), 'g');
const RB = s => s.replace(RBR, w => '<ruby>' + w + '<rt>' + RBM[w] + '</rt></ruby>');
const ruby = o => typeof o === 'string' ? o.split(/(<svg[\s\S]*?<\/svg>)/).map((t, k) => k % 2 ? t : RB(t)).join('')
  : Array.isArray(o) ? o.map(ruby) : (o && typeof o === 'object') ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, (k === 'expr' || k === 'id' || k === 'html') ? v : ruby(v)])) : o;
const out = '// 自動生成（node genW.js）。手で直すときは genW.js を直す。\nconst PARTS = ' + JSON.stringify(ruby(PARTS)) + ';\nif (typeof module !== \'undefined\') module.exports = PARTS;\n';
fs.writeFileSync(path.join(__dirname, 'src/data.js'), out);
let n = 0; PARTS.forEach(P => P.steps.forEach(s => { n += s.qs.length; }));
console.log('src/data.js を作成：' + n + '問、' + (out.length / 1024).toFixed(0) + 'KB');
