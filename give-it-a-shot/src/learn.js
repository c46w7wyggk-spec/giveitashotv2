// Plain-language teaching text: the tutorial, the Help screen, and "What does this mean?" for every policy and executive action.
// Pure data and functions (no DOM), shared by the public game and the class version.

export const minutesFor = (days) => {
  const lo = Math.max(3, Math.round(days * 1.0)), hi = Math.round(days * 2.0);
  return lo + '-' + hi + ' minutes';
};
export const daysWord = (d) => d + (d === 1 ? ' day' : ' days');

// ---------------------------------------------------------------- What does this mean? (id -> plain-English explanation)
export const MEAN = {
  // ----- memos
  mw15: 'The minimum wage is the lowest hourly pay an employer is allowed to offer. It is now $7.25 an hour. This bill would raise it to $15, so workers who earn the least get a raise. Employers who cannot afford it might hire fewer people or raise prices.',
  sp: 'Right now most Americans buy health insurance from private companies. "Single-payer" means the government is the only insurer and everyone is covered by one plan, paid for with taxes instead of premiums. People pay less at the doctor, but taxes go up and the government takes on a huge new cost.',
  rc: 'Rent control is a legal limit on how much a landlord can raise the rent each year. Here, no rent could go up more than 3% a year. Renters get stability. Critics say landlords then build and repair less, which can make housing scarcer over time.',
  top70: 'The "top rate" is the tax rate on the highest slice of someone\'s income. This would tax every dollar above $10 million at 70 cents. It raises money from the very rich, but they may move income elsewhere or work and invest less.',
  wealth: 'An income tax charges you for money you earn. A wealth tax charges you every year for what you already own (stocks, property, businesses) if it is worth a lot. This one hits fortunes over $50 million. It is hard to measure what a company or painting is worth, so it is hard to collect.',
  jobg: 'A job guarantee means the government promises a paid job to anyone who wants one and cannot find work. Unemployment would fall, but the government becomes the employer of last resort, which costs money and needs real work for people to do.',
  debt: 'Student loans are money borrowed to pay for college. This one-time bill erases up to $10,000 for each borrower. Borrowers are better off right away, but taxpayers cover the cost, and people who never borrowed or already paid get nothing.',
  gascap: 'A price cap is a legal maximum price. If gas can never cost more than $3.00, drivers pay less. But when the real price of oil is higher, sellers may import less, stations can run short, and lines form.',
  college: 'Tuition is what a college charges for classes. Making public college free means taxpayers cover that bill instead of students. More people can attend, but it costs a lot and mostly helps people who would have gone anyway.',
  ubi: 'A universal basic income (UBI) is a regular payment to every adult, no matter their income. Here it is $1,000 a month. People have more money to spend, but it costs a huge amount and could push prices up.',
  norw: 'A "right-to-work" law says a worker can not be forced to pay union dues, even if the union bargains for the whole workplace. Banning these laws means workers at union workplaces must pay fees. Unions get stronger and better funded.',
  ssx: 'Social Security sends monthly checks to retired people. This bill raises those checks by 20% and pays for it by taxing more of high earners\' pay (lifting the "cap"). Retirees get more, workers who earn a lot pay more.',
  tar25: 'A tariff is a tax on goods that come from other countries. A 25% tariff makes imports cost a quarter more, which protects U.S. factories from foreign competition but also makes goods more expensive for shoppers and invites other countries to tax us back.',
  ccap: 'Credit-card interest is what a bank charges you for borrowing on a card. Capping it at 10% would save borrowers money. Banks might respond by approving fewer people, especially people with weaker credit.',
  frack: 'Fracking ("hydraulic fracturing") is a way of getting oil and gas out of rock by blasting it with water and chemicals. Banning it cuts pollution and risks to groundwater, but domestic energy gets scarcer and gas prices tend to rise.',
  infra: 'Infrastructure means the basic things everyone uses: roads, bridges, internet cables, water pipes. Spending $500 billion builds and repairs these. It creates jobs now and helps the economy later, but it adds to the national debt.',
  prek: 'Pre-K is school for four-year-olds before kindergarten. Making it free for everyone helps kids get ready for school and lets parents work. It costs taxpayers money, and studies disagree on how long the benefits last.',
  mw0: 'The minimum wage is the lowest hourly pay allowed. Abolishing the federal one means employers and states decide on their own. Some workplaces could pay less, some places could hire more cheaply, and the lowest-paid workers lose a safety net.',
  corp15: 'The corporate tax rate is the share of a company\'s profit paid in tax. Cutting it from 21% to 15% leaves businesses with more money to invest and hire with, and makes the U.S. more attractive to companies, but the government collects less.',
  zone: '"Zoning" rules are local laws about what can be built where (for example, only single-family homes). Overriding them lets builders put up apartments near jobs and transit. More housing can lower rents, but neighbors lose control over how their area changes.',
  lic: 'An occupational license is government permission you need before working in certain jobs, like cutting hair or doing interior design. Cutting those requirements makes it easier to start working, but some licenses exist to protect customers\' safety.',
  trade: 'A trade deal lowers the taxes and rules on goods crossing borders. Slashing tariffs makes imports cheaper for shoppers and helps exporters sell abroad, but factories that compete with imports can lose business and jobs.',
  ssp: 'Social Security is the government retirement system that is paid for by taxes on workers\' paychecks. This bill lets younger workers invest part of that tax in their own accounts. The stock market might grow it faster, but it can also fall, and the main system gets less money.',
  age69: 'The retirement age is when you can get full Social Security benefits. Raising it to 69 means people wait longer, which saves the program money. People in physically hard jobs, who may not be able to work longer, are hurt the most.',
  permit: 'Before building something big, like a power plant or power line, companies need government permits. Cutting review times from ten years to two gets things built faster and boosts energy supply, but there is less time for the environmental and safety checks.',
  regs: 'A regulation is a government rule that businesses must follow. A "one-in, two-out" rule says that for each new rule, two old ones must be cancelled. Businesses spend less on paperwork, but some rules that protect safety or the environment could be lost.',
  vouch: 'A school voucher is money from the government that parents can use to pay for any school, public or private. It gives families more choice and makes schools compete, but public schools could lose funding.',
  cut10: 'The federal budget is everything the government spends. Cutting every agency by 10% lowers the deficit, but programs people depend on lose money, and the cuts can slow the economy in the short run.',
  hsa: 'A Health Savings Account (HSA) is a tax-free account used to pay for medical costs. "Price transparency" means hospitals must post their prices. People shop around for care, which can lower costs, but sick people with little savings may struggle.',
  visa: 'A visa lets a foreign worker live and work in the U.S. High-skill visas (like H-1B) go to engineers, doctors and founders. Doubling them brings in talent and starts new companies, but some workers fear competition for jobs.',
  cg0: 'A capital gain is the profit you make when you sell something that went up in value, like stocks or a house. Eliminating the tax on it encourages investing, but it mostly helps wealthy investors and the government collects less.',
  carbon: 'A carbon tax is a fee on burning fuels that release carbon dioxide. Here the money collected is mailed back equally to every household. Pollution gets more expensive, so it falls, and most families get back about what they pay.',
  flat: 'Today the tax system has different rates for different incomes (a "progressive" tax). A flat tax uses one rate for everyone, here 20%. It is simple to file, but it usually shifts the burden from rich households toward middle-income ones.',
  land: 'The federal government owns about a quarter of all U.S. land. Selling what it is not using raises money and puts land to work, but some of it is parks, wildlife areas and places people care about.',
  rtw: 'A "right-to-work" law says no worker can be forced to pay union dues. Making it national weakens unions\' funding and power. Employers see lower labor costs; workers may earn less in union-heavy industries.',
  // ----- executive actions
  consumptax: 'You would stop taxing what people earn and tax what they buy instead (a "consumption tax"). Saving and investing become tax-free, but prices at the checkout jump and low-income families spend a bigger share of their pay on it.',
  nocorptax: 'Corporations normally pay tax on their profits. Abolishing that tax means they keep it all, which attracts business and investment, but the government loses a big source of revenue and shareholders get richer.',
  top90: 'The top marginal rate is the tax on the highest slice of income. At 90% on income above $5 million, almost all of a mega-earner\'s extra pay goes to the government. This was close to the rate in the 1950s.',
  stocktax: 'A financial transaction tax charges a small fee every time a stock is bought or sold. It slows down rapid trading and raises money, but also makes investing a little more expensive for everyone.',
  natvat: 'A value-added tax (VAT) is a sales tax collected at each step of making a product. Most countries have one. It raises a lot of money and is hard to dodge, but it hits everyday purchases, so low-income families feel it most.',
  nopayrollcap: 'Social Security tax is only charged on the first part of your pay (about $170,000 a year). Removing the "cap" means high earners keep paying all year. That brings in much more money for Social Security.',
  startuphol: 'A tax holiday means a break from paying a tax. New businesses would pay no taxes for five years, which helps startups survive, but the government collects less and people may relabel old firms as new.',
  windfall: 'A windfall profits tax takes a large share of unusually big profits, here from oil companies when prices spike. It raises money and punishes price gouging, but may discourage producers from investing in new supply.',
  nopubunion: 'A union is a group of workers who bargain together for pay and conditions. Public-sector unions represent government workers like teachers and sanitation workers. Banning them lowers government labor costs but removes workers\' collective voice.',
  nounions: 'This takes away workers\' right to bargain together as a union anywhere. Every worker must negotiate alone with their employer. Business gets more control over pay and hours, and workers have less bargaining power.',
  nominwage: 'This cancels the federal minimum wage and also state minimums, so employers and workers set pay by agreement. Some jobs may be created, but the lowest-paid workers can end up earning very little.',
  wagefreeze: 'A wage-and-price freeze makes it illegal to raise wages or prices for a set time (here 90 days). It can slow inflation quickly, but shortages can appear because prices cannot adjust to demand.',
  fourday: 'A 32-hour week means working four days instead of five at the same pay. Workers get more free time and may be more productive per hour, but companies pay more per hour worked.',
  ceocap: 'A pay-ratio cap says a CEO can earn at most 50 times what the typical worker earns. It narrows the gap between top and bottom pay, but companies may find ways around it or struggle to hire top managers.',
  job20: 'A federal job guarantee at $20 an hour promises a government job to anyone who wants one. It lowers unemployment and sets a floor for wages across the economy, but it is expensive and needs enough useful work to hand out.',
  otoptout: 'Overtime pay is extra pay (time-and-a-half) for working more than 40 hours a week. Letting workers opt out gives flexibility and cuts business costs, but some workers may be pressured into giving up extra pay.',
  endrc: 'Rent control is a legal cap on how fast rents can rise, set by cities and states. Ending it nationwide lets landlords charge what the market will bear. Housing supply can grow, but current renters may face big increases.',
  nozoning: 'Zoning rules decide what can be built where. Abolishing all local zoning lets builders construct homes, apartments or shops anywhere. More housing can lower rents, but neighbors lose a say in what goes up next door.',
  emptyhomes: 'This taxes houses that sit empty and lets the government take over properties left vacant for a long time. The goal is to put homes to use. Owners lose property they hold as an investment, which raises property-rights concerns.',
  nocorplord: 'This bans big companies from owning single-family homes, so only individuals can. It may help families compete to buy homes, but it can also reduce the number of homes available to rent.',
  nolicense: 'Occupational licenses are government permission slips to work in certain jobs. Abolishing them entirely lets anyone work in any trade, including ones where mistakes can hurt people, like medicine and electrical work.',
  nobuyback: 'A stock buyback is when a company spends its cash to buy back its own shares, which pushes the share price up. Banning buybacks forces companies to spend cash on wages, research, or dividends instead.',
  techbreak: 'Breaking up a company means forcing it to split into several smaller, independent companies. Big tech firms would face more competition, which can mean lower prices and more choice, but also higher costs for the new firms.',
  fdaopen: 'The FDA decides which drugs can be sold in the U.S. This lets drugs approved in other trusted countries be sold here too. New medicines would arrive faster and cheaper, but there would be less U.S. safety review.',
  railnat: 'Nationalizing means the government takes over ownership of a private business. If the government runs the railroads, rail service becomes a public service. It may be more reliable for the public, but taxpayers must pay for it.',
  banknat: 'Nationalizing the largest banks puts them under government ownership. The government controls where loans go and a bank failure can no longer surprise taxpayers, but political leaders now decide who gets credit.',
  tariff40: 'A tariff is a tax on imported goods. At 40% on everything, foreign products cost much more. U.S. factories face less competition, but shoppers pay more and other countries are likely to tax U.S. exports in return.',
  freetrade: '"Free trade" means no tariffs. Declaring it unilaterally means the U.S. drops all of its tariffs whether or not other countries do the same. Imports get cheaper, but some U.S. industries lose out to foreign competitors.',
  postsell: 'Privatizing means selling a public business to private owners. The Postal Service would be run for profit, which could make it more efficient but also raise prices or cut service to rural areas.',
  parksoil: 'National parks are protected public land. Selling oil and gas rights there lets companies drill, which brings money and energy supply, but it also puts scenery and wildlife at risk.',
  gasban: 'This sets a date after which new gas-powered cars can no longer be sold. It cuts pollution over time and speeds up the switch to electric cars, but costs more up front and needs lots of charging stations.',
  drillall: 'This opens every acre of federal land to oil and gas drilling. Energy gets cheaper and more plentiful, but the environmental risks go up. It is an emergency measure, not a long-term energy policy.',
  hushmoney: 'This uses secret payments to keep critics quiet. It is a "power play": it can work in the short run, but if reporters find out, the scandal can wreck a presidency. It is also illegal in most forms.',
  pardonally: 'A pardon cancels someone\'s punishment for a federal crime. Presidents have wide power to pardon. Using it on political allies looks like favoritism and damages trust in the justice system.',
  fedfire: 'The central bank (the Federal Reserve) sets interest rates, and it is meant to be independent of politics. Firing its head and putting in a loyalist can bring lower rates now, but investors may worry about inflation later.',
  emergency: 'A national emergency lets a president use special powers without a vote in Congress. It gets things done fast, but it sidesteps the separation of powers, and critics call it an abuse of authority.',
  presspurch: 'A free press is meant to be independent of the people in power. Having allies buy newspapers to improve coverage is a way of controlling what the public hears. If exposed, it hurts trust in both you and the news.',
  auditcrit: 'The IRS collects taxes and audits returns. Ordering audits of political critics is using a government agency to punish opponents. It is illegal and, if discovered, becomes a major scandal.',
  packcourts: '"Court packing" means adding judges or seats to a court so that it will rule the way you want. It changes the balance of power between the branches of government, and critics call it an attack on judicial independence.',
  cronies: 'A regulator is an agency that enforces rules in an industry. Filling them with friends and donors means the people who are supposed to check powerful interests are loyal to you instead. It can make government less honest.',
};

