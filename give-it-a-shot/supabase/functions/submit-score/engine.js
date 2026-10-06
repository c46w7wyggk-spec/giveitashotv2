
export const ENGINE_VERSION = 1;
export class Engine {
data() {
if (this._D) return this._D;
const KEYS = ['g', 'j', 'i', 'd', 'a', 'u'];
const POL = [
{ id: 'mw15', t: '', m: '', lean: -2, f: [-0.5, 0.8, 0.5, 0, 4, 1], sd: 0.5, ang: ['business', 0.3], who: ['TX', 'GA', 'KY', 'PA', 'WI', 'IA'], wd: 4,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'sp', t: '', m: '', lean: -3, f: [-1.2, 0.5, 0, 4, 4, 2], sd: 0.7, ang: ['business', 0.45], who: ['FL', 'MI', 'NY', 'OH'], wd: 2,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'rc', t: '', m: '', lean: -2, f: [-0.3, 0.1, -0.3, 0, 4, 1], sd: 0.6, ang: ['business', 0.3], who: ['NY', 'CA', 'OR', 'MA', 'CO'], wd: 4,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'top70', t: '', m: '', lean: -2, f: [-0.8, 0.2, 0, -1.2, 2, 1], sd: 0.6, ang: ['business', 0.4], who: ['NY', 'CA', 'MA'], wd: -3,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'wealth', t: '', m: '', lean: -2, f: [-0.5, 0, 0, -0.8, 3, 1], sd: 0.9, ang: ['business', 0.35], who: ['CA', 'NY', 'NV'], wd: -2,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'jobg', t: '', m: '', lean: -3, f: [0.2, -1.3, 0.6, 2.2, 4, -1], sd: 0.8, ang: ['business', 0.15], who: ['OH', 'KY', 'LA', 'MI'], wd: 3,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'debt', t: '', m: '', lean: -2, f: [0.1, 0, 0.3, 1.2, 3, -1], sd: 0.4, ang: null, who: ['MA', 'CO', 'VA', 'WA'], wd: 2,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'gascap', t: '', m: '', lean: -2, f: [-0.5, 0.1, -0.8, 0, 4, 4], sd: 0.8, ang: ['urban', 0.5], who: ['LA', 'TX', 'GA'], wd: 1,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'college', t: '', m: '', lean: -2, f: [0.2, 0, 0, 1, 3, -1], sd: 0.5, ang: null, who: ['WI', 'MN', 'MA'], wd: 2,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'ubi', t: '', m: '', lean: -3, f: [0.2, 0.5, 1.0, 5.5, 6, -2], sd: 0.7, ang: null, who: ['AK', 'NM', 'KY'], wd: 3,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'norw', t: '', m: '', lean: -1, f: [-0.2, 0.1, 0, 0, 1, 1], sd: 0.6, ang: ['business', 0.3], who: ['TX', 'GA', 'UT', 'KS'], wd: -2,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'ssx', t: '', m: '', lean: -2, f: [-0.2, 0.1, 0.2, 0.4, 4, 0], sd: 0.5, ang: null, who: ['FL', 'AZ', 'PA'], wd: 4,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'tar25', t: '', m: '', lean: -1, f: [-0.8, 0.2, 1.0, -0.6, -3, 2], sd: 0.6, ang: ['farmers', 0.45], who: ['IA', 'NE', 'KS', 'ND'], wd: -4,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'ccap', t: '', m: '', lean: -2, f: [-0.2, 0, 0, 0, 5, 0], sd: 0.5, ang: ['business', 0.25], who: ['NY', 'MA', 'NV'], wd: 2,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'frack', t: '', m: '', lean: -2, f: [-0.9, 0.4, 1.0, 0, -2, 2], sd: 0.6, ang: ['energy', 0.5], who: ['TX', 'ND', 'PA', 'NM', 'LA'], wd: -5,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'infra', t: '', m: '', lean: -1, f: [0.5, -0.2, 0.2, 1.5, 3, 0], sd: 0.6, ang: null, who: ['PA', 'MI', 'OH', 'IL'], wd: 2,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'prek', t: '', m: '', lean: -1, f: [0.1, 0, 0, 0.7, 3, 0], sd: 0.5, ang: null, who: ['MN', 'MA', 'WA'], wd: 2,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'mw0', t: '', m: '', lean: 2, f: [0.2, -0.3, -0.1, 0, -5, 3], sd: 0.6, ang: ['labor', 0.45], who: ['ID', 'WY', 'ND', 'UT', 'KS'], wd: -3,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'corp15', t: '', m: '', lean: 2, f: [0.6, -0.2, 0.1, 0.7, -1, 1], sd: 0.6, ang: null, who: ['NY', 'MA', 'TX'], wd: -1,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'zone', t: '', m: '', lean: 2, f: [0.5, -0.1, -0.4, 0, 1, 2], sd: 0.7, ang: null, who: ['CA', 'OR', 'CO', 'MA', 'NY'], wd: 0,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'lic', t: '', m: '', lean: 1, f: [0.3, -0.3, -0.1, 0, 1, 0], sd: 0.6, ang: null, who: ['UT', 'NV', 'AZ'], wd: 1,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'trade', t: '', m: '', lean: 2, f: [0.5, 0.2, -0.5, 0.2, -1, 2], sd: 0.6, ang: ['labor', 0.3], who: ['MI', 'OH', 'PA', 'WA'], wd: -2,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'ssp', t: '', m: '', lean: 2, f: [0.2, 0, 0, 1.2, -5, 3], sd: 0.8, ang: ['retirees', 0.45], who: ['FL', 'AZ', 'PA'], wd: -4,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'age69', t: '', m: '', lean: 1, f: [0.1, 0.1, 0, -0.8, -4, 2], sd: 0.5, ang: ['retirees', 0.35], who: ['FL', 'AZ', 'KY', 'PA'], wd: -3,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'permit', t: '', m: '', lean: 1, f: [0.4, -0.1, -0.2, 0, 1, 0], sd: 0.6, ang: null, who: ['GA', 'VA', 'TX'], wd: 2,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'regs', t: '', m: '', lean: 1, f: [0.3, -0.1, 0, 0, 0, 0], sd: 0.8, ang: null, who: ['TX', 'UT', 'ID'], wd: 1,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'vouch', t: '', m: '', lean: 2, f: [0.1, 0, 0, 0.4, -1, 2], sd: 0.7, ang: ['labor', 0.3], who: ['WI', 'IA', 'LA', 'AZ'], wd: 0,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'cut10', t: '', m: '', lean: 2, f: [-0.9, 0.5, -0.2, -2.2, -5, 3], sd: 0.6, ang: ['labor', 0.3], who: ['VA', 'PA', 'NM'], wd: -3,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'hsa', t: '', m: '', lean: 1, f: [0.2, 0, 0, 0.2, 1, 0], sd: 0.6, ang: null, who: ['UT', 'TX', 'AZ'], wd: 1,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'visa', t: '', m: '', lean: 1, f: [0.6, -0.1, 0, -0.2, -1, 1], sd: 0.6, ang: null, who: ['WA', 'CA', 'MA', 'VA'], wd: 1,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'cg0', t: '', m: '', lean: 2, f: [0.4, -0.1, 0, 1, -3, 2], sd: 0.6, ang: null, who: ['NY', 'CA', 'NV'], wd: -2,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'carbon', t: '', m: '', lean: 1, f: [-0.2, 0.1, 0.5, 0, -1, 1], sd: 0.6, ang: ['energy', 0.3], who: ['ND', 'LA', 'TX', 'WY'], wd: -2,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'flat', t: '', m: '', lean: 2, f: [0.3, -0.1, 0, 1, -2, 1], sd: 0.7, ang: null, who: ['KS', 'UT', 'TX'], wd: 0,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'land', t: '', m: '', lean: 1, f: [0.1, 0, 0, -0.5, -2, 1], sd: 0.6, ang: null, who: ['WY', 'MT', 'ID', 'UT', 'NM'], wd: -3,
real: '',
pro: '', con: '',
hl: '' },
{ id: 'rtw', t: '', m: '', lean: 1, f: [0.2, -0.1, 0, 0, -1, 2], sd: 0.6, ang: ['labor', 0.35], who: ['MI', 'OH', 'IL', 'PA'], wd: -3,
real: '',
pro: '', con: '',
hl: ''}
];
const DIS_OPTS = [
{ label: '', desc: '', f: [0.2, -0.1, 0, 1.2, 5, -3], sd: 0.3, res: '' },
{ label: '', desc: '', f: [-0.3, 0, 0, 0.4, 1, 1], sd: 0.4, res: '' },
{ label: '', desc: '', f: [-0.8, 0.2, 0, 0, -8, 6], sd: 0.3, res: '' }
];
const EV = {
hurricane: { kind: '', title: '', text: '', st: ['FL', 'LA', 'GA'], icon: 'storm', base: [-1.0, 0.3, 0.2, 0, 0, 4], real: '', opts: DIS_OPTS, hl: '' },
quake: { kind: '', title: '', text: '', st: ['CA', 'WA', 'AK'], icon: 'storm', base: [-0.9, 0.3, 0.1, 0, 0, 4], real: '', opts: DIS_OPTS, hl: '' },
fire: { kind: '', title: '', text: '', st: ['OR', 'CO', 'CA'], icon: 'storm', base: [-0.7, 0.2, 0.1, 0, 0, 4], real: '', opts: DIS_OPTS, hl: '' },
tornado: { kind: '', title: '', text: '', st: ['KS', 'MO', 'NE'], icon: 'storm', base: [-0.6, 0.2, 0.1, 0, 0, 3], real: '', opts: DIS_OPTS, hl: '' },
war_oil: { kind: 'War abroad', title: '', text: '', st: ['TX', 'LA', 'ND'], icon: 'flame', base: [-0.4, 0.1, 1.2, 0, -1, 2], real: '',
opts: [
{ label: '', desc: '', f: [0.1, 0, -0.7, 0.1, 2, 0], sd: 0.4, res: '' },
{ label: '', desc: '', f: [-0.5, 0.1, -1.0, 0, 3, 4], sd: 0.6, res: '' },
{ label: '', desc: '', f: [0.2, -0.1, -0.4, 0, 1, 1], sd: 0.5, res: '' },
{ label: 'Do nothing', desc: '', f: [-0.4, 0.1, 0.4, 0, -3, 3], sd: 0.4, res: '' }
], hl: '' },
war_ally: { kind: 'War abroad', title: '', text: '', st: ['VA', 'AK', 'GA'], icon: 'flame', base: [-0.2, 0, 0.4, 0, 0, 1], real: '',
opts: [
{ label: '', desc: '', f: [0.2, 0, 0, 1.0, 1, 0], sd: 0.4, res: '' },
{ label: '', desc: '', f: [-0.2, 0, 0.4, 0, 0, 0], sd: 0.5, res: '' },
{ label: 'Stay neutral', desc: '', f: [0, 0, 0, 0, -3, 1], sd: 0.4, res: '' }
], hl: '' },
pandemic: { kind: 'Public health', title: '', text: '', st: ['NY', 'WA', 'FL'], icon: 'storm', base: [-1.0, 0.6, 0, 0, -2, 2], real: '',
opts: [
{ label: '', desc: '', f: [-2.0, 2.0, 0, 0.5, -3, 6], sd: 0.4, res: '' },
{ label: '', desc: '', f: [-0.5, 0.2, 0, 0.8, 3, -1], sd: 0.5, res: '' },
{ label: '', desc: '', f: [-0.3, 0, 0, 0, -5, 4], sd: 0.5, res: '' }
], hl: '' },
boom: { kind: 'Good news', title: '', text: '', st: ['WA', 'CA', 'MA'], icon: null, base: [1.5, -0.3, 0.3, 0, 2, 0], real: '',
opts: [
{ label: '', desc: '', f: [-0.4, 0, 0, -0.8, -1, 0], sd: 0.4, res: '' },
{ label: 'Let it ride', desc: '', f: [0.6, 0, 0, 0, 1, 1], sd: 0.4, res: '' },
{ label: '', desc: '', f: [0, -0.3, 0, 0.4, 2, 0], sd: 0.5, res: '' }
], hl: '' },
crash: { kind: 'Financial shock', title: '', text: '', st: ['NY', 'MA', 'NV'], icon: 'storm', base: [-1.2, 0.6, 0, 0, -3, 3], real: '',
opts: [
{ label: '', desc: '', f: [0.8, 0, 0, 1.2, -6, 4], sd: 0.4, res: '' },
{ label: 'Let it fail', desc: '', f: [-1.8, 1.5, 0, 0, -2, 6], sd: 0.5, res: '' },
{ label: '', desc: '', f: [0.2, 0, 0, 0.5, -1, 1], sd: 0.5, res: '' }
], hl: '' },
cyber: { kind: 'Security', title: '', text: '', st: ['TX', 'GA', 'VA'], icon: 'flame', base: [-0.6, 0.1, 0.2, 0, -2, 2], real: '',
opts: [
{ label: '', desc: '', f: [0.2, 0, 0, 0.3, 2, 0], sd: 0.4, res: '' },
{ label: '', desc: '', f: [0.3, 0, 0, 0, -1, 0], sd: 0.5, res: '' },
{ label: '', desc: '', f: [-0.6, 0, 0, 0, -3, 2], sd: 0.4, res: '' }
], hl: '' },
bond: { kind: 'Financial shock', title: '', text: '', st: ['NY', 'VA', 'MA'], icon: 'storm', base: [-1.0, 0.2, 0.5, 1.0, -2, 2], real: '',
opts: [
{ label: '', desc: '', f: [-0.5, 0.3, 0, -1.5, -4, 3], sd: 0.4, res: '' },
{ label: 'Raise taxes', desc: '', f: [-0.6, 0.2, 0, -1.3, -3, 2], sd: 0.4, res: '' },
{ label: '', desc: '', f: [0.2, 0, 1.5, -0.3, -1, 1], sd: 0.5, res: '' }
], hl: '' }
};
const FAC = {
labor: { name: 'General strike', kind: 'Strike', st: ['MI', 'OH', 'PA', 'IL'], icon: 'flame', base: [-1.0, 0.5, 0, 0, -1, 8], text: '', real: '', who: 'unions' },
business: { name: '', kind: 'Walkout', st: ['NY', 'MA', 'CA', 'TX'], icon: 'flame', base: [-1.2, 0.4, 0, 0, -1, 3], text: '', real: '', who: 'executives' },
farmers: { name: '', kind: 'Protest', st: ['IA', 'NE', 'KS', 'ND'], icon: 'flame', base: [-0.5, 0.1, 0.3, 0, -1, 6], text: '', real: '', who: 'farmers' },
urban: { name: 'Riots', kind: 'Riots', st: ['NY', 'CA', 'IL', 'OR'], icon: 'flame', base: [-0.6, 0.2, 0, 0, -2, 10], text: '', real: '', who: 'city residents' },
retirees: { name: '', kind: 'Protest', st: ['FL', 'AZ', 'PA'], icon: 'flame', base: [0, 0, 0, 0, -4, 5], text: '', real: '', who: 'retirees' },
energy: { name: '', kind: 'Strike', st: ['TX', 'ND', 'LA', 'NM'], icon: 'flame', base: [-0.8, 0.3, 0.6, 0, -1, 4], text: '', real: '', who: 'energy workers' }
};
const ST = {
AL: ['Alabama-jama', 'Alabama'], AK: ['Alaska-Ching', 'Alaska'], AZ: ['Arizonah', 'Arizona'], AR: ['Arkansaw', 'Arkansas'], CA: ['Californication', 'California'], CO: ['Coloradude', 'Colorado'],
CT: ['Connecti-cut', 'Connecticut'], DE: ['Dela-where?', 'Delaware'], FL: ['Flori-duh', 'Florida'], GA: ['Georgia-ish', 'Georgia'], HI: ['', 'Hawaii'], ID: ['Spudaho', 'Idaho'],
IL: ['Illinoise', 'Illinois'], IN: ['Indiana Loans', 'Indiana'], IA: ['Iowa-ay', 'Iowa'], KS: ['Kansastic', 'Kansas'], KY: ['Kentuckyard', 'Kentucky'], LA: ['Looseiana', 'Louisiana'],
ME: ['', 'Maine'], MD: ['Merry-land', 'Maryland'], MA: ['Taxachusetts', 'Massachusetts'], MI: ['Michi-gone', 'Michigan'], MN: ['Minnesnowta', 'Minnesota'], MS: ['Missi-ssippy', 'Mississippi'],
MO: ['Missour-Ya', 'Missouri'], MT: ['Montanope', 'Montana'], NE: ['Cornbraska', 'Nebraska'], NV: ['Nevada Vegas', 'Nevada'], NH: ['', 'New Hampshire'], NJ: ['', 'New Jersey'],
NM: ['New Mexi-cool', 'New Mexico'], NY: ['Newer York', 'New York'], NC: ['', 'North Carolina'], ND: ['Dakota Dakota', 'North Dakota'], OH: ['Ohi-NO', 'Ohio'], OK: ['Oklahoma-ha', 'Oklahoma'],
OR: ['Oregone', 'Oregon'], PA: ['Pennsyl-vanity', 'Pennsylvania'], RI: ['', 'Rhode Island'], SC: ['', 'South Carolina'], SD: ['Dakota Redux', 'South Dakota'], TN: ['', 'Tennessee'],
TX: ['Texass', 'Texas'], UT: ['Utah-pia', 'Utah'], VT: ['Vermunt', 'Vermont'], VA: ['Virgin-ia', 'Virginia'], WA: ['Washingtoon', 'Washington'], WV: ['', 'West Virginia'],
WI: ['Cheesconsin', 'Wisconsin'], WY: ['Wyo-Mingle', 'Wyoming']
};
const TITLES = [
{ id: 'President', label: 'President', tag: '',
mods: { pf: 0.85, sdm: 0.7, nego: 0.10, back: 0.5, cap: 1.3 },
perks: ['', ''],
flaws: ['', ''] },
{ id: 'Supreme Leader', label: 'Supreme Leader', tag: '',
mods: { pf: 1.3, ab: -8, ub: 8, nego: -0.15, back: 0.15, cap: 0.5, over: 85 },
perks: ['', ''],
flaws: ['', ''] },
{ id: 'CEO of America', label: 'CEO of America', tag: '',
mods: { gf: 1.2, df: 0.7, ja: 1.5, ab: -3, angm: { labor: 1.6 } },
perks: ['', ''],
flaws: ['', ''] },
{ id: 'Grand Poobah', label: 'Grand Poobah', tag: '',
mods: { ab: 8, ub: -5, sdm: 1.6, evm: 1.3 },
perks: [''],
flaws: ['', ''] }
];
const HL = {
mw15: ['', ''],
sp: ['', ''],
rc: ['', ''],
top70: ['', ''],
wealth: ['', ''],
jobg: ['', ''],
debt: ['', ''],
gascap: ['', ''],
college: ['', ''],
ubi: ['', ''],
norw: ['', ''],
ssx: ['', ''],
tar25: ['', ''],
ccap: ['', ''],
frack: ['', ''],
infra: ['', ''],
prek: ['', ''],
mw0: ['', ''],
corp15: ['', ''],
zone: ['', ''],
lic: ['', ''],
trade: ['', ''],
ssp: ['', ''],
age69: ['', ''],
permit: ['', ''],
regs: ['', ''],
vouch: ['', ''],
cut10: ['', ''],
hsa: ['', ''],
visa: ['', ''],
cg0: ['', ''],
carbon: ['', ''],
flat: ['', ''],
land: ['', ''],
rtw: ['', '']
};
const EVHL = {
hurricane: ['', '', ''],
quake: ['', '', ''],
fire: ['', '', ''],
tornado: ['', '', ''],
war_oil: ['', '', ''],
war_ally: ['', '', ''],
pandemic: ['', '', ''],
boom: ['', '', ''],
crash: ['', '', ''],
cyber: ['', '', ''],
bond: ['', '', '']
};
const FACHL = {
labor: ['', '', ''],
business: ['', '', ''],
farmers: ['', '', ''],
urban: ['', '', ''],
retirees: ['', '', ''],
energy: ['', '', '']
};
const OUT = { N: ['', '', ''], L: ['', '', 'People\'s Pulse'], R: ['', '', ''] };
const PUNDL = { name: '', org: '' };
const PUNDR = { name: 'Chip Laissez', org: '' };
const SUPQ = ['', '', '', ''];
const OPPQ = ['', '', '', '', ''];
const ECON = ['', '', ''];
const PUND = ['', '', '', ''];
const QUIPS = {
C: { A: ['', ''], B: ['', ''], C: ['', ''], D: ['', ''], F: ['', ''] },
L: { A: ['', ''], B: ['', ''], C: ['', ''], D: ['', ''], F: ['', ''] }
};
this._D = { KEYS, POL, DIS_OPTS, EV, FAC, ST, TITLES, HL, EVHL, FACHL, OUT, PUNDL, PUNDR, SUPQ, OPPQ, ECON, PUND, QUIPS };
return this._D;
}
rn(g) {
g.rs = (g.rs + 0x6D2B79F5) | 0;
let t = Math.imul(g.rs ^ (g.rs >>> 15), 1 | g.rs);
t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
pick(g, arr) { return arr[Math.floor(this.rn(g) * arr.length)]; }
shuffle(g, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.rn(g) * (i + 1)); const x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
pol(id) { return this.data().POL.find((p) => p.id === id); }
newGame(seed) {
const D = this.data();
const g = { rs: seed | 0, day: 1, phase: 'title', title: 'President', memos: [], pols: [], evs: [], hits: [], vet: {}, sched: {}, inc: [], carry: [], flash: [], news: [], todayPol: [], over: false, bond: false, riot: false, ds: null, ds0: null, mi: 0 };
const days = this.shuffle(g, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]).slice(0, 6);
const dis = this.pick(g, ['hurricane', 'quake', 'fire', 'tornado']);
const war = this.pick(g, ['war_oil', 'war_ally']);
const rest = this.shuffle(g, ['pandemic', 'boom', 'crash', 'cyber']).slice(0, 4);
const ids = this.shuffle(g, [dis, war].concat(rest));
days.forEach((d, i) => { g.sched[d] = ids[i]; });
return g;
}
deal(g) {
const D = this.data();
const used = {}; g.pols.forEach((p) => { used[p.id] = true; });
let pool = D.POL.filter((p) => !used[p.id] && !(g.vet[p.id] != null && g.day - g.vet[p.id] < 3));
if (pool.length < 3) pool = D.POL.filter((p) => !used[p.id]);
const chosen = [];
const take = (flt) => {
let a = pool.filter((p) => flt(p) && chosen.indexOf(p) < 0);
if (!a.length) a = pool.filter((p) => chosen.indexOf(p) < 0);
if (a.length) chosen.push(this.pick(g, a));
};
take((p) => p.lean < 0); take((p) => p.lean > 0); take(() => true);
g.memos = this.shuffle(g, chosen).map((p) => ({ id: p.id, dec: null }));
g.mi = 0;
}
nights(g, d) { return (g.day - d) + ((g.phase === 'brief' || g.phase === 'end') ? 1 : 0); }
M(g) {
const R = this.role(g);
const ps = [0, 0, 0, 0, 0, 0], es = [0, 0, 0, 0, 0, 0];
g.pols.forEach((p) => {
if (p.rep) return;
const n = this.nights(g, p.d); if (n <= 0) return;
const r = (1 - Math.pow(0.5, n)) * p.s;
for (let k = 0; k < 6; k++) ps[k] += p.f[k] * r;
});
g.evs.forEach((e) => {
const n = this.nights(g, e.d); if (n <= 0) return;
const r = Math.pow(0.7, n - 1);
for (let k = 0; k < 6; k++) es[k] += e.f[k] * r;
});
const sum = [0, 1, 2, 3, 4, 5].map((k) => ps[k] * R.pf * (k === 0 ? R.gf : k === 3 ? R.df : 1) + es[k] * R.evm);
const jobless = Math.max(2.0, 4.3 + sum[1]);
const infl = Math.max(-1, 3.0 + sum[2]);
const gdp0 = sum[0];
const deficit0 = 5.8 + sum[3] - 0.25 * gdp0;
const appr = this.clamp(48 + R.ab + sum[4] - 2.2 * R.ja * (jobless - 4.3) - 2.0 * (infl - 3.0) + 1.0 * gdp0 - 0.4 * Math.max(0, deficit0 - 12), 3, 92);
const unrest = this.clamp(15 + R.ub + sum[5] + 0.45 * Math.max(0, 45 - appr), 0, 100);
const gdp = gdp0 - 0.02 * Math.max(0, unrest - 40);
return { g: gdp, j: jobless, i: infl, d: 5.8 + sum[3] - 0.25 * gdp, a: appr, u: unrest };
}
role(g) {
const D = this.data();
const t = D.TITLES.find((x) => x.id === g.title) || D.TITLES[0];
return Object.assign({ pf: 1, gf: 1, df: 1, sdm: 1, evm: 1, ab: 0, ub: 0, ja: 1, nego: 0, back: 0.35, cap: 1, over: 95, angm: {} }, t.mods);
}
scaled(g, f) { const R = this.role(g); return [f[0] * R.pf * R.gf, f[1] * R.pf, f[2] * R.pf, f[3] * R.pf * R.df, f[4] * R.pf, f[5] * R.pf]; }
needle(g) { let s = 50; g.pols.forEach((p) => { if (!p.rep) s += this.pol(p.id).lean * p.s * 2.5; }); return this.clamp(s, 2, 98); }
mood(g, abbr, m) {
let v = m.a + (((abbr.charCodeAt(0) * 31 + abbr.charCodeAt(1) * 17) % 11) - 5);
g.hits.forEach((h) => {
const n = this.nights(g, h.d); if (n <= 0) return;
if (h.st.indexOf(abbr) >= 0) v += h.v * Math.pow(0.75, n - 1);
});
return this.clamp(v, 0, 100);
}
addEv(g, f, sd) {
const r = f.map((x) => x * (1 + (this.rn(g) * 2 - 1) * (sd || 0)));
g.evs.push({ d: g.day, f: r });
}
lc(t) { return t.charAt(0).toLowerCase() + t.slice(1); }
outlet(g, slant) { const D = this.data(); return this.pick(g, D.OUT[slant]); }
reactions(g) { const D = this.data(); return [this.pick(g, D.PUND), this.pick(g, D.PUND)]; }
polStory(g, p, f) {
const D = this.data();
const r = this.rn(g); const slant = r < 0.34 ? 'N' : r < 0.67 ? 'L' : 'R';
const h = slant === 'N' ? p.hl : slant === 'L' ? D.HL[p.id][0] : D.HL[p.id][1];
const PH = { g: ['', ''], j: ['', ''], i: ['prices eased', 'prices climbed'], d: ['', ''], a: ['', ''], u: ['', ''] };
const SC = [0.5, 0.5, 0.5, 1, 5, 5];
const ks = ['g', 'j', 'i', 'd', 'a', 'u'];
const ranked = ks.map((k, i) => ({ k: k, v: f[i], m: Math.abs(f[i]) / SC[i] })).filter((x) => x.m > 0.15).sort((a, b) => b.m - a.m).slice(0, 2);
const eff = ranked.map((x) => PH[x.k][x.v >= 0 ? (x.k === 'g' || x.k === 'a' ? 1 : x.k === 'u' || x.k === 'j' || x.k === 'i' || x.k === 'd' ? 1 : 1) : 0]);
const para1 = p.m + (eff.length ? ' Within days, ' + eff.join(' and ') + '.' : '');
const planned = p.lean < 0;
const sup = planned ? D.PUNDL : D.PUNDR, opp = planned ? D.PUNDR : D.PUNDL;
const para2 = sup.name + ' of the ' + sup.org + ' cheered: "' + this.pick(g, D.SUPQ) + '" ' + opp.name + ' of the ' + opp.org + ' replied: "' + this.pick(g, D.OPPQ) + '"';
const para3 = '' + p.pro + ' Critics say: ' + p.con;
return { k: 'pol', h: h, o: this.outlet(g, slant), b: [para1, para2, para3, this.pick(g, D.ECON)] };
}
evStory(g, id, st) {
const D = this.data(); const E = D.EV[id];
const nm = D.ST[st][0];
return { k: 'inc', h: this.pick(g, D.EVHL[id]).replace('{st}', nm), o: this.outlet(g, 'N'), b: [E.text.replace('{st}', nm), this.reactions(g)[0], this.reactions(g)[1]] };
}
crisisStory(g, c) {
const D = this.data(); const F = D.FAC[c.fac];
const pol = c.pol ? this.pol(c.pol) : null;
const slant = pol ? (pol.lean < 0 ? 'R' : 'L') : 'N';
return { k: 'inc', h: this.pick(g, D.FACHL[c.fac]).replace('{st}', D.ST[c.st][0]), o: this.outlet(g, slant), b: [F.text + (pol ? ' The spark: "' + pol.t + '."' : ''), this.reactions(g)[0], this.reactions(g)[1]] };
}
note(g, h, ctx) {
const D = this.data();
const r = this.rn(g); const slant = r < 0.5 ? 'N' : r < 0.75 ? 'L' : 'R';
const rs = this.reactions(g);
return { k: 'inc', h: h, o: this.outlet(g, slant), b: [ctx || h, rs[0], this.pick(g, D.ECON)] };
}
push(g, h, ctx) { g.news.push(this.note(g, h, ctx)); }
endDay(g) {
const D = this.data();
g.news = []; g.todayPol = []; g.flash = [];
g.memos.forEach((mm) => {
const p = this.pol(mm.id);
if (mm.dec === 'sign') {
const f = p.f.map((x) => x * (1 + (this.rn(g) * 2 - 1) * p.sd * this.role(g).sdm));
g.pols.push({ id: p.id, d: g.day, f: f, rep: false, s: 1 });
g.todayPol.push(p.id);
g.news.push(this.polStory(g, p, f));
g.hits.push({ d: g.day, st: p.who, v: p.wd, l: p.t });
} else {
g.vet[p.id] = g.day;
}
});
g.inc = [];
const savedPhase = g.phase; g.phase = 'brief';
const m = this.M(g);
g.carry.forEach((c) => { g.inc.push(c); this.crisisHit(g, c, 0.6); });
g.carry = [];
if (!g.inc.some((c) => c.k === 'crisis')) {
for (let i = 0; i < g.todayPol.length; i++) {
const p = this.pol(g.todayPol[i]);
if (p.ang) {
const prob = Math.min(0.9, p.ang[1] * (this.role(g).angm[p.ang[0]] || 1) * (0.6 + m.u / 60));
if (this.rn(g) < prob) {
const c = { k: 'crisis', fac: p.ang[0], pol: p.id, st: this.pick(g, D.FAC[p.ang[0]].st), esc: 0 };
g.inc.push(c); this.crisisHit(g, c, 1);
break;
}
}
}
}
const sid = g.sched[g.day];
if (sid) {
const ev = D.EV[sid];
const e = { k: 'event', id: sid, st: this.pick(g, ev.st) };
g.inc.push(e); this.addEv(g, ev.base, 0.2);
g.hits.push({ d: g.day, st: [e.st], v: sid === 'boom' ? 12 : -20, l: ev.kind + ': ' + ev.title.replace(' {st}', '').replace('{st}', '') });
g.flash.push({ st: e.st, icon: ev.icon });
g.news.push(this.evStory(g, sid, e.st));
} else if (m.d > 14 && !g.bond) {
g.bond = true;
const ev = D.EV.bond; const e = { k: 'event', id: 'bond', st: this.pick(g, ev.st) };
g.inc.push(e); this.addEv(g, ev.base, 0.2);
g.flash.push({ st: e.st, icon: ev.icon });
g.news.push(this.evStory(g, 'bond', e.st));
}
if (m.u >= 72 && !g.inc.some((c) => c.k === 'crisis')) {
const c = { k: 'crisis', fac: 'urban', pol: null, st: this.pick(g, D.FAC.urban.st), esc: 0 };
g.inc.push(c); this.crisisHit(g, c, 1);
}
g.phase = savedPhase;
if (g.inc.length) g.phase = 'incident'; else this.toBrief(g);
}
crisisHit(g, c, scale) {
const F = this.data().FAC[c.fac];
this.addEv(g, F.base.map((x) => x * scale), 0.2);
g.hits.push({ d: g.day, st: [c.st], v: -22, l: F.name });
g.news.push(this.crisisStory(g, c));
g.flash.push({ st: c.st, icon: F.icon });
}
resolveIncident(g, i) {
const D = this.data();
const cur = g.inc[0];
if (cur.k === 'event') {
const o = D.EV[cur.id].opts[i];
this.addEv(g, o.f, o.sd);
this.push(g, o.res, D.EV[cur.id].text.replace('{st}', D.ST[cur.st][0]) + ' ' + o.desc);
} else {
const F = D.FAC[cur.fac];
const m = this.M(g);
const p = cur.pol ? g.pols.find((x) => x.id === cur.pol && !x.rep) : null;
let ended = false;
if (i === 0) {
if (p) { p.rep = true; this.addEv(g, [0, 0, 0, 0, 3, -20], 0.2); this.push(g, 'You repealed "' + this.pol(p.id).t + ''); }
else { this.addEv(g, [0, 0, 0, 0.8, 2, -15], 0.2); this.push(g, ''); }
ended = true;
} else if (i === 1) {
const chance = this.odds(m, cur, this.role(g));
if (this.rn(g) < chance) {
if (p) p.s = Math.min(p.s, 0.6);
this.addEv(g, [0, 0, 0, 0.3, 2, -12], 0.2);
this.push(g, 'Talks succeed. ' + (p ? '' : ''));
ended = true;
} else { this.addEv(g, [0, 0, 0, 0, 0, 4], 0.2); this.push(g, '' + F.name.toLowerCase() + ' continues.'); }
} else if (i === 2) {
this.addEv(g, [0, 0, 0, 0, -7 * this.role(g).cap, -18], 0.2);
if (this.rn(g) < this.role(g).back) { this.addEv(g, [0, 0, 0, 0, -4, 15], 0.2); this.push(g, ''); }
else { this.push(g, ''); ended = true; }
} else {
this.addEv(g, [-0.8, 0, 0, 0, -2, 5], 0.2);
if (this.rn(g) < 0.5) { this.push(g, 'The ' + F.name.toLowerCase() + ''); ended = true; }
else this.push(g, '' + F.name.toLowerCase() + ' drags on.');
}
if (!ended) {
const esc = cur.esc + 1;
if (esc >= 3) { this.addEv(g, [-2, 0.5, 0, 0.5, -6, 10], 0.2); this.push(g, ''); }
else g.carry.push({ k: 'crisis', fac: cur.fac, pol: cur.pol, st: cur.st, esc: esc });
}
}
g.inc.shift();
if (!g.inc.length) this.toBrief(g);
}
odds(m, c, R) { return this.clamp(0.45 + m.a / 250 + 0.08 * c.esc + R.nego, 0.2, 0.9); }
toBrief(g) {
g.phase = 'brief';
const m = this.M(g);
g.over = (m.u >= this.role(g).over || m.a <= 8);
if (!g.news.length) this.push(g, '');
}
nextMorning(g) {
if (g.over || g.day >= 14) { g.phase = 'end'; return; }
g.day += 1; g.phase = 'desk';
g.ds0 = g.ds; g.ds = this.M(g);
g.flash = []; g.news = []; g.todayPol = [];
this.deal(g);
}
scoreCard(g) {
const m = this.M(g), nd = this.needle(g), cl = (v) => this.clamp(v, 0, 100);
const sub = { econ: cl(50 + 10 * m.g), jobs: cl(50 - 15 * (m.j - 4.3)), prices: cl(100 - 18 * Math.abs(m.i - 2)), budget: cl(100 - 7 * (m.d - 1)), appr: cl(m.a), calm: cl(100 - 1.25 * m.u) };
const obj = 0.25 * sub.econ + 0.20 * sub.jobs + 0.15 * sub.prices + 0.15 * sub.budget + 0.15 * sub.appr + 0.10 * sub.calm;
const score = Math.round(this.clamp(200 + (obj - 35) * 16, 0, 1000) * (g.over ? 0.6 : 1) + (g.over ? 0 : 50));
const cons = 0.30 * nd + 0.20 * sub.budget + 0.20 * sub.prices + 0.20 * sub.econ + 0.10 * sub.calm;
const lib = 0.25 * (100 - nd) + 0.25 * sub.jobs + 0.15 * sub.prices + 0.15 * sub.appr + 0.10 * sub.econ + 0.10 * sub.calm;
return { m: m, nd: nd, sub: sub, obj: obj, score: score, cons: cons, lib: lib };
}
grade(v) {
const t = [[90, 'A', 'A'], [85, 'A−', 'A'], [80, 'B+', 'B'], [75, 'B', 'B'], [70, 'B−', 'B'], [65, 'C+', 'C'], [60, 'C', 'C'], [55, 'C−', 'C'], [50, 'D+', 'D'], [45, 'D', 'D'], [40, 'D−', 'D']];
for (let i = 0; i < t.length; i++) if (v >= t[i][0]) return { letter: t[i][1], band: t[i][2] };
return { letter: 'F', band: 'F' };
}
}
export function hashStr(s) {
let h = 2166136261 >>> 0;
for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
return h & 0x7fffffff; // positive 31-bit
}
export const dailySeed = (dateStr) => hashStr('gias-daily-' + dateStr);
export const utcDate = (d = new Date()) => d.toISOString().slice(0, 10);
export function begin(eng, seed, role) {
const g = eng.newGame(seed); g.title = role;
g.phase = 'desk'; g.day = 1; g.ds = eng.M(g); g.ds0 = g.ds; eng.deal(g);
return g;
}
export function applyAction(eng, g, a) {
if (a === 's' || a === 'v') {
if (g.phase !== 'desk' || !g.memos[g.mi]) throw new Error('bad memo action');
g.memos[g.mi].dec = a === 's' ? 'sign' : 'veto'; g.mi += 1;
if (g.mi >= g.memos.length) eng.endDay(g);
} else if (a === 'q') {
if (g.phase !== 'desk' || g.memos.length) throw new Error('');
eng.endDay(g);
} else if (a >= '0' && a <= '3' && a.length === 1) {
if (g.phase !== 'incident') throw new Error('');
eng.resolveIncident(g, +a);
} else if (a === 'n') {
if (g.phase !== 'brief') throw new Error('bad next action');
eng.nextMorning(g);
} else throw new Error('unknown action ' + a);
return g;
}
export function runLog(seed, role, log) {
const eng = new Engine();
if (!eng.data().TITLES.some((t) => t.id === role)) throw new Error('unknown role');
if (typeof log !== 'string' || log.length > 400) throw new Error('bad log');
const g = begin(eng, seed, role);
for (const a of log) { if (g.phase === 'end') throw new Error(''); applyAction(eng, g, a); }
if (g.phase !== 'end') throw new Error('');
const sc = eng.scoreCard(g);
return { g, sc, cons: eng.grade(sc.cons).letter, lib: eng.grade(sc.lib).letter, needle: Math.round(sc.nd) };
}
