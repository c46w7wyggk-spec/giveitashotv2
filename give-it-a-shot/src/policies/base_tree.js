// Tree data for the original desk bills and executive actions (their text lives in engine.js / xactions.js).
// TOPIC groups bills so the desk never deals two of the same topic back to back.
// SYS = systems a bill depends on; KILL = systems it abolishes. A bill and an action that conflict this way can never both be law.
// System names: inctax (the income tax exists), deduct (tax deductions exist), corp (corporate income tax exists),
// unions (private-sector unions exist), postal (the Postal Service exists), privins (private health insurance exists).
export const BASE_TOPIC = {
  mw15: 'Labor', mw0: 'Labor', nominwage: 'Labor', wagefreeze: 'Labor', fourday: 'Labor', ceocap: 'Labor', job20: 'Labor', otoptout: 'Labor', norw: 'Labor', rtw: 'Labor', nopubunion: 'Labor', nounions: 'Labor', jobg: 'Labor',
  sp: 'Health', hsa: 'Health', fdaopen: 'Health',
  rc: 'Housing', endrc: 'Housing', zone: 'Housing', nozoning: 'Housing', emptyhomes: 'Housing', nocorplord: 'Housing', land: 'Housing',
  top70: 'Taxes', top90: 'Taxes', wealth: 'Taxes', cg0: 'Taxes', flat: 'Taxes', corp15: 'Taxes', consumptax: 'Taxes', nocorptax: 'Taxes', stocktax: 'Taxes', natvat: 'Taxes', nopayrollcap: 'Taxes', startuphol: 'Taxes', windfall: 'Taxes',
  debt: 'Education', college: 'Education', vouch: 'Education', prek: 'Education',
  gascap: 'Energy', frack: 'Energy', carbon: 'Energy', parksoil: 'Energy', gasban: 'Energy', drillall: 'Energy',
  ubi: 'Welfare', ssx: 'Retirement', ssp: 'Retirement', age69: 'Retirement',
  tar25: 'Trade', trade: 'Trade', visa: 'Immigration', tariff40: 'Trade', freetrade: 'Trade', railnat: 'Transport', postsell: 'Trade',
  ccap: 'Finance', banknat: 'Finance', cut10: 'Budget', infra: 'Transport',
  lic: 'Labor', nolicense: 'Labor', permit: 'Environment', regs: 'Environment', techbreak: 'Tech',
  hushmoney: 'Power', pardonally: 'Power', fedfire: 'Power', emergency: 'Power', presspurch: 'Power', auditcrit: 'Power', packcourts: 'Power', cronies: 'Power'
};
export const BASE_SYS = {
  top70: ['inctax'], top90: ['inctax'], cg0: ['inctax'], flat: ['inctax'], corp15: ['corp'], startuphol: ['inctax'], stocktax: [],
  norw: ['unions'], rtw: ['unions'], nopubunion: ['unions'], hsa: ['privins'], windfall: [], nopayrollcap: ['inctax']
};
export const BASE_KILL = {
  consumptax: ['inctax', 'deduct'], flat: ['deduct'], nocorptax: ['corp'], nounions: ['unions'], postsell: ['postal'], sp: ['privins']
};