// ---------------------------------------------------------------- help sections
// Returns [{ h, p: [paragraph, ...] }]. `o`: { days, lvl, cls } (cls = class version).
export function helpSections(o) {
  const core = o.lvl === 1;
  const days = o.days || 14;
  const S = [];
  S.push({ h: 'The goal', p: [
    'You are the President for ' + daysWord(days) + '. Each day you decide on new laws, deal with surprises, and try to leave the country in better shape than you found it. Your score depends on how the economy and the country are doing at the end (about ' + minutesFor(days) + ' of play).',
    'There is no perfect answer. Every choice helps some people and costs others, and that is the point: you will see the trade-offs real governments face.',
  ] });
  S.push({ h: 'How a day works', p: [
    '1. Look at the map and the six meters at the top to see how the country is doing.',
    '2. On your Desk, read each memo (a proposed policy). Tap Sign it to make it law or Veto to reject it.',
    core ? '3. You may also use one executive action per day (see below).' : '3. You may also use one executive action per day (see below), but only if you have enough political capital.',
    '4. Press End the day. Overnight, your laws start to work, news breaks, and sometimes a crisis hits. Then the next day begins.',
  ] });
  S.push({ h: 'The six meters', p: [
    'Economy (GDP growth): how fast the whole economy is growing, as a percent. Higher is better. Negative means a recession.',
    'Unemployment: the percent of people who want a job but cannot find one. Lower is better. Around 4% is healthy.',
    'Inflation: how fast prices are rising. Too high hurts families; too low or negative is a warning sign. About 2% is the usual goal.',
    'Deficit: how much more the government spends than it collects, as a percent of the economy. Lower is better. A big deficit adds to the national debt.',
    'Approval: the percent of people who approve of you. Higher is better. When it is low, Congress and voters turn against you.',
    'Unrest: how angry and unstable the country is, from 0 to 100. Lower is better. Very high unrest can lead to riots or even a revolution.',
    'The small ▲ or ▼ under each number shows how much it changed since the start of the day. Green is good news, red is bad news.',
  ] });
  S.push({ h: 'Your political standing', p: [
    'Capital: your political muscle, shown as gold pips (up to 8). You spend it on executive actions and you earn 1 back each morning.',
    'Congress: how much lawmakers support you, from 0 to 100. When it is high, your laws work at full strength. When it is low, Congress waters them down. Signing bills builds goodwill; vetoing and bold unilateral moves cost it.',
    core ? 'Scandal is not part of this version, so you can focus on the policy trade-offs.' : 'Scandal: how much trouble you are in with reporters and investigators, from 0 to 100. Dirty moves (like hush money or audits of critics) raise it, and it slowly fades if you stay clean. High scandal lowers your score and, combined with a low Congress, can get you impeached.',
  ] });
  S.push({ h: 'Memos (policies)', p: [
    'Each memo is a bill. Tap "What does this mean?" if a word is unfamiliar, and "See the evidence" to see what real studies and both sides say.',
    'The coloured chips show what the policy is expected to do to each meter. Effects build up over about three days, so you will not see the full result at once.',
    'Policies that cover the same issue cannot both be law. For example, once you raise the minimum wage, a bill to abolish it will stop showing up, and the other way around. If you want to switch, you have to repeal the first one (some crises let you do this).',
  ] });
  S.push({ h: 'Executive actions', p: [
    'An executive action is a decision the President makes alone, without waiting for Congress. They are bolder than memos and their effects can be bigger.',
    'Each one costs political capital, so you cannot spam them. You can use only one per day, and each one makes Congress a little less happy.',
    'An executive action settles its issue. If you abolish the income tax, bills about income tax disappear from your desk. If a law you signed already covers an issue, the action that conflicts with it is blocked until you repeal that law.',
    core ? 'Executive actions that are legal grey areas are left out of this version.' : 'Some are "power plays" (hush money, packing courts, firing officials). They are very strong but they feed the Scandal meter, and they might be leaked to the press.',
  ] });
  if (!core) S.push({ h: 'Scandal and impeachment', p: [
    'Scandal climbs when you do shady things and when reporters catch you. It slowly fades if you keep clean, and it takes points off your score.',
    'If Congress is angry at you AND scandal is high, the House can impeach you. The Senate then holds a three-night trial: you need to keep the votes to convict you below 67. You can rally supporters, cut deals, or try dirty tricks that raise scandal even more.',
  ] });
  S.push({ h: 'Events and crises', p: [
    core ? 'Surprises like hurricanes, wars and market swings can hit on some days. Pick the response that fits.' : 'Surprises like hurricanes, wars and market swings can hit on some days. Pick the response that fits. When a group is angry about a policy, a crisis can break out; you can repeal the policy, negotiate, send in the National Guard, or wait it out.',
    'The map shows each state\'s mood. A gold outline means news is happening there.',
  ] });
  S.push({ h: 'The dial and the score', p: [
    'The dial shows whether your policies lean toward a planned economy (government runs more) or a free market (private choices run more). Neither side is "right": it just shows what you chose.',
    'Your score blends where each meter is now (40%) with where it is heading once all your policies fully take effect (60%). You also get two letter grades: one from a conservative point of view and one from a liberal point of view, because they care about different things.',
  ] });
  return S;
}

