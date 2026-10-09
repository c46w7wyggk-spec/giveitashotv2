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
  ccap: 'Finance', banknat: 'Finance', cut10: 'Budget', impound: 'Budget', pentcut: 'Budget', hirefreeze: 'Budget', infra: 'Transport',
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
// AP Macroeconomics units each bill is a good example for. A classroom session can focus the desk on one unit:
// u1 basic concepts (markets, price controls), u3 fiscal policy and AD-AS, u4 the financial sector,
// u5 long-run growth, deficits and debt, u6 the open economy. Unit 2 (indicators) is in every game.
export const AP_UNITS = {
  u1: ['mw15', 'mw0', 'rc', 'gascap', 'ccap', 'payday', 'insulincap', 'mwindex', 'mwregion', 'tippedwage', 'sugar', 'zone', 'lic', 'scopeprac',
    'certneed', 'farmsub', 'cropins', 'jonesact', 'noncompete', 'carbon', 'tolls', 'parkmin', 'gasholiday', 'repair', 'evtax'],
  u3: ['top70', 'wealth', 'jobg', 'ubi', 'ssx', 'infra', 'cg0', 'flat', 'stdded', 'salt', 'taxfree', 'payrollhol', 'cut10', 'defcut', 'defup',
    'eitc', 'ctc', 'prebate', 'firsthome', 'hsr', 'gridfund', 'portinfra', 'waterinfra', 'transitfund', 'broadband', 'windrebate', 'uireform',
    'estate', 'progbrk', 'minimumtax', 'teacherpay', 'college', 'debt', 'prek', 'meals', 'ccollege', 'tenantaid', 'housevoucher', 'lihtc',
    'aca', 'medadv', 'corp15', 'eitcless', 'ctcmonth', 'sstrust', 'wildfire'],
  u4: ['ccap', 'capreq', 'dodd', 'fdic', 'cfpb', 'payday', 'bnplcap', 'postbank', 'crypto', 'creditscore', 'ipo', 'smallbiz', 'autoira', 'ssp',
    'cg0', 'dividendtax', 'cgindex', 'unrealized'],
  u5: ['balbud', 'imprec', 'cut10', 'ssfix', 'age69', 'ssp', 'sstrust', 'corp15', 'rdcredit', 'visa', 'permit', 'regs', 'zone', 'lic',
    'tradeschool', 'stem', 'jobtrain', 'apprentice', 'prek', 'infra', 'gridfund', 'broadband', 'irsup', 'irsdown', 'closeloop', 'dreamers',
    'seasonal', 'defup', 'nukesub', 'noncompete', 'collegecap', 'kinder'],
  u6: ['tar25', 'trade', 'targettariff', 'buyamerica', 'chips', 'pacpact', 'farmaid', 'bordercarbon', 'climateclub', 'visa', 'seasonal',
    'everify', 'profitshift', 'jonesact', 'taa'],
};
