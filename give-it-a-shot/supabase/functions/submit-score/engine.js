
const BASE_TOPIC = {
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
const BASE_SYS = {
top70: ['inctax'], top90: ['inctax'], cg0: ['inctax'], flat: ['inctax'], corp15: ['corp'], startuphol: ['inctax'], stocktax: [],
norw: ['unions'], rtw: ['unions'], nopubunion: ['unions'], hsa: ['privins'], windfall: [], nopayrollcap: ['inctax']
};
const BASE_KILL = {
consumptax: ['inctax', 'deduct'], flat: ['deduct'], nocorptax: ['corp'], nounions: ['unions'], postsell: ['postal'], sp: ['privins']
};
const AP_UNITS = {
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
const POL2 = [{id:'medneg',tp:'Health',lean:-1,f:[-0.1,0,0,-0.4,3,0],sd:0.5,ang:['business',0.25],who:['FL','AZ','ME'],wd:2,slot:['drugprice'],hlx:['','']},{id:'drugimport',tp:'Health',lean:1,f:[-0.05,0,-0.1,-0.1,1,0],sd:0.7,ang:null,who:['FL','VT','NH'],wd:1,hlx:['','']},{id:'pricetrans',tp:'Health',lean:1,f:[-0.05,0,-0.1,0,1,0],sd:0.5,ang:null,who:['UT','CO','TX'],wd:1,req:['hsa'],hlx:['','']},{id:'medadv',tp:'Health',lean:-1,f:[0,0,0,-0.6,-1,0],sd:0.5,ang:['business',0.3],who:['FL','AZ','TX'],wd:-2,sys:['privins'],hlx:['','']},{id:'pubop',tp:'Health',lean:-2,f:[-0.2,0.1,0,0.5,3,1],sd:0.8,ang:['business',0.35],who:['MN','CO','NY'],wd:2,slot:['healthsys'],sys:['privins'],hlx:['','']},{id:'medicare60',tp:'Health',lean:-2,f:[-0.1,0,0,0.5,3,0],sd:0.6,ang:['business',0.2],who:['FL','OH','PA'],wd:3,req:['~pubop'],slot:['healthsys'],hlx:['','']},{id:'formulary',tp:'Health',lean:-2,f:[-0.2,0.1,-0.1,-0.8,0,1],sd:0.6,ang:['business',0.4],who:['NJ','MA','PA'],wd:-1,req:['sp'],dl:2,hlx:['','']},{id:'hsaexp',tp:'Health',lean:1,f:[0.1,0,0,0.3,1,0],sd:0.5,ang:null,who:['UT','TX','AZ'],wd:1,req:['hsa'],sys:['privins','deduct'],hlx:['','']},{id:'scopeprac',tp:'Health',lean:1,f:[0.2,-0.1,-0.1,-0.1,-1,0],sd:0.5,ang:null,who:['GA','AL','MS'],wd:1,slot:['scope'],hlx:['','']},{id:'certneed',tp:'Health',lean:2,f:[0.2,-0.1,-0.1,0.1,0,0],sd:0.6,ang:null,who:['NC','TN','GA'],wd:0,hlx:['','']},{id:'medmal',tp:'Health',lean:2,f:[0.1,0,0,-0.1,-2,1],sd:0.6,ang:null,who:['NY','PA','IL'],wd:-1,hlx:['','']},{id:'telehealth',tp:'Health',lean:0,f:[0.1,0,0,0.2,2,0],sd:0.4,ang:null,who:['MT','WV','KS'],wd:2,hlx:['','']},{id:'nursefund',tp:'Health',lean:-1,f:[0.1,-0.1,0,0.3,2,0],sd:0.5,ang:null,who:['OH','NC','MI'],wd:2,hlx:['','']},{id:'sugar',tp:'Health',lean:-1,f:[-0.1,0,0.1,-0.3,-2,1],sd:0.5,ang:['business',0.25],who:['MS','AL','GA'],wd:-2,hlx:['','']},{id:'biotechip',tp:'Health',lean:1,f:[0.1,0,0.1,0.1,1,0],sd:0.5,ang:null,who:['MA','NC','CA'],wd:1,req:['medneg'],hlx:['','']},{id:'insulincap',tp:'Health',lean:-1,f:[0,0,0,0.1,3,0],sd:0.3,ang:null,who:['MS','WV','AL'],wd:2,sys:['privins'],hlx:['','']},{id:'aca',tp:'Health',lean:-1,f:[0.1,-0.1,0,0.5,3,0],sd:0.5,ang:null,who:['FL','TX','GA'],wd:3,sys:['privins','deduct'],hlx:['','']},{id:'charter',tp:'Education',lean:1,f:[0.1,0,0,0.1,0,1],sd:0.6,ang:['labor',0.2],who:['AZ','NY','LA'],wd:0,req:['~vouch'],hlx:['','']},{id:'voucheval',tp:'Education',lean:-1,f:[0.1,0,0,0.1,1,0],sd:0.4,ang:null,who:['WI','LA','OH'],wd:0,req:['vouch'],hlx:['','']},{id:'collegecap',tp:'Education',lean:-1,f:[0.1,0,0,0.4,1,0],sd:0.5,ang:null,who:['WI','MN','MA'],wd:1,req:['college'],dl:2,hlx:['','']},{id:'idr',tp:'Education',lean:-1,f:[0.1,0,0,0.3,2,0],sd:0.4,ang:null,who:['PA','OH','MI'],wd:1,req:['~debt'],hlx:['','']},{id:'kinder',tp:'Education',lean:-1,f:[0.1,-0.1,0,0.5,2,0],sd:0.5,ang:null,who:['MN','WA','MA'],wd:1,req:['prek'],dl:2,hlx:['','']},{id:'tradeschool',tp:'Education',lean:0,f:[0.2,-0.1,0,0.3,2,-1],sd:0.4,ang:null,who:['OH','WI','TX'],wd:2,hlx:['','']},{id:'teacherpay',tp:'Education',lean:-1,f:[0.1,0,0,0.6,3,0],sd:0.5,ang:null,who:['AZ','OK','WV'],wd:3,hlx:['','']},{id:'meritpay',tp:'Education',lean:1,f:[0.1,0,0,0.1,-1,1],sd:0.6,ang:['labor',0.3],who:['TX','LA','FL'],wd:0,hlx:['','']},{id:'meals',tp:'Education',lean:-1,f:[0.1,0,0,0.4,3,-1],sd:0.3,ang:null,who:['MS','AL','NM'],wd:2,hlx:['','']},{id:'ccollege',tp:'Education',lean:-1,f:[0.2,-0.1,0,0.4,2,-1],sd:0.4,ang:null,who:['MN','TN','WA'],wd:2,slot:['tuition'],hlx:['','']},{id:'stem',tp:'Education',lean:0,f:[0.2,-0.1,0,0.2,1,0],sd:0.5,ang:null,who:['MD','VA','CO'],wd:1,hlx:['','']},{id:'stdded',tp:'Taxes',lean:1,f:[0.2,-0.1,0.1,0.8,3,0],sd:0.6,ang:null,who:['TX','OH','GA'],wd:2,slot:['stdded'],sys:['inctax','deduct'],hlx:['','']},{id:'mortded',tp:'Taxes',lean:-1,f:[-0.05,0,0,0,1,0],sd:0.5,ang:['business',0.1],who:['CA','NJ','MD'],wd:-1,req:['stdded'],slot:['mortded'],sys:['inctax','deduct'],hlx:['','']},{id:'charity',tp:'Taxes',lean:1,f:[0,0,0,0.2,2,0],sd:0.5,ang:null,who:['UT','TN','MN'],wd:2,req:['stdded'],sys:['inctax','deduct'],hlx:['','']},{id:'salt',tp:'Taxes',lean:1,f:[0.1,0,0,0.4,0,0],sd:0.5,ang:null,who:['NY','NJ','CA','CT'],wd:3,slot:['salt'],sys:['inctax','deduct'],hlx:['','']},{id:'progbrk',tp:'Taxes',lean:-1,f:[-0.2,0,0,-0.3,2,0],sd:0.5,ang:['business',0.2],who:['NY','CA','MA'],wd:-1,req:['~top70'],slot:['toprate'],sys:['inctax'],hlx:['','']},{id:'taxfree',tp:'Taxes',lean:1,f:[0.1,-0.1,0.1,0.5,3,0],sd:0.5,ang:null,who:['NV','FL','HI'],wd:3,slot:['taxfree'],sys:['inctax'],hlx:['','']},{id:'payrollhol',tp:'Taxes',lean:1,f:[0.3,-0.2,0.1,0.8,3,0],sd:0.6,ang:['retirees',0.15],who:['OH','MI','PA'],wd:2,slot:['payrollrate'],hlx:['','']},{id:'closeloop',tp:'Taxes',lean:-1,f:[-0.05,0,0,-0.05,2,0],sd:0.5,ang:['business',0.2],who:['NY','CT','MA'],wd:-1,slot:['carried'],sys:['inctax'],hlx:['','']},{id:'profitshift',tp:'Taxes',lean:-1,f:[-0.1,0,0,-0.15,1,0],sd:0.6,ang:['business',0.25],who:['DE','CA','WA'],wd:-1,req:['corp15'],sys:['corp'],hlx:['','']},{id:'exittax',tp:'Taxes',lean:-2,f:[-0.05,0,0,-0.05,1,0],sd:0.4,ang:null,who:['NY','CA','FL'],wd:0,req:[['top70','top90','wealth','unrealized','progbrk']],dl:2,sys:['inctax'],hlx:['','']},{id:'unrealized',tp:'Taxes',lean:-2,f:[-0.2,0,0,-0.4,2,0],sd:0.7,ang:['business',0.3],who:['CA','WA','NY'],wd:-1,req:['~wealth'],slot:['wealthtax','capgains'],sys:['inctax'],hlx:['','']},{id:'cgindex',tp:'Taxes',lean:1,f:[0.1,0,0,0.2,0,0],sd:0.5,ang:null,who:['TX','FL','AZ'],wd:1,req:['~cg0'],slot:['capgains'],sys:['inctax'],hlx:['','']},{id:'dividendtax',tp:'Taxes',lean:-1,f:[-0.1,0,0,-0.2,1,0],sd:0.5,ang:['business',0.2],who:['CT','FL','NY'],wd:-1,req:['!flat'],slot:['divtax'],sys:['inctax'],hlx:['','']},{id:'flatexempt',tp:'Taxes',lean:-1,f:[0,0,0,0.5,2,0],sd:0.5,ang:null,who:['MS','WV','KY'],wd:2,req:['flat'],sys:['inctax'],hlx:['','']},{id:'prebate',tp:'Taxes',lean:-1,f:[0.1,0,0,1.2,3,-1],sd:0.6,ang:null,who:['MS','AL','WV'],wd:3,req:['consumptax'],hlx:['','']},{id:'vatrebate',tp:'Taxes',lean:-1,f:[0,0,0,0.4,2,0],sd:0.5,ang:null,who:['NM','MS','LA'],wd:2,req:['natvat'],hlx:['','']},{id:'irsup',tp:'Taxes',lean:-1,f:[0,0,0,-0.3,-1,0],sd:0.6,ang:['business',0.15],who:['NV','TX','WY'],wd:-1,slot:['irs'],hlx:['','']},{id:'irsdown',tp:'Taxes',lean:2,f:[0,0,0,0.2,1,0],sd:0.5,ang:null,who:['WY','TX','FL'],wd:1,slot:['irs'],hlx:['','']},{id:'taxfiling',tp:'Taxes',lean:-1,f:[0,0,0,0.05,2,0],sd:0.5,ang:['business',0.15],who:['CA','NY','AZ'],wd:2,req:['irsup'],sys:['inctax'],hlx:['','']},{id:'prefill',tp:'Taxes',lean:-1,f:[0,0,0,0.05,2,0],sd:0.5,ang:['business',0.15],who:['CA','NY','IL'],wd:2,req:['taxfiling'],sys:['inctax'],hlx:['','']},{id:'windrebate',tp:'Taxes',lean:-1,f:[0.05,0,0.1,0.5,3,-1],sd:0.5,ang:null,who:['ME','MI','PA'],wd:2,req:['windfall'],hlx:['','']},{id:'estate',tp:'Taxes',lean:2,f:[0.05,0,0,0.2,-1,0],sd:0.5,ang:null,who:['IA','NE','KS'],wd:1,slot:['estate'],hlx:['','']},{id:'minimumtax',tp:'Taxes',lean:-1,f:[-0.1,0,0,-0.2,1,0],sd:0.6,ang:['business',0.3],who:['DE','NY','CA'],wd:-1,slot:['camt'],sys:['corp'],hlx:['','']},{id:'rdcredit',tp:'Taxes',lean:1,f:[0.15,-0.05,0,0.2,1,0],sd:0.6,ang:null,who:['CA','WA','MA'],wd:1,slot:['rdcredit'],sys:['corp','deduct'],hlx:['','']},{id:'eitc',tp:'Welfare',lean:-1,f:[0.05,-0.1,0,0.3,2,0],sd:0.6,ang:null,who:['MS','LA','AL'],wd:2,slot:['eitc'],sys:['inctax','deduct'],hlx:['','']},{id:'eitcless',tp:'Welfare',lean:-1,f:[0,-0.05,0,0.2,1,0],sd:0.5,ang:null,who:['MS','WV','NM'],wd:1,req:['eitc'],sys:['inctax','deduct'],hlx:['','']},{id:'eitcyoung',tp:'Welfare',lean:-1,f:[0,-0.05,0,0.1,1,0],sd:0.4,ang:null,who:['MS','GA','NM'],wd:1,req:['eitcless'],sys:['inctax','deduct'],hlx:['','']},{id:'ctc',tp:'Welfare',lean:-2,f:[0.05,0.05,0.1,1,3,0],sd:0.7,ang:null,who:['WV','MS','NM'],wd:3,slot:['ctc'],sys:['inctax','deduct'],hlx:['','']},{id:'ctcmonth',tp:'Welfare',lean:-1,f:[0,0,0,0.05,2,0],sd:0.5,ang:null,who:['WV','OH','MS'],wd:2,req:['ctc'],sys:['inctax','deduct'],hlx:['','']},{id:'ctcwork',tp:'Welfare',lean:1,f:[0,-0.05,0,-0.3,-1,0],sd:0.5,ang:null,who:['WV','MS','NM'],wd:-1,req:['ctcmonth'],sys:['inctax','deduct'],hlx:['','']},{id:'autoira',tp:'Retirement',lean:-1,f:[0,0,0,0.05,2,0],sd:0.5,ang:['business',0.1],who:['CA','OR','IL'],wd:1,slot:['autoira'],sys:['inctax'],hlx:['','']},{id:'ssfix',tp:'Retirement',lean:0,f:[-0.1,0,0,-0.4,-1,0],sd:0.6,ang:['retirees',0.1],who:['FL','AZ','PA'],wd:-1,req:[['~ssx','~ssp']],slot:['ssbenefit','payrollcap'],hlx:['','']},{id:'sstrust',tp:'Retirement',lean:-1,f:[0,0,0,0.9,3,0],sd:0.6,ang:null,who:['FL','AZ','PA'],wd:3,req:['~ssfix'],hlx:['','']},{id:'balbud',tp:'Budget',lean:2,f:[-0.3,0.2,-0.1,-1,-1,1],sd:0.6,ang:['labor',0.2],who:['VA','MD','NM'],wd:-2,req:[['cut10','~cut10']],slot:['balbud'],hlx:['','']},{id:'imprec',tp:'Budget',lean:1,f:[-0.05,0,0,-0.2,0,0],sd:0.5,ang:null,who:['VA','MD','AK'],wd:-1,req:['balbud'],hlx:['','']},{id:'defcut',tp:'Budget',lean:0,f:[-0.1,0.1,0,-0.3,0,0],sd:0.5,ang:null,who:['VA','CA','AL'],wd:-2,slot:['defense'],hlx:['','']},{id:'defup',tp:'Budget',lean:0,f:[0.2,-0.1,0.1,1,1,0],sd:0.6,ang:null,who:['VA','TX','AL'],wd:2,slot:['defense'],hlx:['','']},{id:'capreq',tp:'Finance',lean:-1,f:[-0.1,0,0,0,1,0],sd:0.6,ang:['business',0.25],who:['NY','NC'],wd:-1,slot:['bankreg'],hlx:['','']},{id:'dodd',tp:'Finance',lean:2,f:[0.1,0,0,0,-1,0],sd:0.5,ang:null,who:['NC','UT','SD'],wd:1,slot:['bankreg'],hlx:['','']},{id:'fdic',tp:'Finance',lean:-1,f:[0.05,0,0.05,0,1,0],sd:0.5,ang:['business',0.1],who:['CA','MA','NY'],wd:1,slot:['fdic'],hlx:['','']},{id:'cfpb',tp:'Finance',lean:2,f:[0.05,0,0,-0.02,-2,0],sd:0.5,ang:['urban',0.15],who:['NY','CA','IL'],wd:-2,slot:['cfpb'],hlx:['','']},{id:'payday',tp:'Finance',lean:-1,f:[-0.05,0,0,0,2,0],sd:0.5,ang:['business',0.15],who:['TX','OH','MS'],wd:1,req:[['ccap','~ccap']],slot:['payday'],hlx:['','']},{id:'bnplcap',tp:'Finance',lean:-1,f:[-0.05,0,0,0,1,0],sd:0.5,ang:['business',0.1],who:['CA','NY','GA'],wd:1,req:['ccap'],hlx:['','']},{id:'postbank',tp:'Finance',lean:-2,f:[0,0,0,0.05,2,0],sd:0.6,ang:['business',0.15],who:['MS','AL','NM'],wd:2,req:['!postsell',['payday','~payday']],sys:['postal'],hlx:['','']},{id:'crypto',tp:'Finance',lean:1,f:[0.05,0,0,0,-1,0],sd:0.5,ang:null,who:['WY','TX','FL'],wd:1,slot:['crypto'],hlx:['','']},{id:'creditscore',tp:'Finance',lean:-1,f:[-0.05,0,0,0,2,0],sd:0.5,ang:['business',0.1],who:['MS','TX','WV'],wd:1,slot:['creditscore'],hlx:['','']},{id:'mwindex',tp:'Labor',lean:-1,f:[-0.05,0.05,0.1,0,2,0],sd:0.5,ang:null,who:['WA','OH','FL','AZ'],wd:2,req:['mw15'],dl:2,hlx:['','']},{id:'smallbizcr',tp:'Labor',lean:0,f:[0.1,-0.1,0,0.4,2,-1],sd:0.5,ang:null,who:['TX','GA','KY','IA'],wd:2,req:['mw15'],dl:2,sys:['inctax','deduct'],hlx:['','']},{id:'tippedwage',tp:'Labor',lean:-2,f:[-0.1,0.1,0.1,0,1,0],sd:0.5,ang:['business',0.2],who:['NV','FL','TX','GA'],wd:1,req:['mw15'],dl:2,hlx:['','']},{id:'mwregion',tp:'Labor',lean:-1,f:[-0.2,0.2,0.2,0,3,0],sd:0.5,ang:['business',0.15],who:['CA','NY','WA','MA'],wd:2,req:['~mw15'],dl:2,slot:['minwage'],hlx:['','']},{id:'eitcmw',tp:'Labor',lean:0,f:[0.2,-0.3,0.1,0.8,3,-1],sd:0.6,ang:null,who:['MS','AL','KY','WV','OH'],wd:3,req:[['~mw15','~mw0']],dl:2,hlx:['','']},{id:'cardcheck',tp:'Labor',lean:-2,f:[-0.1,0,0.1,0,1,1],sd:0.6,ang:['business',0.35],who:['MI','OH','PA','NV'],wd:2,req:[['norw','~rtw']],dl:2,slot:['unionvote'],sys:['unions'],hlx:['','']},{id:'arbitration',tp:'Labor',lean:-2,f:[-0.1,0,0.1,0,1,0],sd:0.6,ang:['business',0.25],who:['MI','OH','IL'],wd:2,req:['cardcheck'],dl:2,sys:['unions'],hlx:['','']},{id:'secretballot',tp:'Labor',lean:1,f:[0,0,0,0,0,1],sd:0.5,ang:['labor',0.3],who:['SC','TX','UT','TN'],wd:1,slot:['unionvote'],sys:['unions'],hlx:['','']},{id:'unionfin',tp:'Labor',lean:2,f:[0,0,0,0,-1,1],sd:0.5,ang:['labor',0.3],who:['MI','WI','OH','NV'],wd:-1,req:['rtw'],dl:2,sys:['unions'],hlx:['','']},{id:'paidleave',tp:'Labor',lean:-2,f:[0.1,-0.1,0.1,0.1,4,-1],sd:0.6,ang:['business',0.15],who:['CA','NJ','NY','WA','MA'],wd:3,hlx:['','']},{id:'childcarewf',tp:'Labor',lean:-2,f:[0.1,-0.1,0.1,0.6,3,0],sd:0.6,ang:null,who:['MN','MA','NM','VT'],wd:2,req:['paidleave'],dl:3,hlx:['','']},{id:'sickleave',tp:'Labor',lean:-1,f:[-0.05,0,0.1,0,3,0],sd:0.5,ang:['business',0.2],who:['TX','FL','GA','OH'],wd:2,hlx:['','']},{id:'noncompete',tp:'Labor',lean:0,f:[0.2,-0.1,0.05,0,1,0],sd:0.6,ang:['business',0.15],who:['FL','MA','TX','CO'],wd:2,hlx:['','']},{id:'gigwork',tp:'Labor',lean:-2,f:[-0.2,0.2,0.2,-0.1,0,1],sd:0.6,ang:['business',0.35],who:['CA','WA','NY','IL'],wd:1,slot:['gigstatus'],hlx:['','']},{id:'portben',tp:'Labor',lean:1,f:[0.1,0,0,0.05,0,0],sd:0.5,ang:['labor',0.15],who:['CA','TX','FL','AZ'],wd:1,req:['~gigwork'],dl:2,slot:['gigstatus'],hlx:['','']},{id:'uireform',tp:'Labor',lean:-1,f:[0,0,0.05,0.4,2,-1],sd:0.5,ang:['business',0.1],who:['MI','NV','OH','FL'],wd:2,hlx:['','']},{id:'overtime',tp:'Labor',lean:-1,f:[-0.1,0,0.1,0,2,0],sd:0.5,ang:['business',0.25],who:['TX','OH','PA','NC'],wd:2,req:['!otoptout'],slot:['otrule'],hlx:['','']},{id:'taa',tp:'Labor',lean:-1,f:[0,-0.1,0,0.2,2,-1],sd:0.5,ang:null,who:['MI','OH','PA','NC'],wd:2,req:[['trade','freetrade','pacpact']],dl:3,hlx:['','']},{id:'jobtrain',tp:'Labor',lean:-1,f:[0.1,-0.1,0,0.3,2,0],sd:0.5,ang:null,who:['IN','OH','KY','TN'],wd:2,req:['taa'],dl:2,hlx:['','']},{id:'apprentice',tp:'Labor',lean:1,f:[0.05,-0.05,0,0,0,1],sd:0.5,ang:['labor',0.1],who:['WI','SC','IN','GA'],wd:2,req:['jobtrain'],dl:2,hlx:['','']},{id:'supplyfund',tp:'Housing',lean:-1,f:[0.2,-0.1,-0.1,0.5,1,0],sd:0.6,ang:null,who:['CA','CO','TX','AZ'],wd:2,req:['zone'],dl:2,hlx:['','']},{id:'impactfee',tp:'Housing',lean:1,f:[0.1,0,-0.1,0,0,1],sd:0.5,ang:null,who:['CA','CO','FL','WA'],wd:1,req:['supplyfund'],dl:2,hlx:['','']},{id:'modular',tp:'Housing',lean:1,f:[0.1,0,-0.1,0,0,1],sd:0.5,ang:null,who:['IN','PA','GA','TX'],wd:1,req:['supplyfund'],dl:2,hlx:['','']},{id:'parkmin',tp:'Housing',lean:1,f:[0.1,0,-0.05,0,-1,0],sd:0.5,ang:null,who:['CA','OR','MN','TX'],wd:1,req:['zone'],dl:2,hlx:['','']},{id:'tenantaid',tp:'Housing',lean:-2,f:[0,0,0,0.3,3,-1],sd:0.5,ang:null,who:['NY','CA','GA','FL'],wd:2,req:[['rc','endrc','~rc']],dl:2,hlx:['','']},{id:'housevoucher',tp:'Housing',lean:-2,f:[0.1,0,0.1,0.8,3,-1],sd:0.6,ang:null,who:['CA','NY','TX','FL','GA'],wd:3,req:['tenantaid'],dl:3,hlx:['','']},{id:'srcincome',tp:'Housing',lean:-1,f:[0,0,0.05,0,1,0],sd:0.5,ang:['business',0.1],who:['TX','GA','FL','AZ'],wd:1,req:['housevoucher'],dl:2,hlx:['','']},{id:'lihtc',tp:'Housing',lean:-1,f:[0.1,0,0,0.2,1,0],sd:0.5,ang:null,who:['CA','NY','TX','WA'],wd:1,sys:['inctax','deduct'],hlx:['','']},{id:'firsthome',tp:'Housing',lean:-1,f:[0.1,0,0.2,0.5,3,0],sd:0.5,ang:null,who:['AZ','NV','GA','NC','PA'],wd:3,hlx:['','']},{id:'transitfund',tp:'Transport',lean:-1,f:[0.1,0,0,0.3,1,0],sd:0.5,ang:null,who:['NY','CA','WA','IL','VA'],wd:1,hlx:['','']},{id:'portinfra',tp:'Transport',lean:-1,f:[0.2,-0.1,-0.1,0.4,1,0],sd:0.5,ang:null,who:['CA','WA','GA','TX','NJ'],wd:2,hlx:['','']},{id:'jonesact',tp:'Transport',lean:2,f:[0.1,0,-0.1,0,0,1],sd:0.5,ang:['labor',0.3],who:['LA','VA','MS','WA'],wd:-2,hlx:['','']},{id:'targettariff',tp:'Trade',lean:-1,f:[-0.1,0,0.2,-0.1,1,0],sd:0.6,ang:['farmers',0.15],who:['OH','PA','MI','IN'],wd:2,req:['~tar25'],dl:2,slot:['tariffs'],hlx:['','']},{id:'buyamerica',tp:'Trade',lean:-1,f:[0,0,0.05,0.2,2,0],sd:0.5,ang:null,who:['OH','PA','MI','WI'],wd:2,hlx:['','']},{id:'chips',tp:'Trade',lean:-1,f:[0.2,-0.1,0,0.4,1,0],sd:0.6,ang:null,who:['AZ','OH','NY','TX','OR'],wd:2,hlx:['','']},{id:'pacpact',tp:'Trade',lean:2,f:[0.2,0,-0.1,0,-1,1],sd:0.6,ang:['labor',0.2],who:['WA','OR','IA','CA'],wd:2,slot:['tariffs'],hlx:['','']},{id:'farmaid',tp:'Farm',lean:-1,f:[0,0,0,0.6,2,-1],sd:0.5,ang:null,who:['IA','NE','KS','ND','MN'],wd:4,req:[['tar25','tariff40','targettariff'],'!farmsub'],dl:3,slot:['farmpay'],hlx:['','']},{id:'farmsub',tp:'Farm',lean:2,f:[0,0,0,-0.2,-2,2],sd:0.6,ang:['farmers',0.45],who:['IA','NE','KS','ND','MN'],wd:-4,slot:['farmprog','farmpay'],hlx:['','']},{id:'cropins',tp:'Farm',lean:-1,f:[0,0,0,0.2,1,0],sd:0.5,ang:null,who:['IA','NE','ND','KS','SD'],wd:3,req:['~farmsub'],dl:2,slot:['farmprog'],hlx:['','']},{id:'repair',tp:'Farm',lean:0,f:[-0.05,0,-0.05,0,2,0],sd:0.5,ang:['business',0.15],who:['IA','NE','MT','ND','CO'],wd:3,hlx:['','']},{id:'bordercarbon',tp:'Energy',lean:-1,f:[-0.1,0,0.1,-0.2,1,0],sd:0.5,ang:['business',0.15],who:['OH','PA','IN','WV'],wd:1,req:['carbon','!freetrade'],slot:['bordercarb'],hlx:['','']},{id:'climateclub',tp:'Energy',lean:1,f:[0.1,0,0,0.1,1,0],sd:0.5,ang:null,who:['MI','WA','OH'],wd:1,req:['bordercarbon'],dl:2,hlx:['','']},{id:'cleanstd',tp:'Energy',lean:-1,f:[-0.2,0,0.2,0,1,1],sd:0.6,ang:['energy',0.4],who:['WV','WY','KY','ND'],wd:-3,slot:['carbon'],hlx:['','']},{id:'gasbridge',tp:'Energy',lean:-2,f:[0.1,-0.1,0,0.4,2,-1],sd:0.5,ang:null,who:['TX','PA','MI','ND','NM','OH'],wd:2,req:[['gasban','frack']],hlx:['','']},{id:'wellplug',tp:'Environment',lean:-1,f:[0.1,-0.1,0,0.1,1,0],sd:0.5,ang:null,who:['PA','OH','WV','TX'],wd:1,req:['gasbridge'],dl:2,hlx:['','']},{id:'pipeline',tp:'Energy',lean:2,f:[0.2,-0.1,-0.1,0,0,1],sd:0.6,ang:['urban',0.2],who:['ND','TX','OK','MT'],wd:2,req:['!frack'],hlx:['','']},{id:'gridfund',tp:'Energy',lean:-1,f:[0.2,-0.1,-0.1,0.4,1,0],sd:0.6,ang:null,who:['TX','CA','KS'],wd:1,hlx:['','']},{id:'solarcredit',tp:'Energy',lean:-1,f:[0.2,-0.1,0,0.5,1,0],sd:0.6,ang:['energy',0.15],who:['AZ','NV','CA','TX'],wd:2,slot:['cleancredit'],sys:['deduct'],hlx:['','']},{id:'nukesub',tp:'Energy',lean:-1,f:[0.2,-0.1,0,0.3,0,0],sd:0.6,ang:null,who:['GA','TN','WY','ID'],wd:2,hlx:['','']},{id:'gasholiday',tp:'Energy',lean:1,f:[0.1,0,-0.1,0.1,2,0],sd:0.4,ang:null,who:['TX','GA','FL','OH'],wd:2,req:[['gascap','~gascap']],slot:['gastax'],hlx:['','']},{id:'spr',tp:'Energy',lean:0,f:[0.1,0,-0.1,0.1,1,0],sd:0.4,ang:null,who:['TX','LA','CA'],wd:1,req:['~gascap'],hlx:['','']},{id:'sprrefill',tp:'Energy',lean:0,f:[0,0,0.1,0.2,0,0],sd:0.4,ang:null,who:['TX','LA'],wd:1,req:['spr'],dl:3,hlx:['','']},{id:'waterinfra',tp:'Environment',lean:-1,f:[0.1,-0.1,0,0.3,2,-1],sd:0.6,ang:null,who:['MI','IL','OH','NJ'],wd:2,hlx:['','']},{id:'wetlands',tp:'Environment',lean:-1,f:[-0.1,0,0,0,0,1],sd:0.6,ang:['farmers',0.35],who:['IA','NE','KS','FL'],wd:-2,slot:['wotus'],hlx:['','']},{id:'wildfire',tp:'Environment',lean:-1,f:[0.1,0,0,0.3,2,-1],sd:0.6,ang:null,who:['CA','OR','CO','MT','ID'],wd:3,hlx:['','']},{id:'cafe',tp:'Transport',lean:-1,f:[-0.1,0,0.1,0,0,1],sd:0.6,ang:['energy',0.3],who:['MI','OH','TX','WY'],wd:-2,slot:['fuelecon'],hlx:['','']},{id:'evcharge',tp:'Transport',lean:-1,f:[0.1,0,0,0.3,1,0],sd:0.5,ang:null,who:['CA','MI','GA','CO'],wd:1,req:[['gasban','cafe']],hlx:['','']},{id:'evtax',tp:'Transport',lean:1,f:[0,0,0,-0.1,-1,0],sd:0.5,ang:null,who:['CA','WA','OR'],wd:-1,req:['evcharge'],dl:2,hlx:['','']},{id:'hsr',tp:'Transport',lean:-2,f:[0.2,-0.1,0,0.8,1,0],sd:0.7,ang:null,who:['CA','TX','IL','NY'],wd:1,slot:['hsrail'],hlx:['','']},{id:'transit',tp:'Transport',lean:-1,f:[0,0,0,0.2,1,0],sd:0.5,ang:null,who:['NY','IL','MA','PA'],wd:2,req:['~hsr'],hlx:['','']},{id:'tolls',tp:'Transport',lean:1,f:[0,0,0,-0.3,-2,1],sd:0.5,ang:['business',0.2],who:['NJ','IL','TX','PA'],wd:-2,req:['infra'],hlx:['','']},{id:'aireg',tp:'Tech',lean:-1,f:[-0.1,0,0,0,1,0],sd:0.6,ang:['business',0.25],who:['CA','WA','NY'],wd:-1,slot:['aireg'],hlx:['','']},{id:'privacy',tp:'Tech',lean:-1,f:[-0.1,0,0,0,2,0],sd:0.6,ang:['business',0.25],who:['CA','WA','VA','CO'],wd:1,slot:['privacy'],hlx:['','']},{id:'broadband',tp:'Tech',lean:-1,f:[0.1,0,0,0.3,2,0],sd:0.5,ang:null,who:['MS','WV','MT','WY'],wd:3,hlx:['','']},{id:'ipo',tp:'Finance',lean:2,f:[0.2,0,0,0,-1,0],sd:0.5,ang:null,who:['CA','NY','UT','MA'],wd:1,hlx:['','']},{id:'smallbiz',tp:'Finance',lean:-1,f:[0.2,-0.1,0,0.2,2,0],sd:0.5,ang:null,who:['OH','PA','GA','NC'],wd:2,hlx:['','']},{id:'antitrust',tp:'Tech',lean:-1,f:[-0.05,0,-0.1,0,2,0],sd:0.6,ang:['business',0.3],who:['CA','WA'],wd:-1,req:['!techbreak'],hlx:['','']},{id:'seasonal',tp:'Immigration',lean:1,f:[0.2,-0.1,-0.1,0,0,1],sd:0.6,ang:['labor',0.2],who:['CA','WA','FL','GA'],wd:1,hlx:['','']},{id:'everify',tp:'Immigration',lean:-1,f:[-0.1,0,0.1,0,1,1],sd:0.6,ang:['farmers',0.4],who:['CA','TX','FL','GA','AZ'],wd:-1,req:[['visa','~visa']],hlx:['','']},{id:'dreamers',tp:'Immigration',lean:0,f:[0.1,0,0,0,1,1],sd:0.6,ang:null,who:['CA','TX','IL','AZ'],wd:1,hlx:['','']},{id:'aidcut',tp:'Government',lean:1,f:[-0.05,0,0,-0.1,1,0],sd:0.5,ang:['farmers',0.1],who:['TX','OH','KS'],wd:1,slot:['foreignaid'],hlx:['','']},{id:'stockban',tp:'Government',lean:0,f:[0,0,0,0,2,0],sd:0.5,ang:null,who:['OH','PA','WI'],wd:2,hlx:['','']},{id:'publicfin',tp:'Government',lean:-1,f:[0,0,0,0.1,1,0],sd:0.5,ang:null,who:['NY','CT','ME'],wd:1,slot:['campfin'],hlx:['','']},{id:'electaudit',tp:'Government',lean:0,f:[0,0,0,0.1,1,-1],sd:0.5,ang:null,who:['GA','AZ','PA','WI'],wd:1,hlx:['','']},{id:'civilserv',tp:'Government',lean:1,f:[0.1,0,0,-0.1,0,1],sd:0.5,ang:['labor',0.3],who:['VA','MD'],wd:-2,slot:['civilserv'],hlx:['','']},{id:'police',tp:'Safety',lean:-1,f:[0,0,0,0.1,2,-1],sd:0.5,ang:null,who:['IL','MO','LA','TN'],wd:2,hlx:['','']},{id:'bodycam',tp:'Safety',lean:-1,f:[0,0,0,0.1,1,-1],sd:0.5,ang:null,who:['MN','MO','MD'],wd:1,req:['police'],hlx:['','']},{id:'footage',tp:'Safety',lean:-1,f:[0,0,0,0,0,-1],sd:0.5,ang:null,who:['MN','IL'],wd:1,req:['bodycam'],dl:2,hlx:['','']},{id:'cvi',tp:'Safety',lean:-1,f:[0,0,0,0.1,1,-1],sd:0.5,ang:null,who:['IL','MD','PA','LA'],wd:1,req:[['police','~police']],hlx:['','']},{id:'sentreform',tp:'Safety',lean:0,f:[0,0,0,-0.1,-1,0],sd:0.5,ang:null,who:['TX','GA','KY'],wd:0,slot:['sentencing'],hlx:['','']},{id:'reentry',tp:'Safety',lean:-1,f:[0,0,0,0.1,1,0],sd:0.5,ang:null,who:['TX','OH','GA'],wd:1,req:['sentreform'],hlx:['','']},{id:'expunge',tp:'Safety',lean:0,f:[0.1,-0.1,0,0,-1,0],sd:0.5,ang:null,who:['PA','MI','UT'],wd:1,req:['reentry'],dl:2,hlx:['','']}];
const XA = [
{ id: 'consumptax', cat: 'tax', lean: 3, cost: 4, f: [0.5, -0.1, 0.8, 2.5, -4, 3], sd: 0.9, ang: ['retirees', 0.3], who: ['TN', 'LA', 'AR', 'WA'], wd: -2, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'nocorptax', cat: 'tax', lean: 3, cost: 3, f: [0.9, -0.2, 0.1, 1.6, -2, 2], sd: 0.7, ang: null, who: ['DE', 'NY', 'NV'], wd: 0, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'top90', cat: 'tax', lean: -3, cost: 4, f: [-1, 0.2, 0, -0.8, 1, 3], sd: 0.9, ang: ['business', 0.5], who: ['NY', 'CA', 'CT', 'MA'], wd: -3, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'stocktax', cat: 'tax', lean: -2, cost: 3, f: [-0.3, 0.1, 0, -0.6, 2, 1], sd: 0.8, ang: ['business', 0.35], who: ['NY', 'CT', 'NJ', 'IL'], wd: -3, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'natvat', cat: 'tax', lean: 1, cost: 3, f: [0.1, 0, 0.7, -1.5, -3, 2], sd: 0.6, ang: ['retirees', 0.2], who: ['OR', 'NH', 'MT', 'DE'], wd: -4, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'nopayrollcap', cat: 'tax', lean: -2, cost: 3, f: [-0.3, 0.1, 0, -0.9, 2, 1], sd: 0.6, ang: ['business', 0.3], who: ['NY', 'CA', 'CT', 'MA'], wd: -2, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'startuphol', cat: 'tax', lean: 2, cost: 2, f: [0.3, -0.2, 0, 0.3, 1, 0], sd: 0.7, ang: null, who: ['UT', 'TX', 'CO', 'FL'], wd: 2, scand: 0, cong: -4, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'windfall', cat: 'tax', lean: -2, cost: 3, f: [-0.3, 0.1, 0.1, -0.5, 3, 1], sd: 0.7, ang: ['energy', 0.5], who: ['TX', 'LA', 'ND', 'OK', 'AK'], wd: -4, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'nopubunion', cat: 'labor', lean: 2, cost: 3, f: [0.1, 0, -0.1, -0.2, -3, 4], sd: 0.7, ang: ['labor', 0.6], who: ['WI', 'OH', 'NY', 'IL'], wd: -4, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'nounions', cat: 'labor', t: 'Ban all unions', m: '', lean: 3, cost: 4, f: [0.3, -0.1, -0.1, 0, -6, 7], sd: 0.9, ang: ['labor', 0.7], who: ['MI', 'OH', 'PA', 'WA', 'IL'], wd: -6, scand: 0, cong: -7, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'nominwage', cat: 'labor', lean: 3, cost: 3, f: [0.3, -0.3, -0.1, -0.1, -6, 4], sd: 0.7, ang: ['labor', 0.5], who: ['MS', 'AL', 'LA', 'GA', 'TN'], wd: -4, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'wagefreeze', cat: 'labor', lean: -3, cost: 4, f: [-0.8, 0.3, -1.2, 0, 3, 4], sd: 0.9, ang: ['business', 0.5], who: ['TX', 'OH', 'IL', 'CA'], wd: 1, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'fourday', cat: 'labor', lean: -2, cost: 3, f: [-0.2, -0.2, 0.2, 0.2, 5, 1], sd: 0.8, ang: ['business', 0.4], who: ['WA', 'MA', 'CA', 'CO'], wd: 3, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'ceocap', cat: 'labor', lean: -2, cost: 3, f: [-0.1, 0, 0, -0.2, 5, 1], sd: 0.7, ang: ['business', 0.45], who: ['NY', 'CT', 'CA', 'IL'], wd: -2, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'job20', cat: 'labor', lean: -3, cost: 4, f: [0.1, -1.4, 0.8, 3, 4, -1], sd: 0.9, ang: ['business', 0.3], who: ['MS', 'AL', 'KY', 'WV', 'LA'], wd: 4, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'otoptout', cat: 'labor', lean: 2, cost: 3, f: [0.2, -0.1, 0, 0, -4, 3], sd: 0.6, ang: ['labor', 0.45], who: ['TX', 'OH', 'PA', 'MI'], wd: -3, scand: 0, cong: -4, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'endrc', cat: 'housing', lean: 2, cost: 3, f: [0.2, 0, 0.1, 0, -4, 4], sd: 0.7, ang: ['urban', 0.5], who: ['NY', 'CA', 'OR', 'MA', 'NJ'], wd: -4, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'nozoning', cat: 'housing', lean: 3, cost: 4, f: [0.9, -0.3, -0.5, 0, -2, 4], sd: 0.9, ang: ['urban', 0.35], who: ['CA', 'MA', 'NY', 'CO', 'WA'], wd: -2, scand: 0, cong: -7, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'emptyhomes', cat: 'housing', lean: -3, cost: 4, f: [0.1, 0, -0.4, 0.3, 3, 3], sd: 0.9, ang: ['business', 0.5], who: ['NY', 'FL', 'NV', 'AZ', 'CA'], wd: -2, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'nocorplord', cat: 'housing', lean: -2, cost: 3, f: [-0.1, 0, 0.1, 0, 3, 2], sd: 0.7, ang: ['business', 0.35], who: ['GA', 'TX', 'NC', 'AZ', 'FL'], wd: 1, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'nolicense', cat: 'housing', lean: 3, cost: 3, f: [0.5, -0.4, -0.2, 0, 0, 2], sd: 0.8, ang: ['labor', 0.3], who: ['LA', 'CA', 'AZ', 'NV'], wd: 1, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'nobuyback', cat: 'housing', lean: -2, cost: 3, f: [-0.2, 0, 0, 0, 3, 1], sd: 0.6, ang: ['business', 0.3], who: ['NY', 'CA', 'WA', 'TX'], wd: -1, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'techbreak', cat: 'housing', lean: -2, cost: 4, f: [-0.3, 0.1, 0.1, 0, 2, 2], sd: 0.9, ang: ['business', 0.4], who: ['CA', 'WA', 'TX', 'VA'], wd: -3, scand: 0, cong: -4, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'fdaopen', cat: 'housing', lean: 3, cost: 3, f: [0.3, 0, -0.1, -0.1, 1, 3], sd: 0.9, ang: null, who: ['MD', 'NC', 'MA', 'NJ'], wd: -1, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'railnat', cat: 'trade', lean: -3, cost: 4, f: [-0.2, 0.1, 0, 1.2, 1, 2], sd: 0.8, ang: ['business', 0.4], who: ['NE', 'IL', 'GA', 'FL'], wd: -1, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'banknat', cat: 'trade', lean: -3, cost: 4, f: [-0.8, 0.3, 0, 1.5, 0, 3], sd: 0.9, ang: ['business', 0.6], who: ['NY', 'NC', 'CA', 'CT'], wd: -3, scand: 0, cong: -7, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'tariff40', cat: 'trade', lean: -1, cost: 4, f: [-1.3, 0.4, 1.4, -2, -5, 4], sd: 0.8, ang: ['farmers', 0.6], who: ['IA', 'NE', 'KS', 'WA', 'MI'], wd: -5, scand: 0, cong: -7, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'freetrade', cat: 'trade', lean: 3, cost: 3, f: [0.6, 0.2, -0.6, 0.4, -2, 3], sd: 0.8, ang: ['labor', 0.4], who: ['MI', 'OH', 'PA', 'IN', 'NC'], wd: -4, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'postsell', cat: 'trade', lean: 2, cost: 2, f: [0.1, 0.1, 0, -0.1, -3, 2], sd: 0.6, ang: ['labor', 0.4], who: ['MT', 'WY', 'AK', 'ND', 'VT'], wd: -4, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'parksoil', cat: 'trade', lean: 2, cost: 3, f: [0.1, -0.1, -0.1, -0.2, -6, 6], sd: 0.8, ang: ['urban', 0.4], who: ['WY', 'UT', 'AK', 'MT', 'CO'], wd: -3, scand: 0, cong: -6, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'gasban', cat: 'trade', lean: -2, cost: 4, f: [-0.6, 0.3, 0.4, 0.3, -3, 4], sd: 0.9, ang: ['energy', 0.55], who: ['MI', 'OH', 'TX', 'LA', 'WY'], wd: -4, scand: 0, cong: -7, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'drillall', cat: 'trade', lean: 3, cost: 3, f: [0.4, -0.2, -0.3, -0.2, 0, 4], sd: 0.7, ang: ['urban', 0.3], who: ['TX', 'ND', 'NM', 'LA', 'AK'], wd: 4, scand: 0, cong: -5, catch: 0, dark: false, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'hushmoney', cat: 'power', lean: 0, cost: 3, f: [-0.1, 0, 0, 0.1, -1, -5], sd: 0.8, ang: null, who: ['VA', 'MD', 'NY'], wd: -2, scand: 14, cong: -2, catch: 0.5, dark: true, shield: 8, capGain: 0, hlx: ['', ''] },
{ id: 'pardonally', cat: 'power', lean: 0, cost: 2, f: [0, 0, 0, 0, -3, 1], sd: 0.6, ang: null, who: ['NY', 'FL', 'IL', 'VA'], wd: -2, scand: 10, cong: 4, catch: 0.4, dark: true, shield: 10, capGain: 0, hlx: ['', ''] },
{ id: 'fedfire', cat: 'power', lean: 0, cost: 4, f: [0.6, -0.3, 1.2, 0.2, 1, 1], sd: 0.9, ang: ['retirees', 0.3], who: ['NY', 'CA', 'IL', 'MA'], wd: -2, scand: 10, cong: -7, catch: 0.25, dark: true, shield: 0, capGain: 0, hlx: ['', ''] },
{ id: 'emergency', cat: 'power', lean: 0, cost: 4, f: [-0.2, 0, 0.1, 0.3, 0, 2], sd: 0.9, ang: ['urban', 0.4], who: ['TX', 'AZ', 'CA', 'NY'], wd: -2, scand: 8, cong: -6, catch: 0.25, dark: true, shield: 0, capGain: 3, hlx: ['', ''] },
{ id: 'presspurch', cat: 'power', lean: 0, cost: 3, f: [-0.1, 0, 0, 0.2, 5, -3], sd: 0.8, ang: null, who: ['NY', 'IL', 'CA', 'FL'], wd: -1, scand: 18, cong: -4, catch: 0.6, dark: true, shield: 8, capGain: 0, hlx: ['', ''] },
{ id: 'auditcrit', cat: 'power', lean: 0, cost: 3, f: [0, 0, 0, -0.2, 0, -3], sd: 0.7, ang: ['business', 0.4], who: ['NY', 'CA', 'TX', 'FL'], wd: -2, scand: 16, cong: -5, catch: 0.5, dark: true, shield: 6, capGain: 0, hlx: ['', ''] },
{ id: 'packcourts', cat: 'power', lean: 0, cost: 4, f: [-0.3, 0, 0, 0, -2, 4], sd: 0.9, ang: ['urban', 0.4], who: ['TX', 'CA', 'NY', 'FL'], wd: -2, scand: 8, cong: -7, catch: 0.25, dark: true, shield: 4, capGain: 0, hlx: ['', ''] },
{ id: 'cronies', cat: 'power', lean: 0, cost: 4, f: [-0.4, 0.1, 0.2, 0.4, 0, -1], sd: 0.9, ang: null, who: ['NY', 'TX', 'LA', 'DE'], wd: -2, scand: 22, cong: 6, catch: 0.6, dark: true, shield: 10, capGain: 2, hlx: ['', ''] }
];
export const ENGINE_VERSION = 5;
export const MIN_DAYS = 3, MAX_DAYS = 28;
export const BASE_GROWTH = 2; // trend GDP growth (%) when nothing is done
export class Engine {
data() {
if (this._D) return this._D;
const KEYS = ['g', 'j', 'i', 'd', 'a', 'u'];
const POL = [
{ id: 'mw15', lean: -2, f: [-0.5, 0.8, 0.5, 0, 4, 1], sd: 0.5, ang: ['business', 0.3], who: ['TX', 'GA', 'KY', 'PA', 'WI', 'IA'], wd: 4 },
{ id: 'sp', lean: -3, f: [-1.2, 0.5, 0, 4, 4, 2], sd: 0.7, ang: ['business', 0.45], who: ['FL', 'MI', 'NY', 'OH'], wd: 2 },
{ id: 'rc', lean: -2, f: [-0.3, 0.1, -0.3, 0, 4, 1], sd: 0.6, ang: ['business', 0.3], who: ['NY', 'CA', 'OR', 'MA', 'CO'], wd: 4 },
{ id: 'top70', lean: -2, f: [-0.8, 0.2, 0, -1.2, 2, 1], sd: 0.6, ang: ['business', 0.4], who: ['NY', 'CA', 'MA'], wd: -3 },
{ id: 'wealth', lean: -2, f: [-0.5, 0, 0, -0.8, 3, 1], sd: 0.9, ang: ['business', 0.35], who: ['CA', 'NY', 'NV'], wd: -2 },
{ id: 'jobg', lean: -3, f: [0.2, -1.3, 0.6, 2.2, 4, -1], sd: 0.8, ang: ['business', 0.15], who: ['OH', 'KY', 'LA', 'MI'], wd: 3 },
{ id: 'debt', lean: -2, f: [0.1, 0, 0.3, 1.2, 3, -1], sd: 0.4, ang: null, who: ['MA', 'CO', 'VA', 'WA'], wd: 2 },
{ id: 'gascap', lean: -2, f: [-0.5, 0.1, -0.8, 0, 4, 4], sd: 0.8, ang: ['urban', 0.5], who: ['LA', 'TX', 'GA'], wd: 1 },
{ id: 'college', lean: -2, f: [0.2, 0, 0, 1, 3, -1], sd: 0.5, ang: null, who: ['WI', 'MN', 'MA'], wd: 2 },
{ id: 'ubi', lean: -3, f: [0.2, 0.5, 1.0, 5.5, 6, -2], sd: 0.7, ang: null, who: ['AK', 'NM', 'KY'], wd: 3 },
{ id: 'norw', lean: -1, f: [-0.2, 0.1, 0, 0, 1, 1], sd: 0.6, ang: ['business', 0.3], who: ['TX', 'GA', 'UT', 'KS'], wd: -2 },
{ id: 'ssx', lean: -2, f: [-0.2, 0.1, 0.2, 0.4, 4, 0], sd: 0.5, ang: null, who: ['FL', 'AZ', 'PA'], wd: 4 },
{ id: 'tar25', lean: -1, f: [-0.8, 0.2, 1.0, -0.6, -3, 2], sd: 0.6, ang: ['farmers', 0.45], who: ['IA', 'NE', 'KS', 'ND'], wd: -4 },
{ id: 'ccap', lean: -2, f: [-0.2, 0, 0, 0, 5, 0], sd: 0.5, ang: ['business', 0.25], who: ['NY', 'MA', 'NV'], wd: 2 },
{ id: 'frack', lean: -2, f: [-0.9, 0.4, 1.0, 0, -2, 2], sd: 0.6, ang: ['energy', 0.5], who: ['TX', 'ND', 'PA', 'NM', 'LA'], wd: -5 },
{ id: 'infra', lean: -1, f: [0.5, -0.2, 0.2, 1.5, 3, 0], sd: 0.6, ang: null, who: ['PA', 'MI', 'OH', 'IL'], wd: 2 },
{ id: 'prek', lean: -1, f: [0.1, 0, 0, 0.7, 3, 0], sd: 0.5, ang: null, who: ['MN', 'MA', 'WA'], wd: 2 },
{ id: 'mw0', lean: 2, f: [0.2, -0.3, -0.1, 0, -5, 3], sd: 0.6, ang: ['labor', 0.45], who: ['ID', 'WY', 'ND', 'UT', 'KS'], wd: -3 },
{ id: 'corp15', lean: 2, f: [0.6, -0.2, 0.1, 0.7, -1, 1], sd: 0.6, ang: null, who: ['NY', 'MA', 'TX'], wd: -1 },
{ id: 'zone', lean: 2, f: [0.5, -0.1, -0.4, 0, 1, 2], sd: 0.7, ang: null, who: ['CA', 'OR', 'CO', 'MA', 'NY'], wd: 0 },
{ id: 'lic', lean: 1, f: [0.3, -0.3, -0.1, 0, 0, 1], sd: 0.6, ang: null, who: ['UT', 'NV', 'AZ'], wd: 1 },
{ id: 'trade', lean: 2, f: [0.5, 0.2, -0.5, 0.2, -1, 2], sd: 0.6, ang: ['labor', 0.3], who: ['MI', 'OH', 'PA', 'WA'], wd: -2 },
{ id: 'ssp', lean: 2, f: [0.2, 0, 0, 1.2, -5, 3], sd: 0.8, ang: ['retirees', 0.45], who: ['FL', 'AZ', 'PA'], wd: -4 },
{ id: 'age69', lean: 1, f: [0.1, 0.1, 0, -0.8, -4, 2], sd: 0.5, ang: ['retirees', 0.35], who: ['FL', 'AZ', 'KY', 'PA'], wd: -3 },
{ id: 'permit', lean: 1, f: [0.4, -0.1, -0.2, 0, 0, 1], sd: 0.6, ang: null, who: ['GA', 'VA', 'TX'], wd: 2 },
{ id: 'regs', lean: 1, f: [0.3, -0.1, 0, 0, -1, 0], sd: 0.8, ang: null, who: ['TX', 'UT', 'ID'], wd: 1 },
{ id: 'vouch', lean: 2, f: [0.1, 0, 0, 0.4, -1, 2], sd: 0.7, ang: ['labor', 0.3], who: ['WI', 'IA', 'LA', 'AZ'], wd: 0 },
{ id: 'cut10', lean: 2, f: [-0.9, 0.5, -0.2, -2.2, -5, 3], sd: 0.6, ang: ['labor', 0.3], who: ['VA', 'PA', 'NM'], wd: -3 },
{ id: 'hsa', lean: 1, f: [0.2, 0, 0, 0.2, 1, 0], sd: 0.6, ang: null, who: ['UT', 'TX', 'AZ'], wd: 1 },
{ id: 'visa', lean: 1, f: [0.6, -0.1, 0, -0.2, -1, 1], sd: 0.6, ang: null, who: ['WA', 'CA', 'MA', 'VA'], wd: 1 },
{ id: 'cg0', lean: 2, f: [0.4, -0.1, 0, 1, -3, 2], sd: 0.6, ang: null, who: ['NY', 'CA', 'NV'], wd: -2 },
{ id: 'carbon', lean: 1, f: [-0.2, 0.1, 0.5, 0, -1, 1], sd: 0.6, ang: ['energy', 0.3], who: ['ND', 'LA', 'TX', 'WY'], wd: -2 },
{ id: 'flat', lean: 2, f: [0.3, -0.1, 0, 1, -2, 1], sd: 0.7, ang: null, who: ['KS', 'UT', 'TX'], wd: 0 },
{ id: 'land', lean: 1, f: [0.1, 0, 0, -0.5, -2, 1], sd: 0.6, ang: null, who: ['WY', 'MT', 'ID', 'UT', 'NM'], wd: -3 },
{ id: 'rtw', lean: 1, f: [0.2, -0.1, 0, 0, -1, 2], sd: 0.6, ang: ['labor', 0.35], who: ['MI', 'OH', 'IL', 'PA'], wd: -3 }
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
{ label: '', desc: '', f: [0.2, -0.1, -0.4, 0, 1, 1], sd: 0.5, perm: 1, res: '' },
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
{ label: '', desc: '', f: [0.2, 0, 0, 0.3, 2, 0], sd: 0.4, perm: 1, res: '' },
{ label: '', desc: '', f: [0.3, 0, 0, 0, -1, 0], sd: 0.5, res: '' },
{ label: '', desc: '', f: [-0.6, 0, 0, 0, -3, 2], sd: 0.4, res: '' }
], hl: '' },
bond: { kind: 'Financial shock', title: '', text: '', st: ['NY', 'VA', 'MA'], icon: 'storm', base: [-1.0, 0.2, 0.5, 1.0, -2, 2], real: '',
opts: [
{ label: '', desc: '', f: [-0.5, 0.3, 0, -1.5, -4, 3], sd: 0.4, perm: 1, res: '' },
{ label: 'Raise taxes', desc: '', f: [-0.6, 0.2, 0, -1.3, -3, 2], sd: 0.4, perm: 1, res: '' },
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
POL2.forEach((x) => { HL[x.id] = x.hlx; });
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
const SLOT = {
mw15: ['minwage'], mw0: ['minwage'], nominwage: ['minwage'],
sp: ['healthsys'], hsa: ['healthsys'],
rc: ['rent'], endrc: ['rent'],
top70: ['toprate'], top90: ['toprate'], flat: ['toprate', 'inctax'], consumptax: ['toprate', 'inctax', 'capgains', 'vat'],
cg0: ['capgains'], natvat: ['vat'],
corp15: ['corptax'], nocorptax: ['corptax'],
ssx: ['ssbenefit', 'payrollcap'], ssp: ['ssbenefit'], nopayrollcap: ['payrollcap'],
jobg: ['jobguar'], job20: ['jobguar'],
norw: ['rtw'], rtw: ['rtw'], nopubunion: ['pubunion'], nounions: ['pubunion', 'allunions', 'rtw'],
tar25: ['tariffs'], trade: ['tariffs'], tariff40: ['tariffs'],
frack: ['fossil'], parksoil: ['fossil'], drillall: ['fossil'],
zone: ['zoning'], nozoning: ['zoning'],
lic: ['licensing'], nolicense: ['licensing'],
wealth: ['wealthtax'], carbon: ['carbon'], college: ['tuition'], otoptout: ['otrule'], freetrade: ['tariffs', 'bordercarb']
};
const SYS = Object.assign({}, BASE_SYS), KILL = Object.assign({}, BASE_KILL);
POL.forEach((x) => { x.tp = BASE_TOPIC[x.id]; });
XA.forEach((x) => { x.tp = BASE_TOPIC[x.id]; });
POL2.forEach((x) => { if (x.slot) SLOT[x.id] = x.slot; if (x.sys) SYS[x.id] = x.sys; if (x.kill) KILL[x.id] = x.kill; });
const ALLPOL = POL.concat(POL2);
this._D = { KEYS, POL: ALLPOL, XA, SLOT, SYS, KILL, DIS_OPTS, EV, FAC, ST, TITLES, HL, EVHL, FACHL, OUT, PUNDL, PUNDR, SUPQ, OPPQ, ECON, PUND, QUIPS };
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
newGame(seed, days, lvl, unit) {
const D = this.data();
days = days == null ? 14 : days; lvl = lvl == null ? 0 : lvl;
if (!Number.isInteger(days) || days < MIN_DAYS || days > MAX_DAYS) throw new Error('bad days');
if (lvl !== 0 && lvl !== 1) throw new Error('bad level');
if (unit != null && !AP_UNITS[unit]) throw new Error('bad unit');
const mpd = lvl === 1 ? this.clamp(Math.round(28 / days), 1, 2) : this.clamp(Math.round(36 / days), 1, 3);
const g = { rs: seed | 0, day: 1, days: days, lvl: lvl, mpd: mpd, unit: unit || null, phase: 'title', title: 'President', memos: [], moot: [], pols: [], evs: [], hits: [], vet: {}, sched: {}, inc: [], carry: [], flash: [], news: [], todayPol: [], over: false, ok: '', bond: false, riot: false, ds: null, ds0: null, mi: 0,
cap: 5, cong: 50, scand: 0, imp: null, trials: 0, lastTrial: -9, trialDay: 0, rev: 0, revDay: -9, surv: false, shield: 0, xToday: false, xpend: null, xdone: [], seen: {}, tp: [], fulog: [], press: [], sidc: 0, evlog: [], crlog: [], ser: [], nv: 0 };
const slots = []; for (let d = 2; d <= days - 1; d++) slots.push(d);
const n = Math.min(10, slots.length, Math.max(1, Math.round(days * 3 / 7)));
const evDays = this.shuffle(g, slots).slice(0, n);
const dis = this.shuffle(g, ['hurricane', 'quake', 'fire', 'tornado']);
const war = this.shuffle(g, ['war_oil', 'war_ally']);
const rest = this.shuffle(g, ['pandemic', 'boom', 'crash', 'cyber']);
const extra = this.shuffle(g, dis.slice(1).concat(war.slice(1)));
const ids = this.shuffle(g, [dis[0], war[0]].concat(rest, extra).slice(0, n));
evDays.forEach((d, i) => { g.sched[d] = ids[i]; });
return g;
}
slotsOf(id) { return this.data().SLOT[id] || []; }
sysOf(id) { return this.data().SYS[id] || []; }
killOf(id) { return this.data().KILL[id] || []; }
claimKeys(id) { return this.slotsOf(id).concat(this.sysOf(id).map((s) => 'S:' + s), this.killOf(id).map((s) => 'K:' + s)); }
clash(a, b) {
if (a === b) return false;
const sb = this.slotsOf(b);
if (this.slotsOf(a).some((s) => sb.indexOf(s) >= 0)) return true;
return this.killOf(a).some((s) => this.sysOf(b).indexOf(s) >= 0) || this.killOf(b).some((s) => this.sysOf(a).indexOf(s) >= 0);
}
taken(g) {
const t = {};
const add = (id) => { this.claimKeys(id).forEach((k) => { t[k] = id; }); };
g.pols.forEach((p) => { if (!p.rep) add(p.id); });
if (g.xpend) add(g.xpend);
g.memos.forEach((m) => { if (m.dec === 'sign') add(m.id); });
return t;
}
blocker(g, id, taken) {
const t = taken || this.taken(g);
const need = this.slotsOf(id).concat(this.sysOf(id).map((s) => 'K:' + s), this.killOf(id).map((s) => 'S:' + s));
for (const k of need) if (t[k] && t[k] !== id) return t[k];
return null;
}
inEffect(g, id) { return g.pols.some((p) => p.id === id && !p.rep); }
condMet(g, tok, dl) {
const c = tok.charAt(0);
if (c === '!') { const id = tok.slice(1); return this.inEffect(g, id) || g.xpend === id ? null : { k: 'n', id: id, d: 0 }; }
if (c === '~') { const id = tok.slice(1); const d = g.vet[id]; return d != null && g.day - d >= dl ? { k: 'v', id: id, d: d } : null; }
const e = g.pols.find((p) => p.id === tok && !p.rep);
return e && g.day - e.d >= dl ? { k: e.x ? 'x' : 's', id: tok, d: e.d } : null;
}
reqMet(g, p) {
const dl = p.dl || 1; const why = [];
for (const c of p.req || []) {
let hit = null;
for (const o of Array.isArray(c) ? c : [c]) { const r = this.condMet(g, o, dl); if (r && (!hit || (r.k !== 'n' && r.d > hit.d))) hit = r; }
if (!hit) return null;
why.push(hit);
}
return why;
}
repeal(g, p) {
p.rep = true; const gone = [p.id], lapsed = [];
for (let more = true; more;) {
more = false;
g.pols.forEach((q) => {
if (q.rep) return;
const def = this.pol(q.id);
if ((def.req || []).some((c) => typeof c === 'string' && gone.indexOf(c) >= 0)) { q.rep = true; gone.push(q.id); lapsed.push(q.id); more = true; }
});
}
lapsed.forEach((id) => { this.push(g, '"' + this.pol(id).t + '', '' + this.pol(p.id).t + ''); });
return lapsed;
}
deal(g) {
const D = this.data();
g.seen = g.seen || {}; g.tp = g.tp || []; g.fulog = g.fulog || [];
const taken = this.taken(g);
const used = {}; g.pols.forEach((p) => { used[p.id] = true; });
const want = g.mpd == null ? 3 : g.mpd;
const kids = [], roots = [];
D.POL.forEach((p) => {
if (g.seen[p.id] || used[p.id] || this.blocker(g, p.id, taken)) return;
if (p.req && p.req.length) { const w = this.reqMet(g, p); if (w) kids.push({ p: p, w: w }); } else roots.push({ p: p, w: null });
});
const chosen = [], why = {}, today = {}, recent = g.tp.slice(-6);
const ok = (p) => chosen.indexOf(p) < 0 && !this.blocker(g, p.id, taken);
const add = (c) => { chosen.push(c.p); this.claimKeys(c.p.id).forEach((k) => { taken[k] = c.p.id; }); today[c.p.tp] = true; if (c.w) why[c.p.id] = c.w; };
const take = (list, flt) => {
const a = list.filter((c) => ok(c.p) && flt(c.p));
if (!a.length) return false;
const t1 = a.filter((c) => !today[c.p.tp] && recent.indexOf(c.p.tp) < 0);
const t2 = t1.length ? t1 : a.filter((c) => !today[c.p.tp]);
add(this.pick(g, t2.length ? t2 : a)); return true;
};
const maxKids = want >= 3 ? 2 : 1;
const inU = g.unit ? ((set) => (p) => set.indexOf(p.id) >= 0)(AP_UNITS[g.unit]) : null;
for (let i = 0; i < maxKids && i < want; i++) if (!(inU && take(kids, inU)) && !take(kids, () => true)) break;
while (chosen.length < want) {
const bal = chosen.reduce((s, p) => s + Math.sign(p.lean), 0);
const flt = bal > 0 ? (p) => p.lean < 0 : bal < 0 ? (p) => p.lean > 0 : () => true;
if (inU && (take(roots, (p) => flt(p) && inU(p)) || take(roots, inU))) continue;
if (!take(roots, flt) && !take(roots, () => true) && !take(kids, () => true)) break;
}
g.memos = this.shuffle(g, chosen).map((p) => {
g.seen[p.id] = true; g.tp.push(p.tp);
const m = { id: p.id, dec: null };
const w = (why[p.id] || []).filter((x) => x.k !== 'n').sort((a, b) => b.d - a.d)[0];
if (w) { m.sk = w.k; m.sid = w.id; g.fulog.push({ d: g.day, id: p.id, sk: w.k, sid: w.id }); }
return m;
});
if (g.tp.length > 24) g.tp = g.tp.slice(-24);
g.moot = [];
g.mi = 0;
}
nights(g, d) { return (g.day - d) + (g.phase === 'desk' || g.phase === 'title' ? 0 : 1); }
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
const r = e.p ? 1 - Math.pow(0.5, n) : e.l ? 0.2 + 0.8 * Math.pow(0.7, n - 1) : Math.pow(0.7, n - 1);
for (let k = 0; k < 6; k++) es[k] += e.f[k] * r;
});
const sum = [0, 1, 2, 3, 4, 5].map((k) => ps[k] * R.pf * (k === 0 ? R.gf : k === 3 ? R.df : 1) + es[k] * R.evm);
const jobless = Math.max(2.0, 4.3 + sum[1]);
const infl = Math.max(-1, 3.0 + sum[2]);
const gdp0 = BASE_GROWTH + sum[0];
const deficit0 = 5.8 + sum[3] - 0.25 * (gdp0 - BASE_GROWTH);
const appr = this.clamp(48 + R.ab + sum[4] - 2.2 * R.ja * (jobless - 4.3) - 2.0 * (infl - 3.0) + 1.0 * (gdp0 - BASE_GROWTH) - 0.4 * Math.max(0, deficit0 - 12) - 0.06 * g.scand, 3, 92);
const unrest = this.clamp(15 + R.ub + sum[5] + 0.45 * Math.max(0, 45 - appr), 0, 100);
const gdp = gdp0 - 0.02 * Math.max(0, unrest - 40);
return { g: gdp, j: jobless, i: infl, d: 5.8 + sum[3] - 0.25 * (gdp - BASE_GROWTH), a: appr, u: unrest };
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
addEv(g, f, sd, kind) {
const r = f.map((x) => x * (1 + (this.rn(g) * 2 - 1) * (sd || 0)));
const e = { d: g.day, f: r }; if (kind) e[kind] = 1;
g.evs.push(e);
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
g.vet[p.id] = g.day; g.nv += 1;
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
g.inc.push(e); this.addEv(g, ev.base, 0.2); g.evlog.push({ d: g.day, id: sid });
g.hits.push({ d: g.day, st: [e.st], v: sid === 'boom' ? 12 : -20, l: ev.kind + ': ' + ev.title.replace(' {st}', '').replace('{st}', '') });
g.flash.push({ st: e.st, icon: ev.icon });
this.addNews(g, this.evStory(g, sid, e.st));
} else if (m.d > 14 && !g.bond) {
g.bond = true;
const ev = D.EV.bond; const e = { k: 'event', id: 'bond', st: this.pick(g, ev.st) };
g.inc.push(e); this.addEv(g, ev.base, 0.2); g.evlog.push({ d: g.day, id: 'bond' });
g.flash.push({ st: e.st, icon: ev.icon });
this.addNews(g, this.evStory(g, 'bond', e.st));
}
if (m.u >= 72 && !g.inc.some((c) => c.k === 'crisis')) {
const c = { k: 'crisis', fac: 'urban', pol: null, st: this.pick(g, D.FAC.urban.st), esc: 0 };
g.inc.push(c); this.crisisHit(g, c, 1);
}
g.phase = savedPhase;
{ const mm = this.M(g); g.ser.push([g.day, mm.g, mm.j, mm.i, mm.d, mm.a, mm.u].map((v, k) => (k ? Math.round(v * 10) / 10 : v))); }
if (g.inc.length) g.phase = 'incident'; else this.toBrief(g);
}
crisisHit(g, c, scale) {
if (scale >= 1) g.crlog.push({ d: g.day, fac: c.fac, pol: c.pol || '' });
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
if (last) { this.repeal(g, last); this.push(g, 'You repeal "' + this.pol(last.id).t + '', ''); }
else this.push(g, '', '');
this.addEv(g, [0, 0, 0, 0.8, 4, -28], 0.2); g.cong = this.clamp(g.cong - 4, 0, 100);
} else if (i === 2) {
g.over = true; g.ok = 'fled'; this.push(g, '', '');
} else if (i === 3) {
if (g.lvl === 1) throw new Error('');
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
this.addEv(g, o.f, o.sd, o.perm ? 'p' : 'l');
this.push(g, o.res, D.EV[cur.id].text.replace('{st}', D.ST[cur.st][0]) + ' ' + o.desc);
} else {
const F = D.FAC[cur.fac];
const m = this.M(g);
const p = cur.pol ? g.pols.find((x) => x.id === cur.pol && !x.rep) : null;
let ended = false;
if (i === 0) {
if (p) { this.repeal(g, p); this.addEv(g, [0, 0, 0, 0, 3, -20], 0.2, 'l'); this.push(g, 'You repealed "' + this.pol(p.id).t + ''); }
else { this.addEv(g, [0, 0, 0, 0.8, 2, -15], 0.2, 'l'); this.push(g, ''); }
ended = true;
} else if (i === 1) {
const chance = this.odds(m, cur, this.role(g));
if (this.rn(g) < chance) {
if (p) p.s = Math.min(p.s, 0.6);
this.addEv(g, [0, 0, 0, 0.3, 2, -12], 0.2, 'l');
this.push(g, 'Talks succeed. ' + (p ? '' : ''));
ended = true;
} else { this.addEv(g, [0, 0, 0, 0, 0, 4], 0.2, 'l'); this.push(g, '' + F.name.toLowerCase() + ' continues.'); }
} else if (i === 2) {
this.addEv(g, [0, 0, 0, 0, -7 * this.role(g).cap, -18], 0.2, 'l');
if (this.rn(g) < this.role(g).back) { this.addEv(g, [0, 0, 0, 0, -4, 15], 0.2, 'l'); this.push(g, ''); }
else { this.push(g, ''); ended = true; }
} else {
this.addEv(g, [-0.8, 0, 0, 0, -2, 5], 0.2, 'l');
if (this.rn(g) < 0.5) { this.push(g, 'The ' + F.name.toLowerCase() + ''); ended = true; }
else this.push(g, '' + F.name.toLowerCase() + ' drags on.');
}
if (!ended) {
const esc = cur.esc + 1;
if (esc >= 3) { this.addEv(g, [-2, 0.5, 0, 0.5, -6, 10], 0.2, 'l'); this.push(g, ''); }
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
if (!g.imp && g.lvl !== 1 && g.trials < 2 && g.day >= 3 && g.day - g.lastTrial > 4 && m.a < 28 && g.cong < 25) {
g.trials += 1;
g.imp = { st: 'warn', w: g.day, r: 0, conv: this.clamp(Math.round(38 + (30 - g.cong) * 0.9 + (32 - m.a) * 0.6 + g.scand * 0.25 - g.shield), 22, 78) };
g.imp.c0 = g.imp.conv;
this.push(g, '', '');
} else if (g.imp && g.imp.st === 'trial' && g.trialDay !== g.day) { g.phase = 'trial'; return; }
}
if (!g.news.length) this.push(g, '');
}
verdict(g) {
const imp = g.imp;
if (imp.conv >= 67) { imp.done = true; g.over = true; g.ok = 'impeach'; this.push(g, '', ''); }
else {
if (imp.c0 == null || imp.c0 >= 55) g.surv = true;
g.lastTrial = g.day; g.imp = null;
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
if (last) { last.s = Math.min(last.s, 0.5); d -= 6; this.push(g, '' + this.pol(last.id).t + '" to win votes', ''); }
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
if (g.imp && !g.imp.done && g.imp.st === 'trial' && g.day >= g.days && !g.over) this.verdict(g);
if (g.over || g.day >= g.days) { g.phase = 'end'; return; }
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
const sub = { econ: cl(50 + 10 * (mb.g - BASE_GROWTH)), jobs: cl(50 - 15 * (mb.j - 4.3)), prices: cl(100 - 18 * Math.abs(mb.i - 2)), budget: cl(100 - 7 * (mb.d - 1)), appr: cl(mb.a), calm: cl(100 - 1.25 * mb.u) };
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
export function begin(eng, seed, role, days, lvl, unit) {
const g = eng.newGame(seed, days, lvl, unit); g.title = 'President';
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
if (g.lvl === 1) throw new Error('');
if (eng.blocker(g, x.id)) throw new Error('');
g.cap -= x.cost; g.xToday = true; g.xpend = x.id;
g.moot = g.moot || [];
g.memos = g.memos.filter((m, i) => {
if (i < g.mi || !eng.clash(m.id, x.id)) return true;
g.moot.push({ id: m.id, by: x.id }); return false;
});
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
export function runLog(seed, role, log, opts) {
const eng = new Engine();
if (!eng.data().TITLES.some((t) => t.id === role)) throw new Error('unknown role');
if (typeof log !== 'string' || log.length > 600) throw new Error('bad log');
const o = opts || {};
const g = begin(eng, seed, role, o.days, o.lvl, o.unit);
for (const a of tokens(log)) { if (g.phase === 'end') throw new Error(''); applyAction(eng, g, a); }
if (g.phase !== 'end') throw new Error('');
const sc = eng.scoreCard(g);
return { g, sc, cons: eng.grade(sc.cons).letter, lib: eng.grade(sc.lib).letter, needle: Math.round(sc.nd) };
}
export function digest(eng, g) {
const sc = eng.scoreCard(g);
const r1 = (v) => Math.round(v * 10) / 10;
return {
days: g.days, lvl: g.lvl, unit: g.unit || null, day: g.day, over: !!g.over, ok: g.ok || '', surv: !!g.surv,
signed: g.pols.filter((p) => !p.x).map((p) => p.id), repealed: g.pols.filter((p) => p.rep).map((p) => p.id),
vetoed: Object.keys(g.vet), nv: g.nv, xa: g.xdone.slice(), moot: (g.moot || []).map((q) => q.id + '>' + q.by), fu: (g.fulog || []).map((f) => f.d + ':' + f.id + ':' + f.sk + ':' + f.sid),
ev: g.evlog.map((e) => e.d + ':' + e.id), cr: g.crlog.map((c) => c.d + ':' + c.fac + (c.pol ? ':' + c.pol : '')),
trials: g.trials, rev: g.rev, scand: r1(g.scand), cong: r1(g.cong), cap: g.cap,
ser: g.ser, sub: Object.fromEntries(Object.entries(sc.sub).map(([k, v]) => [k, Math.round(v)])), nd: Math.round(sc.nd),
};
}
export function replayPartial(seed, role, log, opts) {
const eng = new Engine();
if (typeof log !== 'string' || log.length > 600) throw new Error('bad log');
const o = opts || {};
const g = begin(eng, seed, role, o.days, o.lvl, o.unit);
if (log.endsWith('x')) log = log.slice(0, -1);
for (const a of tokens(log)) { if (g.phase === 'end') break; applyAction(eng, g, a); }
const sc = eng.scoreCard(g);
return { g, day: g.day, over: g.phase === 'end', score: sc.score, eng };
}