// ---------------------------------------------------------------- first-play walkthrough
// Each step: { where: 'map'|'desk'|'press', kicker, text, btn }
export function tutorialSteps(o) {
  const core = o.lvl === 1; const days = o.days || 14; const n = core ? 6 : 7;
  const K = (i, t) => i + ' OF ' + n + ' · ' + t;
  const steps = [
    { where: 'map', k: 'WELCOME', text: 'You are the President for ' + daysWord(days) + ' (about ' + minutesFor(days) + '). Each day: check the map and meters, decide on memos, maybe take one executive action, then end the day. At the end you are graded on how the country is doing.', btn: 'Next' },
    { where: 'map', k: 'THE SIX METERS', text: 'The row at the top tracks the country. Economy is growth, Unemployment is people without jobs, Inflation is rising prices, Deficit is overspending, Approval is how much people like you, and Unrest is how angry the country is. The small ▲/▼ shows today\'s change: green is good, red is bad.', btn: 'Next' },
    { where: 'map', k: 'YOUR STANDING', text: core ? 'Below the meters: Capital (gold pips) is what you spend on executive actions, and you earn 1 more each morning. Congress is how much lawmakers support you. High support makes your laws stronger, low support waters them down.' : 'Below the meters: Capital (gold pips) is what you spend on executive actions, and you earn 1 more each morning. Congress is how much lawmakers support you: high makes your laws stronger. Scandal is how much trouble you are in with the press: dirty moves raise it, and high scandal plus an angry Congress can get you impeached.', btn: 'Go to my Desk' },
    { where: 'desk', k: 'MEMOS', text: 'Memos are proposed laws. Sign to enact, veto to reject. No bill comes up twice, and some only appear because of what you decided earlier: a note on the memo tells you why. The chips show the expected effect on each meter over about three days. Not sure what a policy is? Tap "What does this mean?", and "See the evidence" shows real data and both sides. Policies on the same issue cannot both pass, and once one is law the rival bills stop appearing.', btn: 'Next' },
    { where: 'desk', k: 'EXECUTIVE ACTIONS', text: 'The panel next to your memos holds unilateral moves, like abolishing a tax. They cost capital, you can do one a day, and they make Congress a bit less happy. They also settle the issue: abolish the income tax and income-tax memos stop showing up. ' + (core ? 'Pick the ones that fit your goals.' : '"Power plays" are very strong but add scandal and can leak.'), btn: 'Next' },
    { where: 'press', k: 'THE PRESS AND SURPRISES', text: 'After you end the day, read the headlines and the left and right op-eds here to see how each side reacts. ' + (core ? 'Disasters and surprises can strike, so keep an eye on the meters.' : 'Disasters, wars and angry groups can force a crisis. If Congress and scandal both turn on you, an impeachment trial begins and you can fight it.') + ' The Help button (?) at the top has all of this any time.', btn: 'Got it, back to work' },
  ];
  // the optional 7th step in standard mode explains the score
  if (!core) steps.splice(5, 0, { where: 'desk', k: 'THE DIAL AND SCORE', text: 'The dial shows whether your choices lean toward a planned economy or a free market. Neither is "right": it is just a record. Your score is based on how all six meters finish, including where they are headed once your policies fully work.', btn: 'Next' });
  return steps.map((s, i) => ({ where: s.where, kicker: K(i + 1, s.k), text: s.text, btn: s.btn }));
}
