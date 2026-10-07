
const XA = [
{ id: 'consumptax', cat: 'tax', t: '', m: '', lean: 3, cost: 4, f: [0.5, -0.1, 0.8, 2.5, -4, 3], sd: 0.9, ang: ['retirees', 0.3], who: ['TN', 'LA', 'AR', 'WA'], wd: -2, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'nocorptax', cat: 'tax', t: '', m: '', lean: 3, cost: 3, f: [0.9, -0.2, 0.1, 1.6, -2, 2], sd: 0.7, ang: null, who: ['DE', 'NY', 'NV'], wd: 0, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'top90', cat: 'tax', t: '', m: '', lean: -3, cost: 4, f: [-1, 0.2, 0, -0.8, 1, 3], sd: 0.9, ang: ['business', 0.5], who: ['NY', 'CA', 'CT', 'MA'], wd: -3, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'stocktax', cat: 'tax', t: '', m: '', lean: -2, cost: 3, f: [-0.3, 0.1, 0, -0.6, 2, 1], sd: 0.8, ang: ['business', 0.35], who: ['NY', 'CT', 'NJ', 'IL'], wd: -3, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'natvat', cat: 'tax', t: '', m: '', lean: 1, cost: 3, f: [0.1, 0, 0.7, -1.5, -3, 2], sd: 0.6, ang: ['retirees', 0.2], who: ['OR', 'NH', 'MT', 'DE'], wd: -4, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'nopayrollcap', cat: 'tax', t: '', m: '', lean: -2, cost: 3, f: [-0.3, 0.1, 0, -0.9, 2, 1], sd: 0.6, ang: ['business', 0.3], who: ['NY', 'CA', 'CT', 'MA'], wd: -2, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'startuphol', cat: 'tax', t: '', m: '', lean: 2, cost: 2, f: [0.3, -0.2, 0, 0.3, 1, 0], sd: 0.7, ang: null, who: ['UT', 'TX', 'CO', 'FL'], wd: 2, scand: 0, cong: -4, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'windfall', cat: 'tax', t: '', m: '', lean: -2, cost: 3, f: [-0.3, 0.1, 0.1, -0.5, 3, 1], sd: 0.7, ang: ['energy', 0.5], who: ['TX', 'LA', 'ND', 'OK', 'AK'], wd: -4, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'nopubunion', cat: 'labor', t: '', m: '', lean: 2, cost: 3, f: [0.1, 0, -0.1, -0.2, -3, 4], sd: 0.7, ang: ['labor', 0.6], who: ['WI', 'OH', 'NY', 'IL'], wd: -4, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'nounions', cat: 'labor', t: 'Ban all unions', m: '', lean: 3, cost: 4, f: [0.3, -0.1, -0.1, 0, -6, 7], sd: 0.9, ang: ['labor', 0.7], who: ['MI', 'OH', 'PA', 'WA', 'IL'], wd: -6, scand: 0, cong: -7, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'nominwage', cat: 'labor', t: '', m: '', lean: 3, cost: 3, f: [0.3, -0.3, -0.1, -0.1, -6, 4], sd: 0.7, ang: ['labor', 0.5], who: ['MS', 'AL', 'LA', 'GA', 'TN'], wd: -4, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'wagefreeze', cat: 'labor', t: '', m: '', lean: -3, cost: 4, f: [-0.8, 0.3, -1.2, 0, 3, 4], sd: 0.9, ang: ['business', 0.5], who: ['TX', 'OH', 'IL', 'CA'], wd: 1, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'fourday', cat: 'labor', t: '', m: '', lean: -2, cost: 3, f: [-0.2, -0.2, 0.2, 0.2, 5, 1], sd: 0.8, ang: ['business', 0.4], who: ['WA', 'MA', 'CA', 'CO'], wd: 3, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'ceocap', cat: 'labor', t: '', m: '', lean: -2, cost: 3, f: [-0.1, 0, 0, -0.2, 5, 1], sd: 0.7, ang: ['business', 0.45], who: ['NY', 'CT', 'CA', 'IL'], wd: -2, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'job20', cat: 'labor', t: '', m: '', lean: -3, cost: 4, f: [0.1, -1.4, 0.8, 3, 4, -1], sd: 0.9, ang: ['business', 0.3], who: ['MS', 'AL', 'KY', 'WV', 'LA'], wd: 4, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'otoptout', cat: 'labor', t: '', m: '', lean: 2, cost: 3, f: [0.2, -0.1, 0, 0, -4, 3], sd: 0.6, ang: ['labor', 0.45], who: ['TX', 'OH', 'PA', 'MI'], wd: -3, scand: 0, cong: -4, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'endrc', cat: 'housing', t: '', m: '', lean: 2, cost: 3, f: [0.2, 0, 0.1, 0, -4, 4], sd: 0.7, ang: ['urban', 0.5], who: ['NY', 'CA', 'OR', 'MA', 'NJ'], wd: -4, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'nozoning', cat: 'housing', t: '', m: '', lean: 3, cost: 4, f: [0.9, -0.3, -0.5, 0, -2, 4], sd: 0.9, ang: ['urban', 0.35], who: ['CA', 'MA', 'NY', 'CO', 'WA'], wd: -2, scand: 0, cong: -7, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'emptyhomes', cat: 'housing', t: '', m: '', lean: -3, cost: 4, f: [0.1, 0, -0.4, 0.3, 3, 3], sd: 0.9, ang: ['business', 0.5], who: ['NY', 'FL', 'NV', 'AZ', 'CA'], wd: -2, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'nocorplord', cat: 'housing', t: '', m: '', lean: -2, cost: 3, f: [-0.1, 0, 0.1, 0, 3, 2], sd: 0.7, ang: ['business', 0.35], who: ['GA', 'TX', 'NC', 'AZ', 'FL'], wd: 1, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'nolicense', cat: 'housing', t: '', m: '', lean: 3, cost: 3, f: [0.5, -0.4, -0.2, 0, 0, 2], sd: 0.8, ang: ['labor', 0.3], who: ['LA', 'CA', 'AZ', 'NV'], wd: 1, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'nobuyback', cat: 'housing', t: '', m: '', lean: -2, cost: 3, f: [-0.2, 0, 0, 0, 3, 1], sd: 0.6, ang: ['business', 0.3], who: ['NY', 'CA', 'WA', 'TX'], wd: -1, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'techbreak', cat: 'housing', t: '', m: '', lean: -2, cost: 4, f: [-0.3, 0.1, 0.1, 0, 2, 2], sd: 0.9, ang: ['business', 0.4], who: ['CA', 'WA', 'TX', 'VA'], wd: -3, scand: 0, cong: -4, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'fdaopen', cat: 'housing', t: '', m: '', lean: 3, cost: 3, f: [0.3, 0, -0.1, -0.1, 1, 3], sd: 0.9, ang: null, who: ['MD', 'NC', 'MA', 'NJ'], wd: -1, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'railnat', cat: 'trade', t: '', m: '', lean: -3, cost: 4, f: [-0.2, 0.1, 0, 1.2, 1, 2], sd: 0.8, ang: ['business', 0.4], who: ['NE', 'IL', 'GA', 'FL'], wd: -1, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'banknat', cat: 'trade', t: '', m: '', lean: -3, cost: 4, f: [-0.8, 0.3, 0, 1.5, 0, 3], sd: 0.9, ang: ['business', 0.6], who: ['NY', 'NC', 'CA', 'CT'], wd: -3, scand: 0, cong: -7, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'tariff40', cat: 'trade', t: '', m: '', lean: -1, cost: 4, f: [-1.3, 0.4, 1.4, -2, -5, 4], sd: 0.8, ang: ['farmers', 0.6], who: ['IA', 'NE', 'KS', 'WA', 'MI'], wd: -5, scand: 0, cong: -7, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'freetrade', cat: 'trade', t: '', m: '', lean: 3, cost: 3, f: [0.6, 0.2, -0.6, 0.4, -2, 3], sd: 0.8, ang: ['labor', 0.4], who: ['MI', 'OH', 'PA', 'IN', 'NC'], wd: -4, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'postsell', cat: 'trade', t: '', m: '', lean: 2, cost: 2, f: [0.1, 0.1, 0, -0.1, -3, 2], sd: 0.6, ang: ['labor', 0.4], who: ['MT', 'WY', 'AK', 'ND', 'VT'], wd: -4, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'parksoil', cat: 'trade', t: '', m: '', lean: 2, cost: 3, f: [0.1, -0.1, -0.1, -0.2, -6, 6], sd: 0.8, ang: ['urban', 0.4], who: ['WY', 'UT', 'AK', 'MT', 'CO'], wd: -3, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'gasban', cat: 'trade', t: '', m: '', lean: -2, cost: 4, f: [-0.6, 0.3, 0.4, 0.3, -3, 4], sd: 0.9, ang: ['energy', 0.55], who: ['MI', 'OH', 'TX', 'LA', 'WY'], wd: -4, scand: 0, cong: -7, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'drillall', cat: 'trade', t: '', m: '', lean: 3, cost: 3, f: [0.4, -0.2, -0.3, -0.2, 0, 4], sd: 0.7, ang: ['urban', 0.3], who: ['TX', 'ND', 'NM', 'LA', 'AK'], wd: 4, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'hushmoney', cat: 'power', t: '', m: '', lean: 0, cost: 3, f: [-0.1, 0, 0, 0.1, -1, -5], sd: 0.8, ang: null, who: ['VA', 'MD', 'NY'], wd: -2, scand: 14, cong: -2, catch: 0.5, dark: true, shield: 8, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'pardonally', cat: 'power', t: '', m: '', lean: 0, cost: 2, f: [0, 0, 0, 0, -3, 1], sd: 0.6, ang: null, who: ['NY', 'FL', 'IL', 'VA'], wd: -2, scand: 10, cong: 4, catch: 0.4, dark: true, shield: 10, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'fedfire', cat: 'power', t: '', m: '', lean: 0, cost: 4, f: [0.6, -0.3, 1.2, 0.2, 1, 1], sd: 0.9, ang: ['retirees', 0.3], who: ['NY', 'CA', 'IL', 'MA'], wd: -2, scand: 10, cong: -7, catch: 0.25, dark: true, shield: 0, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'emergency', cat: 'power', t: '', m: '', lean: 0, cost: 4, f: [-0.2, 0, 0.1, 0.3, 0, 2], sd: 0.9, ang: ['urban', 0.4], who: ['TX', 'AZ', 'CA', 'NY'], wd: -2, scand: 8, cong: -6, catch: 0.25, dark: true, shield: 0, capGain: 3, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'presspurch', cat: 'power', t: '', m: '', lean: 0, cost: 3, f: [-0.1, 0, 0, 0.2, 5, -3], sd: 0.8, ang: null, who: ['NY', 'IL', 'CA', 'FL'], wd: -1, scand: 18, cong: -4, catch: 0.6, dark: true, shield: 8, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'auditcrit', cat: 'power', t: '', m: '', lean: 0, cost: 3, f: [0, 0, 0, -0.2, 0, -3], sd: 0.7, ang: ['business', 0.4], who: ['NY', 'CA', 'TX', 'FL'], wd: -2, scand: 16, cong: -5, catch: 0.5, dark: true, shield: 6, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'packcourts', cat: 'power', t: '', m: '', lean: 0, cost: 4, f: [-0.3, 0, 0, 0, -2, 4], sd: 0.9, ang: ['urban', 0.4], who: ['TX', 'CA', 'NY', 'FL'], wd: -2, scand: 8, cong: -7, catch: 0.25, dark: true, shield: 4, capGain: 0, real: '', pro: '', con: '', hl: '', hlx: ['', ''] },
{ id: 'cronies', cat: 'power', t: '', m: '', lean: 0, cost: 4, f: [-0.4, 0.1, 0.2, 0.4, 0, -1], sd: 0.9, ang: null, who: ['NY', 'TX', 'LA', 'DE'], wd: -2, scand: 22, cong: 6, catch: 0.6, dark: true, shield: 10, capGain: 2, real: '', pro: '', con: '', hl: '', hlx: ['', ''] }
];
export const ENGINE_VERSION = 2;
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
const TITLES = [{ id: 'President', label: 'President', tag: '', mods: { sdm: 0.75, nego: 0.10, back: 0.5, cap: 1.3 } }];
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
XA.forEach((x) => { HL[x.id] = x.hlx; });
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
this._D = { KEYS, POL, XA, DIS_OPTS, EV, FAC, ST, TITLES, HL, EVHL, FACHL, OUT, PUNDL, PUNDR, SUPQ, OPPQ, ECON, PUND, QUIPS };
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
pol(id) { const D = this.data(); return D.POL.find((p) => p.id === id) || D.XA.find((p) => p.id === id); }
newGame(seed) {
const D = this.data();
const g = { rs: seed | 0, day: 1, phase: 'title', title: 'President', memos: [], pols: [], evs: [], hits: [], vet: {}, sched: {}, inc: [], carry: [], flash: [], news: [], todayPol: [], over: false, ok: '', bond: false, riot: false, ds: null, ds0: null, mi: 0,
cap: 5, cong: 50, scand: 0, imp: null, trials: 0, lastTrial: -9, trialDay: 0, rev: 0, revDay: -9, surv: false, shield: 0, xToday: false, xpend: null, xdone: [], press: [], sidc: 0 };
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
M(g, ex) {
const X = ex || 0;
const R = this.role(g);
const ps = [0, 0, 0, 0, 0, 0], es = [0, 0, 0, 0, 0, 0];
g.pols.forEach((p) => {
if (p.rep) return;
const n = this.nights(g, p.d) + X; if (n <= 0) return;
const r = (1 - Math.pow(0.5, n)) * p.s;
for (let k = 0; k < 6; k++) ps[k] += p.f[k] * r;
});
g.evs.forEach((e) => {
const n = this.nights(g, e.d) + X; if (n <= 0) return;
const r = Math.pow(0.7, n - 1);
for (let k = 0; k < 6; k++) es[k] += e.f[k] * r;
});
const sum = [0, 1, 2, 3, 4, 5].map((k) => ps[k] * R.pf * (k === 0 ? R.gf : k === 3 ? R.df : 1) + es[k] * R.evm);
const jobless = Math.max(2.0, 4.3 + sum[1]);
const infl = Math.max(-1, 3.0 + sum[2]);
const gdp0 = sum[0];
const deficit0 = 5.8 + sum[3] - 0.25 * gdp0;
const appr = this.clamp(48 + R.ab + sum[4] - 2.2 * R.ja * (jobless - 4.3) - 2.0 * (infl - 3.0) + 1.0 * gdp0 - 0.4 * Math.max(0, deficit0 - 12) - 0.06 * g.scand, 3, 92);
const unrest = this.clamp(15 + R.ub + sum[5] + 0.45 * Math.max(0, 45 - appr), 0, 100);
const gdp = gdp0 - 0.02 * Math.max(0, unrest - 40);
return { g: gdp, j: jobless, i: infl, d: 5.8 + sum[3] - 0.25 * gdp, a: appr, u: unrest };
}
role() { return { pf: 1, gf: 1, df: 1, sdm: 0.75, evm: 1, ab: 0, ub: 0, ja: 1, nego: 0.10, back: 0.5, cap: 1.3, over: 95, angm: {} }; }
congMult(g) { return 0.85 + 0.003 * g.cong; }
scaled(g, f) { const c = this.congMult(g); return f.map((x) => x * c); }
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
const supq = this.pick(g, D.SUPQ), oppq = this.pick(g, D.OPPQ);
const para2 = sup.name + ' of the ' + sup.org + ' cheered: "' + supq + '" ' + opp.name + ' of the ' + opp.org + ' replied: "' + oppq + '"';
const para3 = '' + p.pro + ' Critics say: ' + p.con;
const ed = planned ? [{ s: 'L', by: sup.name, org: sup.org, q: supq }, { s: 'R', by: opp.name, org: opp.org, q: oppq }] : [{ s: 'L', by: opp.name, org: opp.org, q: oppq }, { s: 'R', by: sup.name, org: sup.org, q: supq }];
return { k: 'pol', h: h, o: this.outlet(g, slant), b: [para1, para2, para3, this.pick(g, D.ECON)], ed: ed, t: p.t, pid: p.id };
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
addNews(g, st) { st.sid = g.sidc; g.sidc += 1; st.day = g.day; g.news.push(st); g.press.unshift(st); if (g.press.length > 36) g.press.length = 36; }
push(g, h, ctx) { this.addNews(g, this.note(g, h, ctx)); }
endDay(g) {
const D = this.data();
g.news = []; g.todayPol = []; g.flash = [];
const cm = this.congMult(g);
g.memos.forEach((mm) => {
const p = this.pol(mm.id);
if (mm.dec === 'sign') {
g.cong = this.clamp(g.cong + 1, 0, 100);
const f = p.f.map((x) => x * cm * (1 + (this.rn(g) * 2 - 1) * p.sd * this.role(g).sdm));
g.pols.push({ id: p.id, d: g.day, f: f, rep: false, s: 1 });
g.todayPol.push(p.id);
this.addNews(g, this.polStory(g, p, f));
g.hits.push({ d: g.day, st: p.who, v: p.wd, l: p.t });
} else {
g.vet[p.id] = g.day;
g.cong = this.clamp(g.cong - 1.5, 0, 100);
}
});
if (g.xpend) {
const x = this.pol(g.xpend);
const f = x.f.map((v) => v * (1 + (this.rn(g) * 2 - 1) * x.sd * this.role(g).sdm));
g.pols.push({ id: x.id, d: g.day, f: f, rep: false, s: 1, x: true });
g.todayPol.push(x.id);
this.addNews(g, this.polStory(g, x, f));
g.hits.push({ d: g.day, st: x.who, v: x.wd, l: x.t });
g.scand = this.clamp(g.scand + x.scand, 0, 100);
g.cong = this.clamp(g.cong + x.cong, 0, 100);
g.shield += x.shield; g.cap = Math.min(8, g.cap + x.capGain);
if (x.dark && this.rn(g) < x.catch) {
g.scand = this.clamp(g.scand + 15, 0, 100);
g.cong = this.clamp(g.cong - 5, 0, 100);
this.push(g, '' + x.t + '"', '');
}
g.xdone.push(x.id); g.xpend = null;
}
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
this.addNews(g, this.evStory(g, sid, e.st));
} else if (m.d > 14 && !g.bond) {
g.bond = true;
const ev = D.EV.bond; const e = { k: 'event', id: 'bond', st: this.pick(g, ev.st) };
g.inc.push(e); this.addEv(g, ev.base, 0.2);
g.flash.push({ st: e.st, icon: ev.icon });
this.addNews(g, this.evStory(g, 'bond', e.st));
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
this.addNews(g, this.crisisStory(g, c));
g.flash.push({ st: c.st, icon: F.icon });
}
resolveIncident(g, i) {
const D = this.data();
const cur = g.inc[0];
if (cur.k === 'revolt') {
const hold = () => this.clamp(0.55 - g.scand / 300, 0.25, 0.65);
if (i === 0) {
if (this.rn(g) < hold()) { this.addEv(g, [-0.5, 0, 0, 0, -8, -25], 0.2); g.scand = this.clamp(g.scand + 10, 0, 100); this.push(g, '', ''); }
else { g.over = true; g.ok = 'coup'; this.push(g, '', ''); }
} else if (i === 1) {
const last = g.pols.slice().reverse().find((q) => !q.rep);
if (last) { last.rep = true; this.push(g, 'You repeal "' + this.pol(last.id).t + '', ''); }
else this.push(g, '', '');
this.addEv(g, [0, 0, 0, 0.8, 4, -28], 0.2); g.cong = this.clamp(g.cong - 4, 0, 100);
} else if (i === 2) {
g.over = true; g.ok = 'fled'; this.push(g, '', '');
} else if (i === 3) {
if (g.cap < 3) throw new Error('');
g.cap -= 3; g.scand = this.clamp(g.scand + 20, 0, 100);
if (this.rn(g) < 0.7) { this.addEv(g, [0, 0, 0.4, 1.5, 0, -22], 0.2); this.push(g, '', ''); }
else { this.addEv(g, [0, 0, 0, 0, -5, 6], 0.2); g.cong = this.clamp(g.cong - 5, 0, 100); this.push(g, '', ''); }
} else throw new Error('');
g.inc.shift();
if (g.over) g.inc = [];
if (!g.inc.length) this.toBrief(g);
return;
}
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
if (!g.over) {
if (m.u >= 98 && g.rev >= 2) { g.over = true; g.ok = 'coup'; this.push(g, '', ''); }
else if (m.u >= 88 && g.rev < 2 && g.day - g.revDay >= 3) {
g.rev += 1; g.revDay = g.day; g.inc.push({ k: 'revolt' }); g.phase = 'incident';
this.push(g, '', '');
return;
}
}
if (!g.over) {
if (g.imp && g.imp.st === 'warn' && g.imp.w < g.day) g.imp.st = 'trial';
if (!g.imp && g.trials < 2 && g.day >= 3 && g.day - g.lastTrial > 4 && m.a < 28 && g.cong < 25) {
g.trials += 1;
g.imp = { st: 'warn', w: g.day, r: 0, conv: this.clamp(Math.round(38 + (30 - g.cong) * 0.9 + (32 - m.a) * 0.6 + g.scand * 0.25 - g.shield), 22, 78) };
this.push(g, '', '');
} else if (g.imp && g.imp.st === 'trial' && g.trialDay !== g.day) { g.phase = 'trial'; return; }
}
if (!g.news.length) this.push(g, '');
}
verdict(g) {
const imp = g.imp;
if (imp.conv >= 67) { imp.done = true; g.over = true; g.ok = 'impeach'; this.push(g, '', ''); }
else {
g.surv = true; g.lastTrial = g.day; g.imp = null;
this.addEv(g, [0, 0, 0, 0, 3, 0], 0.2);
if (g.scand > 45) { this.addEv(g, [-0.4, 0, 0, 0, -4, g.scand * 0.15], 0.2); this.push(g, '', ''); }
else this.push(g, '', '');
}
}
resolveTrial(g, i) {
const imp = g.imp;
if (g.phase !== 'trial' || !imp) throw new Error('no trial');
const m = this.M(g);
let d = this.clamp((45 - m.a) * 0.15, -4, 6) + (g.scand > 40 ? 3 : 0);
const pay = (c) => { if (g.cap < c) throw new Error(''); g.cap -= c; };
if (i === 0) {
pay(1); this.addEv(g, [0, 0, 0, 0, 5, 2], 0.2); d -= 6;
this.push(g, '', '');
} else if (i === 1) {
const last = g.pols.slice().reverse().find((q) => !q.rep && !q.x);
g.cong = this.clamp(g.cong + 6, 0, 100);
if (last) { last.s = Math.min(last.s, 0.5); d -= 10; this.push(g, '' + this.pol(last.id).t + '" to win votes', ''); }
else { this.addEv(g, [0, 0, 0, 0.6, 1, 0], 0.2); d -= 6; this.push(g, '', ''); }
} else if (i === 2) {
pay(2); g.scand = this.clamp(g.scand + 12, 0, 100);
if (this.rn(g) < 0.65 - g.scand / 400) { d -= 22; this.push(g, '', ''); }
else { d += 4; g.scand = this.clamp(g.scand + 20, 0, 100); this.push(g, '', ''); }
} else if (i === 3) {
pay(1);
if (this.rn(g) < 0.55 - g.scand / 400) { d -= 18; g.scand = this.clamp(g.scand + 15, 0, 100); g.cong = this.clamp(g.cong - 8, 0, 100); this.push(g, '', ''); }
else { d += 6; g.scand = this.clamp(g.scand + 25, 0, 100); this.push(g, '', ''); }
} else throw new Error('');
imp.conv = this.clamp(imp.conv + d, 0, 100); imp.r += 1;
g.trialDay = g.day;
if (imp.r >= 3) this.verdict(g);
this.toBrief(g);
}
nextMorning(g) {
if (g.imp && !g.imp.done && g.imp.st === 'trial' && g.day >= 14 && !g.over) this.verdict(g);
if (g.over || g.day >= 14) { g.phase = 'end'; return; }
g.day += 1; g.phase = 'desk';
g.cap = Math.min(8, g.cap + 1); g.xToday = false;
const m0 = this.M(g);
g.cong = this.clamp(g.cong + 0.08 * (m0.a - 50) + 0.03 * (50 - g.cong) - 0.05 * Math.max(0, g.scand - 30), 0, 100);
g.scand = Math.max(0, g.scand - 1.5);
g.ds0 = g.ds; g.ds = this.M(g);
g.flash = []; g.news = []; g.todayPol = [];
this.deal(g);
}
scoreCard(g) {
const m = this.M(g), pj = this.M(g, 10), nd = this.needle(g), cl = (v) => this.clamp(v, 0, 100);
const mb = {}; ['g', 'j', 'i', 'd', 'a', 'u'].forEach((k) => { mb[k] = 0.4 * m[k] + 0.6 * pj[k]; });
const sub = { econ: cl(50 + 10 * mb.g), jobs: cl(50 - 15 * (mb.j - 4.3)), prices: cl(100 - 18 * Math.abs(mb.i - 2)), budget: cl(100 - 7 * (mb.d - 1)), appr: cl(mb.a), calm: cl(100 - 1.25 * mb.u) };
const obj = 0.25 * sub.econ + 0.20 * sub.jobs + 0.15 * sub.prices + 0.15 * sub.budget + 0.15 * sub.appr + 0.10 * sub.calm;
const pen = Math.round(0.8 * Math.max(0, g.scand - 20));
const bonus = g.surv && !g.over ? 40 : 0;
const score = Math.max(0, Math.round(this.clamp(200 + (obj - 35) * 16, 0, 1000) * (g.over ? 0.6 : 1) + (g.over ? 0 : 50) + bonus - pen));
const cons = 0.30 * nd + 0.20 * sub.budget + 0.20 * sub.prices + 0.20 * sub.econ + 0.10 * sub.calm;
const lib = 0.25 * (100 - nd) + 0.25 * sub.jobs + 0.15 * sub.prices + 0.15 * sub.appr + 0.10 * sub.econ + 0.10 * sub.calm;
return { m: m, pj: pj, mb: mb, nd: nd, sub: sub, obj: obj, pen: pen, bonus: bonus, score: score, cons: cons, lib: lib };
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
export const XIDX = Array.from({ length: 62 }, (_, i) => String.fromCharCode(i < 26 ? 65 + i : i < 52 ? 71 + i : i - 4)).join('');
export function tokens(log) {
const out = [];
for (let i = 0; i < log.length; i++) {
if (log[i] === 'x') { if (i + 1 >= log.length) throw new Error('bad log'); out.push('x' + log[i + 1]); i += 1; } else out.push(log[i]);
}
return out;
}
export function begin(eng, seed, role) {
const g = eng.newGame(seed); g.title = 'President';
g.phase = 'desk'; g.day = 1; g.ds = eng.M(g); g.ds0 = g.ds; eng.deal(g);
return g;
}
export function applyAction(eng, g, a) {
if (a === 's' || a === 'v') {
if (g.phase !== 'desk' || !g.memos[g.mi]) throw new Error('bad memo action');
g.memos[g.mi].dec = a === 's' ? 'sign' : 'veto'; g.mi += 1;
} else if (a === 'e') {
if (g.phase !== 'desk' || g.mi < g.memos.length) throw new Error('bad end action');
eng.endDay(g);
} else if (a.length === 2 && a[0] === 'x') {
const D = eng.data(); const x = D.XA[XIDX.indexOf(a[1])];
if (g.phase !== 'desk' || !x || g.xToday || g.cap < x.cost || g.xdone.indexOf(x.id) >= 0) throw new Error('');
g.cap -= x.cost; g.xToday = true; g.xpend = x.id;
} else if (a >= '0' && a <= '3' && a.length === 1) {
if (g.phase === 'incident') eng.resolveIncident(g, +a);
else if (g.phase === 'trial') eng.resolveTrial(g, +a);
else throw new Error('');
} else if (a === 'n') {
if (g.phase !== 'brief') throw new Error('bad next action');
eng.nextMorning(g);
} else throw new Error('unknown action ' + a);
return g;
}
export function runLog(seed, role, log) {
const eng = new Engine();
if (!eng.data().TITLES.some((t) => t.id === role)) throw new Error('unknown role');
if (typeof log !== 'string' || log.length > 600) throw new Error('bad log');
const g = begin(eng, seed, role);
for (const a of tokens(log)) { if (g.phase === 'end') throw new Error(''); applyAction(eng, g, a); }
if (g.phase !== 'end') throw new Error('');
const sc = eng.scoreCard(g);
return { g, sc, cons: eng.grade(sc.cons).letter, lib: eng.grade(sc.lib).letter, needle: Math.round(sc.nd) };
}
