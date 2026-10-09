// Give It A Shot — deterministic game engine. Shared by the browser and the submit-score edge function.
// Same seed + same action log => same game, same score. Bump ENGINE_VERSION on ANY change that alters outcomes.
import { XA } from './xactions.js';
import { POL2, BASE_TOPIC, BASE_SYS, BASE_KILL, AP_UNITS } from './policies.js';
export const ENGINE_VERSION = 6;
export const MIN_DAYS = 3, MAX_DAYS = 28;
export const BASE_GROWTH = 2; // trend GDP growth (%) when nothing is done

export class Engine {
  data() {
    if (this._D) return this._D;
    const KEYS = ['g', 'j', 'i', 'd', 'a', 'u'];
    // f = [GDP %, jobless pt, inflation pt, deficit % GDP, approval, unrest]
    const POL = [
      { id: 'mw15', t: 'Raise the federal minimum wage to $15', m: 'Labor wants a national $15 floor, effective immediately.', lean: -2, f: [-0.5, 0.8, 0.5, 0, 4, 1], sd: 0.5, ang: ['business', 0.3], who: ['TX', 'GA', 'KY', 'PA', 'WI', 'IA'], wd: 4,
        real: 'CBO (2021) projected a $15 floor would raise pay for ~17M workers and lift ~0.9M out of poverty, at a cost of ~1.4M jobs (central estimate).',
        pro: 'Raises pay for millions; job losses are small in most studies.', con: 'Hits the least-skilled hardest, especially in low-wage states.',
        hl: 'Texass cashiers get a raise. Texass self-checkout gets a promotion.' },
      { id: 'sp', t: 'Replace private insurance with single-payer', m: 'One government plan for everyone. No premiums, no networks, one very large form.', lean: -3, f: [-1.2, 0.5, 0, 4, 4, 2], sd: 0.7, ang: ['business', 0.45], who: ['FL', 'MI', 'NY', 'OH'], wd: 2,
        real: 'Estimates split wildly: a 2020 Lancet study found ~13% lower national health spending; Mercatus (2018) found ~$32T more federal spending over 10 years.',
        pro: 'Universal coverage and lower admin costs; peer countries spend far less per person.', con: 'Needs enormous tax increases and could squeeze provider pay and access.',
        hl: 'Michi-gone applauds free healthcare. Flori-duh waiting-room chairs scheduled for 2031.' },
      { id: 'rc', t: 'Impose national rent control (3% annual cap)', m: 'Rents may not rise more than 3% a year anywhere in the country.', lean: -2, f: [-0.3, 0.1, -0.3, 0, 4, 1], sd: 0.6, ang: ['business', 0.3], who: ['NY', 'CA', 'OR', 'MA', 'CO'], wd: 4,
        real: 'A Stanford study of San Francisco found rent control cut landlords\' rental supply ~15% and raised citywide rents ~5%.',
        pro: 'Protects tenants from sudden spikes and displacement.', con: 'Shrinks supply over time, which raises rents for everyone else.',
        hl: 'Newer York tenants cheer. Newer York landlords rebrand every apartment as "luxury storage."' },
      { id: 'top70', t: 'Raise the top income tax rate to 70%', m: 'Income above $10M is taxed at 70 cents on the dollar.', lean: -2, f: [-0.8, 0.2, 0, -1.2, 2, 1], sd: 0.6, ang: ['business', 0.4], who: ['NY', 'CA', 'MA'], wd: -3,
        real: 'Estimates of the revenue-maximizing top rate run from ~40% (large behavioral response) to ~73% (Saez and coauthors).',
        pro: 'Raises revenue from those best able to pay.', con: 'Pushes income into avoidance; revenue may fall short.',
        hl: 'Taxachusetts CPAs buy yachts. Nevada Vegas residency applications triple.' },
      { id: 'wealth', t: 'Levy a 2% wealth tax on fortunes over $50M', m: 'An annual tax on net worth, not income. The yachts have been notified.', lean: -2, f: [-0.5, 0, 0, -0.8, 3, 1], sd: 0.9, ang: ['business', 0.35], who: ['CA', 'NY', 'NV'], wd: -2,
        real: 'Estimates for a 2%/3% plan run from ~$3T over 10 years (Saez-Zucman) to far less once avoidance is modeled; most European countries that tried wealth taxes repealed them.',
        pro: 'Hits concentrated wealth that income taxes miss.', con: 'Hard to value assets and easy to dodge; capital can move.',
        hl: 'Billionaire moving vans sell out. Alaska-Ching offers "dividend-free" residency.' },
      { id: 'jobg', t: 'Guarantee a federal job to anyone who wants one', m: 'Any adult can show up at the post office and get a government job.', lean: -3, f: [0.2, -1.3, 0.6, 2.2, 4, -1], sd: 0.8, ang: ['business', 0.15], who: ['OH', 'KY', 'LA', 'MI'], wd: 3,
        real: 'No economy has run one nationally; cost estimates run to hundreds of billions per year depending on the wage and take-up.',
        pro: 'A floor under unemployment that also builds public goods.', con: 'Hard to administer, and may pull workers away from private firms.',
        hl: 'Ohi-NO gains four million new Assistant Regional Coordinators of Coordination.' },
      { id: 'debt', t: 'Cancel $10,000 of student debt per borrower', m: 'One-time relief for everyone with federal loans.', lean: -2, f: [0.1, 0, 0.3, 1.2, 3, -1], sd: 0.4, ang: null, who: ['MA', 'CO', 'VA', 'WA'], wd: 2,
        real: 'CBO priced the 2022 plan near $400B; analyses find the benefits skew toward people with college degrees and higher lifetime earnings.',
        pro: 'Relief for borrowers and a boost to household spending.', con: 'Costly, skews to graduates, and adds a little inflation.',
        hl: 'Graduates cheer. Plumbers send a polite invoice.' },
      { id: 'gascap', t: 'Cap the price of gasoline at $3.00', m: 'Pump prices may not exceed $3.00 a gallon. Physics has been notified.', lean: -2, f: [-0.5, 0.1, -0.8, 0, 4, 4], sd: 0.8, ang: ['urban', 0.5], who: ['LA', 'TX', 'GA'], wd: 1,
        real: 'US price controls in the 1970s produced shortages and gas lines; most economists oppose caps.',
        pro: 'Instant relief at the pump.', con: 'Shortages and long lines, as in the 1970s.',
        hl: 'Looseiana freezes pump prices. The lines did not get the memo.' },
      { id: 'college', t: 'Make public college tuition-free', m: 'Tuition at public colleges drops to zero. Parking stays at $900.', lean: -2, f: [0.2, 0, 0, 1, 3, -1], sd: 0.5, ang: null, who: ['WI', 'MN', 'MA'], wd: 2,
        real: 'Cost estimates run roughly $50-80B a year; enrollment rises, but gains skew toward middle-income families.',
        pro: 'Opens college to more families without debt.', con: 'Subsidizes people who would attend anyway; crowds campuses.',
        hl: 'Cheesconsin announces free tuition. Cheesconsin announces a seat limit of 12.' },
      { id: 'ubi', t: 'Mail every adult $1,000 a month', m: 'A universal basic income, delivered by the Postal Service.', lean: -3, f: [0.2, 0.5, 1.0, 5.5, 6, -2], sd: 0.7, ang: null, who: ['AK', 'NM', 'KY'], wd: 3,
        real: 'The 2024 OpenResearch trial of $1,000/month found recipients worked ~1.3 fewer hours a week and employment fell ~2 points, while spending on basic needs rose.',
        pro: 'Cuts poverty with little bureaucracy.', con: 'Enormous cost; may reduce work and push up prices.',
        hl: 'Alaska-Ching: "We have been doing this since 1982."' },
      { id: 'norw', t: 'Ban right-to-work laws nationwide', m: 'Workers at union shops must pay union fees. Everywhere.', lean: -1, f: [-0.2, 0.1, 0, 0, 1, 1], sd: 0.6, ang: ['business', 0.3], who: ['TX', 'GA', 'UT', 'KS'], wd: -2,
        real: 'Research is mixed: unions raise member pay roughly 10%, with unclear effects on overall employment.',
        pro: 'Strengthens bargaining power and lifts pay.', con: 'Forces fees on unwilling workers; may deter new factories.',
        hl: 'Kansastic unions celebrate. Kansastic factories send a very polite letter.' },
      { id: 'ssx', t: 'Expand Social Security benefits by 20%', m: 'Bigger checks for every retiree, paid by lifting the payroll tax cap.', lean: -2, f: [-0.2, 0.1, 0.2, 0.4, 4, 0], sd: 0.5, ang: null, who: ['FL', 'AZ', 'PA'], wd: 4,
        real: 'The trustees project the trust funds face a shortfall in the mid-2030s absent changes.',
        pro: 'Boosts retirement security for low earners.', con: 'Worsens long-run solvency unless taxes rise a lot.',
        hl: 'Flori-duh retirees cheer. Flori-duh shuffleboard courts upgrade to premium.' },
      { id: 'tar25', t: 'Impose 25% tariffs on imports', m: 'A broad tariff to bring factories home and raise revenue.', lean: -1, f: [-0.8, 0.2, 1.0, -0.6, -3, 2], sd: 0.6, ang: ['farmers', 0.45], who: ['IA', 'NE', 'KS', 'ND'], wd: -4,
        real: 'Studies of the 2018-19 US tariffs found costs passed almost fully to US firms and consumers; farmers needed tens of billions in aid after retaliation.',
        pro: 'Protects strategic industries and raises revenue.', con: 'Taxes your own consumers and invites retaliation.',
        hl: 'Iowa-ay soybeans: sold to nobody, subsidized by everybody.' },
      { id: 'ccap', t: 'Cap credit-card interest at 10%', m: 'No card may charge more than 10% APR.', lean: -2, f: [-0.2, 0, 0, 0, 5, 0], sd: 0.5, ang: ['business', 0.25], who: ['NY', 'MA', 'NV'], wd: 2,
        real: 'Rate caps in other countries tended to cut credit access for riskier borrowers.',
        pro: 'Stops debt traps and ends sky-high rates.', con: 'Lenders will deny cards to the people who need credit most.',
        hl: 'Taxachusetts banks discover the annual fee for having a credit limit.' },
      { id: 'frack', t: 'Ban fracking on all land', m: 'No new hydraulic fracturing permits anywhere in the country.', lean: -2, f: [-0.9, 0.4, 1.0, 0, -2, 2], sd: 0.6, ang: ['energy', 0.5], who: ['TX', 'ND', 'PA', 'NM', 'LA'], wd: -5,
        real: 'Fracking drove the US shale boom and made the US a net petroleum exporter; the climate benefit depends on what replaces gas (coal or renewables).',
        pro: 'Cuts emissions and local pollution risks.', con: 'Raises energy prices and hits oil-patch jobs.',
        hl: 'Texass oil patch sends a strongly worded country song.' },
      { id: 'infra', t: 'Pass a $500B infrastructure bill', m: 'Roads, bridges, broadband, and one (1) very special rest stop.', lean: -1, f: [0.5, -0.2, 0.2, 1.5, 3, 0], sd: 0.6, ang: null, who: ['PA', 'MI', 'OH', 'IL'], wd: 2,
        real: 'Estimates of the infrastructure spending multiplier run from below 1 to well above 1, depending on slack and project quality.',
        pro: 'Boosts jobs now and productivity later.', con: 'Slow, costly, and prone to waste and delays.',
        hl: 'Pennsyl-vanity finally fixes the pothole. Consultants publish 600 pages about it.' },
      { id: 'prek', t: 'Launch universal pre-K', m: 'Free preschool for every four-year-old.', lean: -1, f: [0.1, 0, 0, 0.7, 3, 0], sd: 0.5, ang: null, who: ['MN', 'MA', 'WA'], wd: 2,
        real: 'Evidence is mixed: small programs (Perry, Abecedarian) show strong benefits, while Tennessee\'s statewide program showed fade-out and later negative effects.',
        pro: 'Early learning pays off for kids and parents\' careers.', con: 'Large programs often fail to match small-scale successes.',
        hl: 'Four-year-olds in Minnesnowta demand a union. Nap time is protected.' },

      { id: 'mw0', t: 'Abolish the federal minimum wage', m: 'Let states and employers set their own floors.', lean: 2, f: [0.2, -0.3, -0.1, 0, -5, 3], sd: 0.6, ang: ['labor', 0.45], who: ['ID', 'WY', 'ND', 'UT', 'KS'], wd: -3,
        real: 'Most states already set floors above $7.25, so effects would concentrate in the ~20 states at the federal floor; the research on job effects is divided.',
        pro: 'Lets wages fit local conditions and costs.', con: 'Cuts pay at the bottom, where bargaining power is weakest.',
        hl: 'Spudaho: $0 wage floor, $0 apologies.' },
      { id: 'corp15', t: 'Cut the corporate tax rate to 15%', m: 'From 21% down to 15%, to compete for headquarters.', lean: 2, f: [0.6, -0.2, 0.1, 0.7, -1, 1], sd: 0.6, ang: null, who: ['NY', 'MA', 'TX'], wd: -1,
        real: 'After the 2017 cut, investment rose modestly; most studies find the cut recouped only part of its cost.',
        pro: 'Draws investment and raises wages over time.', con: 'Loses revenue and mostly benefits shareholders in the short run.',
        hl: 'Newer York C-suites buy bigger buybacks. Economists argue about "trickle."' },
      { id: 'zone', t: 'Override local zoning to allow more housing', m: 'Cities can no longer ban apartments near jobs and transit.', lean: 2, f: [0.5, -0.1, -0.4, 0, 1, 2], sd: 0.7, ang: null, who: ['CA', 'OR', 'CO', 'MA', 'NY'], wd: 0,
        real: 'Studies link housing constraints in high-productivity metros to lower national growth (magnitudes are debated); Auckland\'s upzoning slowed rent growth relative to similar cities.',
        pro: 'More housing, lower rents, and mobility to better jobs.', con: 'Neighborhood character, traffic and strain on local services.',
        hl: 'Californication approves one apartment, then holds a hearing about its shadow.' },
      { id: 'lic', t: 'Cut occupational licensing requirements', m: 'Hair braiders, florists and interior designers may work without a license.', lean: 1, f: [0.3, -0.3, -0.1, 0, 0, 1], sd: 0.6, ang: null, who: ['UT', 'NV', 'AZ'], wd: 1,
        real: 'About one in five US workers needs a license; research finds licensing raises pay for those licensed but limits entry and mobility.',
        pro: 'Opens jobs to newcomers and lowers prices.', con: 'Some licenses protect safety, and quality can slip.',
        hl: 'Utah-pia abolishes the hair-braiding license. Barbers form a rock band.' },
      { id: 'trade', t: 'Slash tariffs and sign a big trade deal', m: 'Open the borders to cheaper goods and bigger export markets.', lean: 2, f: [0.5, 0.2, -0.5, 0.2, -1, 2], sd: 0.6, ang: ['labor', 0.3], who: ['MI', 'OH', 'PA', 'WA'], wd: -2,
        real: 'Most economists find net gains, but studies of the "China shock" show concentrated, persistent job losses in affected regions.',
        pro: 'Cheaper goods, bigger markets, more growth overall.', con: 'Concentrated losses in factory towns that never fully recover.',
        hl: 'Michi-gone gets cheaper cars and fewer factory shifts.' },
      { id: 'ssp', t: 'Let workers divert Social Security into private accounts', m: 'Younger workers may invest part of their payroll tax.', lean: 2, f: [0.2, 0, 0, 1.2, -5, 3], sd: 0.8, ang: ['retirees', 0.45], who: ['FL', 'AZ', 'PA'], wd: -4,
        real: 'Transition costs run into the trillions; Chile\'s private-account system has been repeatedly revised after complaints about low pensions.',
        pro: 'Ownership, choice and potentially higher returns.', con: 'Market risk lands on retirees, and the transition is expensive.',
        hl: 'Flori-duh retirees discover they have strong opinions about index funds.' },
      { id: 'age69', t: 'Raise the retirement age to 69', m: 'Full benefits start later, to stretch the trust fund.', lean: 1, f: [0.1, 0.1, 0, -0.8, -4, 2], sd: 0.5, ang: ['retirees', 0.35], who: ['FL', 'AZ', 'KY', 'PA'], wd: -3,
        real: 'Longevity gains have been uneven by income, so a higher age cuts lifetime benefits more for lower earners.',
        pro: 'Improves solvency without raising taxes.', con: 'Hardest on manual workers who cannot work longer.',
        hl: 'Kentuckyard roofers ask whether 69 is a joke. It is not.' },
      { id: 'permit', t: 'Fast-track permits for nuclear and transmission lines', m: 'Cut review times from a decade to two years.', lean: 1, f: [0.4, -0.1, -0.2, 0, 0, 1], sd: 0.6, ang: null, who: ['GA', 'VA', 'TX'], wd: 2,
        real: 'US nuclear and transmission projects take far longer and cost more than abroad; reform has bipartisan backing but disputed safeguards.',
        pro: 'Cheaper, cleaner power and faster building.', con: 'Fewer environmental reviews and less local input.',
        hl: 'Georgia-ish builds a reactor in seven years. Record!' },
      { id: 'regs', t: 'Adopt a one-in, two-out rule for federal regulations', m: 'Every new rule must repeal two old ones.', lean: 1, f: [0.3, -0.1, 0, 0, -1, 0], sd: 0.8, ang: null, who: ['TX', 'UT', 'ID'], wd: 1,
        real: 'Agency analyses find most major rules\' benefits exceed their costs in aggregate, but quality varies; counting rules is not the same as measuring them.',
        pro: 'Forces the government to prune old rules.', con: 'Counts rules rather than costs; may block good ones.',
        hl: 'Bureaucrats respond with one 4,000-page rule replacing two 2,000-page rules.' },
      { id: 'vouch', t: 'Create national school vouchers', m: 'Public money follows the child to any school.', lean: 2, f: [0.1, 0, 0, 0.4, -1, 2], sd: 0.7, ang: ['labor', 0.3], who: ['WI', 'IA', 'LA', 'AZ'], wd: 0,
        real: 'Evidence is mixed: some voucher programs lowered test scores, others raised graduation rates.',
        pro: 'Choice and competition for stuck families.', con: 'Can drain public schools and mixed results so far.',
        hl: 'Iowa-ay parents shop for schools like they are hotels.' },
      { id: 'cut10', t: 'Cut federal spending 10% across the board', m: 'Every agency trims 10%. No exceptions, except the exceptions.', lean: 2, f: [-0.9, 0.5, -0.2, -2.2, -5, 3], sd: 0.6, ang: ['labor', 0.3], who: ['VA', 'PA', 'NM'], wd: -3,
        real: 'Short-run fiscal multipliers are typically 0.5-1.5, so fast cuts shrink output now in exchange for lower debt later.',
        pro: 'Stabilizes debt and shrinks the government\'s footprint.', con: 'Costs jobs and growth in the short run.',
        hl: 'Kansastic balances the budget. Kansastic road crews tape cones to each other.' },
      { id: 'hsa', t: 'Overhaul health care with HSAs and price transparency', m: 'People shop for care with their own tax-free accounts.', lean: 1, f: [0.2, 0, 0, 0.2, 1, 0], sd: 0.6, ang: null, who: ['UT', 'TX', 'AZ'], wd: 1,
        real: 'The RAND experiment found cost-sharing cuts spending but also cuts use of needed care, not just wasteful care.',
        pro: 'Gives patients prices and a reason to compare.', con: 'People skip needed care, and sick patients cannot shop in an emergency.',
        hl: 'Utah-pia patients comparison-shop an appendectomy. The appendix does not wait.' },
      { id: 'visa', t: 'Double high-skill visas', m: 'Expand H-1B and green cards for engineers, doctors and founders.', lean: 1, f: [0.6, -0.1, 0, -0.2, -1, 1], sd: 0.6, ang: null, who: ['WA', 'CA', 'MA', 'VA'], wd: 1,
        real: 'Immigrants are over-represented among US inventors and startup founders; wage effects on similar US workers are small in most studies.',
        pro: 'Brings talent and creates jobs and startups.', con: 'Competition for some workers and local housing strain.',
        hl: 'Washingtoon gets 10,000 engineers. Washingtoon rents respond accordingly.' },
      { id: 'cg0', t: 'Eliminate the capital gains tax', m: 'Profits from selling assets are no longer taxed.', lean: 2, f: [0.4, -0.1, 0, 1, -3, 2], sd: 0.6, ang: null, who: ['NY', 'CA', 'NV'], wd: -2,
        real: 'Taxpayers do respond (they realize gains differently), but most estimates still show net revenue loss.',
        pro: 'Encourages investment and ends lock-in effects.', con: 'Mostly benefits the wealthy and costs revenue.',
        hl: 'Nevada Vegas: "The house always wins, and now so does the portfolio."' },
      { id: 'carbon', t: 'Enact a carbon tax with equal dividends', m: 'Tax emissions and mail the revenue to every household.', lean: 1, f: [-0.2, 0.1, 0.5, 0, -1, 1], sd: 0.6, ang: ['energy', 0.3], who: ['ND', 'LA', 'TX', 'WY'], wd: -2,
        real: 'Economists across the spectrum favor carbon pricing in principle; dividends leave many lower-income households whole in several studies.',
        pro: 'Cuts emissions at the lowest cost with no bureaucracy.', con: 'Raises energy prices now; rural and energy states bear more.',
        hl: 'Dakota Dakota sends the check back. Dakota Dakota is told it is a dividend.' },
      { id: 'flat', t: 'Replace the income tax with a 20% flat tax', m: 'One rate, one page, one very upset tax attorney.', lean: 2, f: [0.3, -0.1, 0, 1, -2, 1], sd: 0.7, ang: null, who: ['KS', 'UT', 'TX'], wd: 0,
        real: 'Estimates generally show growth gains but large revenue losses unless the base is broadened.',
        pro: 'Simpler and removes the penalty on extra work.', con: 'Shifts the burden down and loses revenue.',
        hl: 'Tax preparers hold a candlelight vigil. Taxpayers hold a parade.' },
      { id: 'land', t: 'Sell off unused federal land and assets', m: 'The government sells what it is not using.', lean: 1, f: [0.1, 0, 0, -0.5, -2, 1], sd: 0.6, ang: null, who: ['WY', 'MT', 'ID', 'UT', 'NM'], wd: -3,
        real: 'The federal government owns ~28% of US land, mostly in the West; sales raise one-time revenue but spark fierce local fights.',
        pro: 'One-time revenue and more land in productive use.', con: 'Loses public access and open space forever.',
        hl: 'Wyo-Mingle: "Sold!" Wyo-Mingle: "Sold what?"' },
      { id: 'rtw', t: 'Make right-to-work the law of the land', m: 'No worker can be forced to pay union dues.', lean: 1, f: [0.2, -0.1, 0, 0, -1, 2], sd: 0.6, ang: ['labor', 0.35], who: ['MI', 'OH', 'IL', 'PA'], wd: -3,
        real: 'Right-to-work states show lower union membership and, in some studies, lower wages, though causality is hard to establish.',
        pro: 'Worker choice and a pitch to new factories.', con: 'Weakens unions and bargaining power; free-rider issues.',
        hl: 'Illinoise unions picket. Illinoise picket-line coffee costs $7.'}
    ];
    const DIS_OPTS = [
      { label: 'Fund a full federal rebuild', desc: 'Washington writes the check and the bulldozers arrive within the week.', f: [0.2, -0.1, 0, 1.2, 5, -3], sd: 0.3, res: 'The Treasury writes a very large check. The cameras love it.' },
      { label: 'Send block grants and let insurers lead', desc: 'A smaller federal share; states and insurance companies handle the rest.', f: [-0.3, 0, 0, 0.4, 1, 1], sd: 0.4, res: 'Paperwork replaces plywood. Rebuilding is slow but affordable.' },
      { label: 'Send thoughts and prayers', desc: 'No new money. Maximum sympathy.', f: [-0.8, 0.2, 0, 0, -8, 6], sd: 0.3, res: 'Voters notice the absence of anything else.' }
    ];
    const EV = {
      hurricane: { kind: 'Natural disaster', title: 'Hurricane hits {st}', text: 'A Category 4 storm flattens the coast. Roofs are now optional.', st: ['FL', 'LA', 'GA'], icon: 'storm', base: [-1.0, 0.3, 0.2, 0, 0, 4], real: 'Hurricane Katrina (2005) caused roughly $125B in damage, about 1% of GDP; Congress usually funds relief after the fact.', opts: DIS_OPTS, hl: 'Hurricane batters {st}' },
      quake: { kind: 'Natural disaster', title: 'Earthquake rattles {st}', text: 'Buildings sway, servers fall over, and a warehouse of avocados is lost.', st: ['CA', 'WA', 'AK'], icon: 'storm', base: [-0.9, 0.3, 0.1, 0, 0, 4], real: 'Major quakes cost tens of billions in damage; insured losses are often a fraction of the total.', opts: DIS_OPTS, hl: 'Earthquake shakes {st}' },
      fire: { kind: 'Natural disaster', title: 'Wildfires scorch {st}', text: 'Smoke turns the sky orange and the insurers write a very sad letter.', st: ['OR', 'CO', 'CA'], icon: 'storm', base: [-0.7, 0.2, 0.1, 0, 0, 4], real: 'Recent US wildfire seasons have caused tens of billions in damage and pushed insurers out of high-risk areas.', opts: DIS_OPTS, hl: 'Wildfires scorch {st}' },
      tornado: { kind: 'Natural disaster', title: 'Tornado outbreak across {st}', text: 'A line of storms rips across the plains. Barns are now abstract art.', st: ['KS', 'MO', 'NE'], icon: 'storm', base: [-0.6, 0.2, 0.1, 0, 0, 3], real: 'Severe-storm outbreaks regularly cause billions in damage; federal disaster aid typically covers a large share of rebuilding.', opts: DIS_OPTS, hl: 'Tornadoes hit {st}' },
      war_oil: { kind: 'War abroad', title: 'War erupts in the oil-producing region', text: 'Crude jumps 40% overnight. Every gas-station sign in {st} now reads like a typo.', st: ['TX', 'LA', 'ND'], icon: 'flame', base: [-0.4, 0.1, 1.2, 0, -1, 2], real: 'In 2022, Brent crude topped $120 after Russia invaded Ukraine, and US gasoline averaged above $5 a gallon by June.',
        opts: [
          { label: 'Release the Strategic Petroleum Reserve', desc: 'Dump oil on the market to cool prices. Works fast, refills expensively.', f: [0.1, 0, -0.7, 0.1, 2, 0], sd: 0.4, res: 'Pump prices dip. The reserve now has echoes.' },
          { label: 'Cap gasoline prices', desc: 'Declare a ceiling. Reality may decline to obey.', f: [-0.5, 0.1, -1.0, 0, 3, 4], sd: 0.6, res: 'The price is capped. The gasoline is, sadly, also capped.' },
          { label: 'Fast-track domestic drilling permits', desc: 'Slower, but real supply. Environmental groups will be furious.', f: [0.2, -0.1, -0.4, 0, 1, 1], sd: 0.5, perm: 1, res: 'Rigs come back online by spring. Spring is a long way away.' },
          { label: 'Do nothing', desc: 'Let the market clear. Voters feel every cent.', f: [-0.4, 0.1, 0.4, 0, -3, 3], sd: 0.4, res: 'The market clears. Your approval rating does too.' }
        ], hl: 'War abroad sends oil soaring' },
      war_ally: { kind: 'War abroad', title: 'Ally invaded: Congress waits on you', text: 'A friendly democracy is under attack. Phones ring. Every phone is a lobbyist.', st: ['VA', 'AK', 'GA'], icon: 'flame', base: [-0.2, 0, 0.4, 0, 0, 1], real: 'Wars raise defense spending and commodity prices, and sanctions can reshape trade for years.',
        opts: [
          { label: 'Send a large aid package', desc: 'Weapons, money and a strongly worded speech.', f: [0.2, 0, 0, 1.0, 1, 0], sd: 0.4, res: 'Defense contractors send flowers. The deficit sends a bill.' },
          { label: 'Impose sanctions only', desc: 'Squeeze the aggressor, leave the troops home.', f: [-0.2, 0, 0.4, 0, 0, 0], sd: 0.5, res: 'Global supply chains develop a new personality.' },
          { label: 'Stay neutral', desc: 'Not our war. Not our bill.', f: [0, 0, 0, 0, -3, 1], sd: 0.4, res: 'Allies sigh. Isolationists send a thank-you card.' }
        ], hl: 'Ally invaded, capital in uproar' },
      pandemic: { kind: 'Public health', title: 'A fast-spreading flu hits the country', text: 'Hospitals fill, offices empty, and every grocery store sells out of toilet paper again.', st: ['NY', 'WA', 'FL'], icon: 'storm', base: [-1.0, 0.6, 0, 0, -2, 2], real: 'COVID-19 shrank US GDP ~31% annualized in Q2 2020 and pushed unemployment to ~14.7% in April 2020.',
        opts: [
          { label: 'Order a national lockdown', desc: 'Stop the spread, stop the economy. Lives saved, businesses shuttered.', f: [-2.0, 2.0, 0, 0.5, -3, 6], sd: 0.4, res: 'The curve flattens. So does the GDP.' },
          { label: 'Fund testing, tracing and free vaccines', desc: 'Spend on public health and keep as much open as possible.', f: [-0.5, 0.2, 0, 0.8, 3, -1], sd: 0.5, res: 'Lines at clinics; fewer lines at funerals.' },
          { label: 'Keep everything open', desc: 'Personal responsibility, maximum liberty.', f: [-0.3, 0, 0, 0, -5, 4], sd: 0.5, res: 'Businesses stay open. Hospitals do not stay empty.' }
        ], hl: 'Flu spreads nationwide' },
      boom: { kind: 'Good news', title: 'AI productivity boom lifts the markets', text: 'Stocks soar, gadgets get smarter, and every startup is "like Uber, but for toast."', st: ['WA', 'CA', 'MA'], icon: null, base: [1.5, -0.3, 0.3, 0, 2, 0], real: 'The 1990s productivity boom raised US growth for years; the gains were not evenly shared.',
        opts: [
          { label: 'Tax the windfall', desc: 'Capture some of the gains for the Treasury.', f: [-0.4, 0, 0, -0.8, -1, 0], sd: 0.4, res: 'The Treasury smiles. The founders hire accountants.' },
          { label: 'Let it ride', desc: 'Do nothing and let the boom do its thing.', f: [0.6, 0, 0, 0, 1, 1], sd: 0.4, res: 'The boom booms. Inequality grumbles.' },
          { label: 'Fund worker retraining', desc: 'Spend some of the upside so that displaced workers can keep up.', f: [0, -0.3, 0, 0.4, 2, 0], sd: 0.5, res: 'Community colleges fill up. So do the yoga studios.' }
        ], hl: 'AI boom lifts stocks' },
      crash: { kind: 'Financial shock', title: 'Markets crash, a major bank wobbles', text: 'The ticker is a sea of red and a very large bank has politely stopped answering calls.', st: ['NY', 'MA', 'NV'], icon: 'storm', base: [-1.2, 0.6, 0, 0, -3, 3], real: 'In 2008, Congress authorized $700B in bank rescues (most was repaid); Lehman\'s failure preceded the deepest recession since the 1930s.',
        opts: [
          { label: 'Bail out the big banks', desc: 'Calm the markets, anger Main Street.', f: [0.8, 0, 0, 1.2, -6, 4], sd: 0.4, res: 'Markets rally. Main Street grumbles in six directions.' },
          { label: 'Let it fail', desc: 'Moral hazard dies. So might some jobs.', f: [-1.8, 1.5, 0, 0, -2, 6], sd: 0.5, res: 'Moral hazard is eliminated. So are some paychecks.' },
          { label: 'Guarantee deposits only', desc: 'Protect savers, not shareholders.', f: [0.2, 0, 0, 0.5, -1, 1], sd: 0.5, res: 'Depositors relax. Shareholders send a sad email.' }
        ], hl: 'Markets crash, bank wobbles' },
      cyber: { kind: 'Security', title: 'Cyberattack hits the power grid', text: 'Lights flicker and servers panic, and somewhere a hacker is eating a Hot Pocket.', st: ['TX', 'GA', 'VA'], icon: 'flame', base: [-0.6, 0.1, 0.2, 0, -2, 2], real: 'The 2021 Colonial Pipeline hack triggered panic buying across the Southeast.',
        opts: [
          { label: 'Mandate federal security standards', desc: 'Make utilities harden their systems on a deadline.', f: [0.2, 0, 0, 0.3, 2, 0], sd: 0.4, perm: 1, res: 'Utilities grumble, patch, and send a very large invoice.' },
          { label: 'Quietly pay the ransom', desc: 'Fast fix, bad precedent.', f: [0.3, 0, 0, 0, -1, 0], sd: 0.5, res: 'The lights come back. So do the hackers.' },
          { label: 'Let utilities sort it out', desc: 'Hands off. Voters notice the dark.', f: [-0.6, 0, 0, 0, -3, 2], sd: 0.4, res: 'Utilities sort it out. Eventually.' }
        ], hl: 'Grid hack darkens cities' },
      bond: { kind: 'Financial shock', title: 'Bond markets revolt', text: 'Investors dump Treasuries and demand a premium. The word "unsustainable" is trending.', st: ['NY', 'VA', 'MA'], icon: 'storm', base: [-1.0, 0.2, 0.5, 1.0, -2, 2], real: 'In 2022, UK gilt yields spiked after unfunded tax cuts, forcing a policy reversal and a prime minister\'s resignation.',
        opts: [
          { label: 'Announce credible spending cuts', desc: 'Reassure investors by shrinking the deficit for good.', f: [-0.5, 0.3, 0, -1.5, -4, 3], sd: 0.4, perm: 1, res: 'Yields settle. Constituents do not.' },
          { label: 'Raise taxes', desc: 'Close the gap with permanent new revenue.', f: [-0.6, 0.2, 0, -1.3, -3, 2], sd: 0.4, perm: 1, res: 'Yields calm. Accountants thrive.' },
          { label: 'Ask the central bank to print', desc: 'Make the deficit someone else\'s problem. Inflation takes the bill.', f: [0.2, 0, 1.5, -0.3, -1, 1], sd: 0.5, res: 'Yields drop. Groceries do the opposite.' }
        ], hl: 'Bond markets revolt' }
    };
    const FAC = {
      labor: { name: 'General strike', kind: 'Strike', st: ['MI', 'OH', 'PA', 'IL'], icon: 'flame', base: [-1.0, 0.5, 0, 0, -1, 8], text: 'Picket lines stretch for blocks and the factories are silent.', real: 'Most US labor disputes end in negotiated settlements; strikes cost output while they last.', who: 'unions' },
      business: { name: 'Investment strike', kind: 'Walkout', st: ['NY', 'MA', 'CA', 'TX'], icon: 'flame', base: [-1.2, 0.4, 0, 0, -1, 3], text: 'Executives freeze hiring and quietly move capital abroad. Nobody says "strike." Everyone says "pausing."', real: 'Capital is mobile: firms respond to tax and regulatory shocks by delaying investment, though how fast varies.', who: 'executives' },
      farmers: { name: 'Tractor blockade', kind: 'Protest', st: ['IA', 'NE', 'KS', 'ND'], icon: 'flame', base: [-0.5, 0.1, 0.3, 0, -1, 6], text: 'Tractors block the capital. Pitchforks are present but purely decorative.', real: 'US farm protests have repeatedly won policy changes; trade shocks and input costs are common triggers.', who: 'farmers' },
      urban: { name: 'Riots', kind: 'Riots', st: ['NY', 'CA', 'IL', 'OR'], icon: 'flame', base: [-0.6, 0.2, 0, 0, -2, 10], text: 'Shortages and eviction notices set off riots in the cities. Store windows have opinions.', real: 'Shocks to basic goods, from price controls to sudden shortages, have a long history of sparking unrest.', who: 'city residents' },
      retirees: { name: 'Retirees\' march', kind: 'Protest', st: ['FL', 'AZ', 'PA'], icon: 'flame', base: [0, 0, 0, 0, -4, 5], text: 'A sea of walkers and visors fills the streets. The cardigans are organized.', real: 'Older voters turn out at the highest rates, and benefit cuts are among the most politically costly moves.', who: 'retirees' },
      energy: { name: 'Oil patch walkout', kind: 'Strike', st: ['TX', 'ND', 'LA', 'NM'], icon: 'flame', base: [-0.8, 0.3, 0.6, 0, -1, 4], text: 'Rig crews walk off. The gas-pump numbers begin twitching.', real: 'Energy workers are concentrated in a few states, so local shocks translate into national prices.', who: 'energy workers' }
    };
    const ST = {
      AL: ['Alabama-jama', 'Alabama'], AK: ['Alaska-Ching', 'Alaska'], AZ: ['Arizonah', 'Arizona'], AR: ['Arkansaw', 'Arkansas'], CA: ['Californication', 'California'], CO: ['Coloradude', 'Colorado'],
      CT: ['Connecti-cut', 'Connecticut'], DE: ['Dela-where?', 'Delaware'], FL: ['Flori-duh', 'Florida'], GA: ['Georgia-ish', 'Georgia'], HI: ['Hawai-i Can\'t Afford It', 'Hawaii'], ID: ['Spudaho', 'Idaho'],
      IL: ['Illinoise', 'Illinois'], IN: ['Indiana Loans', 'Indiana'], IA: ['Iowa-ay', 'Iowa'], KS: ['Kansastic', 'Kansas'], KY: ['Kentuckyard', 'Kentucky'], LA: ['Looseiana', 'Louisiana'],
      ME: ['Maine-ly Lobster', 'Maine'], MD: ['Merry-land', 'Maryland'], MA: ['Taxachusetts', 'Massachusetts'], MI: ['Michi-gone', 'Michigan'], MN: ['Minnesnowta', 'Minnesota'], MS: ['Missi-ssippy', 'Mississippi'],
      MO: ['Missour-Ya', 'Missouri'], MT: ['Montanope', 'Montana'], NE: ['Cornbraska', 'Nebraska'], NV: ['Nevada Vegas', 'Nevada'], NH: ['New Hamp-Free-or-Die', 'New Hampshire'], NJ: ['New Jersey Shore-ly', 'New Jersey'],
      NM: ['New Mexi-cool', 'New Mexico'], NY: ['Newer York', 'New York'], NC: ['North Carolin-ah', 'North Carolina'], ND: ['Dakota Dakota', 'North Dakota'], OH: ['Ohi-NO', 'Ohio'], OK: ['Oklahoma-ha', 'Oklahoma'],
      OR: ['Oregone', 'Oregon'], PA: ['Pennsyl-vanity', 'Pennsylvania'], RI: ['Rhode Island-ish', 'Rhode Island'], SC: ['South Carolin-ah', 'South Carolina'], SD: ['Dakota Redux', 'South Dakota'], TN: ['Tennessee Waltz-ing', 'Tennessee'],
      TX: ['Texass', 'Texas'], UT: ['Utah-pia', 'Utah'], VT: ['Vermunt', 'Vermont'], VA: ['Virgin-ia', 'Virginia'], WA: ['Washingtoon', 'Washington'], WV: ['West Virgin-ia-ish', 'West Virginia'],
      WI: ['Cheesconsin', 'Wisconsin'], WY: ['Wyo-Mingle', 'Wyoming']
    };
    const TITLES = [{ id: 'President', label: 'President', tag: 'Constitutionally limited. Allegedly.', mods: { sdm: 0.75, nego: 0.10, back: 0.5, cap: 1.3 } }];
    const HL = {
      mw15: ['Workers Win Raise as Fast Food Prices Barely Flinch', '$15 Wage Floor Turns Teen Jobs Into Kiosks'],
      sp: ['Single Payer Passes: Waiting Rooms Now Free of Charge (Waiting Not Included)', 'Government Takes Over Health Care; Forms Now Come in Triplicate, Free'],
      rc: ['Rents Frozen Overnight; Landlords Discover Sudden Passion for "Renovations"', 'Rent Control Passes, Housing Supply Reportedly "Not Feeling Well"'],
      top70: ['Top Tax Rate Hits 70%: Billionaires Discover Gratitude, Briefly', '70% Tax Rate Declared "Nice Try" by Offshore Accountants'],
      wealth: ['Wealth Tax Signed: The Yachts Are Reportedly Nervous', 'Wealth Tax Law Meets Billionaire Moving Vans'],
      jobg: ['Everyone Gets a Job; Nobody Gets Told What It Is', 'Job Guarantee Creates 4 Million Associate Deputy Regional Coordinators'],
      debt: ['Debt Relief Arrives: Graduates Weep, Cry Tears of Compound Interest', 'Student Loans Forgiven; Plumbers Ask Where Their Check Is'],
      gascap: ['Gas Capped at $3: Commuters Rejoice, Stations Run Dry', 'Price Cap Puts the "Station" in Stagnation; Lines Form for Gas That Is Not There'],
      college: ['Free College Signed; Admissions Offices Lock Doors, Citing Overcrowding', 'Taxpayers Cover Tuition; Parking Still $900'],
      ubi: ['$1,000 a Month for Everyone: Mailboxes Report Record Joy', 'Government Mails Money to Everyone; Inflation Opens Its Mail Too'],
      norw: ['Right-to-Work Banned: Unions Celebrate With Free Donuts', 'Dues for Everyone: Union Hall Orders More Pamphlets'],
      ssx: ['Social Security Gets 20% Boost; Retirees Upgrade to Early-Bird Premium', 'Benefit Boost Signed; Trust Fund Said to "Feel Warm"'],
      tar25: ['25% Tariffs Signed: Industry "Cautiously Optimistic", Consumers "Confused"', 'Tariffs Hit Wallets: "Taxes With Extra Steps," Say Importers'],
      ccap: ['10% Credit Card Cap: Banks Discover Annual Fee for Having a Pulse', 'Interest Rate Capped; Credit Vanishes for People Who Needed It Most'],
      frack: ['Fracking Ban Passes; Oil Patch Writes Sad Song About It', 'Fracking Banned: Gas Prices Pledge Not to Rise (They Lied)'],
      infra: ['$500B for Roads and Bridges: Orange Cones Reach Record Highs', 'Infrastructure Bill Passes; Pothole to Be Studied by Seven Commissions'],
      prek: ['Universal Pre-K Signed; Toddlers Demand Union Representation', 'Pre-K for All: Nap Time Now Federally Funded'],
      mw0: ['Minimum Wage Abolished; Workers "Excited" to Negotiate Against Nobody', 'Wage Floor Scrapped; Economists Call It Bold, Cashiers Call It Something Else'],
      corp15: ['Corporate Tax Cut to 15%; Buybacks Declared "Trickle-Down Spring"', 'Corporate Tax Slashed; Headquarters Stay, Executives Throw Party'],
      zone: ['Zoning Overridden; Neighborhood Meetings Run to 11 p.m. in Protest', 'Cities Told to Build: Homeowner Associations Draft Strongly Worded Letters'],
      lic: ['Licensing Rules Cut; Barbers Union Considers Sitting on Sidewalk', 'Occupational Licenses Slashed; Hair Braiders Hold Parade'],
      trade: ['Tariffs Slashed: Factory Towns Brace for Another "Shock"', 'Free Trade Deal Signed; Cheap Goods Arrive, Container Ships Cheer'],
      ssp: ['Social Security "Privatized"; Retirees Handed a Stock Chart and Good Luck', 'Private Accounts Approved: Ownership Society Opens for Business'],
      age69: ['Retirement Age Rises to 69; Roofers Politely Ask If You Are Joking', 'Retirement Age Raised; Actuaries Slowly Exhale'],
      permit: ['Permits Fast-Tracked; Environmentalists Request "A Moment to Review"', 'Reactors Approved in Record Time: "Was That So Hard?"'],
      regs: ['One-In, Two-Out: Regulators Replace Two Rules With One Gigantic One', 'Red Tape Trimmed; Agencies Respond With Wider Tape'],
      vouch: ['School Vouchers Pass; Public Schools Sob Quietly in the Gym', 'School Choice Wins; Parents Shop Schools Like Hotels'],
      cut10: ['Budget Axed 10%; Park Rangers Will Describe Trees Verbally', 'Federal Spending Cut; Deficit Hawks Nod Approvingly'],
      hsa: ['HSAs Replace Insurance; Patients Asked to Comparison-Shop Emergencies', 'Price Transparency Wins: Patients Now Shop for Appendectomies'],
      visa: ['Visas Doubled; Tech Companies Throw Parties, Rents Respond', 'Skilled Visas Expanded: Engineers Arrive, Coders Share Apartments'],
      cg0: ['Capital Gains Tax Abolished; Hedge Funds Rename It "The Good Old Days"', 'Capital Gains Tax Eliminated: Investors Report Feeling Seen'],
      carbon: ['Carbon Tax With Dividend: Checks in the Mail, Gas Pumps Not Amused', 'Carbon Tax Signed; Free-Marketers Applaud, Reluctantly, Quietly'],
      flat: ['Flat Tax Signed: Accountants Pivot to Interpretive Dance', 'Tax Code Fits on a Postcard; Postcard Is Extremely Long'],
      land: ['Federal Land for Sale; Hikers Draft Strongly Worded Trail Maps', 'Public Land Sold: "It Was Just Sitting There," Say Buyers'],
      rtw: ['Right-to-Work Goes National; Union Halls Hold Candlelight Vigils', 'Worker Choice Spreads Nationwide; Union Dues Become Optional']
    };
    XA.forEach((x) => { HL[x.id] = x.hlx; });
    POL2.forEach((x) => { HL[x.id] = x.hlx; });
    const EVHL = {
      hurricane: ['{st} Underwater, Insurers Suddenly Remember Fine Print', 'Hurricane Hits {st}: Everyone Becomes a Meteorologist', '{st} Braces as Storm Rewrites the Coastline'],
      quake: ['{st} Shakes, Startups Blame Disruption', 'Earthquake Rattles {st}; Zoning Board Calls It "Unscheduled Demolition"', 'The Ground Is Moving in {st}, and So Are Property Values'],
      fire: ['{st} in Flames, Sky Turns Pumpkin Spice', 'Wildfires Scorch {st}; Home Insurers File Sad Letters', 'Orange Skies Over {st}: "This Is Fine" Is No Longer Fine'],
      tornado: ['Twister Tears Through {st}, Barn Takes Flight', '{st} Storm Outbreak: Weather App Finally Right', 'Tornadoes Hit {st}; Neighbors Share Chainsaws and Casseroles'],
      war_oil: ['Oil Surges as War Breaks Out, Pump Prices Develop Opinions', 'Crude Jumps 40%: Everybody Suddenly Loves Electric Cars (Briefly)', 'War Abroad Sends Gas to the Moon; Commutes Reconsidered'],
      war_ally: ['Ally Invaded: Capital Debates Whose Problem It Is', 'Phones Ring in Washington as a Friend Is Attacked', 'War Erupts Overseas; Think Tanks Order More Maps'],
      pandemic: ['Mystery Flu Spreads; Toilet Paper Futures Soar', 'Hospitals Fill as Fast-Moving Flu Hits Cities', 'Flu Outbreak Rewrites the Office Dress Code (Pajamas)'],
      boom: ['AI Boom Lifts Stocks; Founders Buy Second Standing Desks', 'Markets Soar on Productivity Surge; Skeptics Check Their Wallets', 'Machines Learn Spreadsheets; Stocks Learn to Fly'],
      crash: ['Markets Crash, Bank Stops Answering Phones', 'Red Sea on Wall Street as Major Bank Wobbles', 'Panic on the Floor: "It Is Fine," Say People Selling Everything'],
      cyber: ['Grid Hack Dims Cities; Hacker Reportedly Eating Hot Pocket', 'Lights Out: Cyberattack Targets Power Network', 'Hackers Hit the Grid; Candle Sales Boom'],
      bond: ['Bond Markets Revolt; "Unsustainable" Trends', 'Investors Dump Treasuries, Demand a Premium for Your Optimism', 'Yields Spike: The Bill Has Arrived']
    };
    const FACHL = {
      labor: ['Picket Lines Stretch Across {st}', 'Workers Walk Off in {st}; Coffee Break Extended Indefinitely', 'Strike Grips {st}: "Not a Vacation," Insist Strikers'],
      business: ['Executives "Pause" Investment; Capital Spots Exit Signs in {st}', 'Quiet Walkout: CEOs Freeze Hiring, Cite "Uncertainty"', 'Boardrooms in {st} Go Dark; Memo Says "Strategic Patience"'],
      farmers: ['Tractors Roll Into the Capital; Hay Bales Used as Barricades', 'Farm Protest Blocks {st} Highways; Pitchforks Purely Decorative', 'Combines Convoy to the Capitol, Slowly'],
      urban: ['Unrest in {st}: Store Windows Voice Opinions', 'Streets Erupt as Prices and Patience Run Out', 'Riots in {st}; Mayor Calls for Calm, Calm Declines'],
      retirees: ['Walkers Fill the Streets as Retirees March in {st}', 'Seniors Rally: "We Remember Everything, Including You"', 'Cardigan Coalition Takes the Capitol Lawn'],
      energy: ['Rig Crews Walk Off in {st}; Pump Prices Twitch', 'Oil Patch Goes Quiet as Workers Strike', 'Energy Workers Walk Out; Gas Stations Pay Attention']
    };
    const OUT = { N: ['The Gavel Gazette', 'The Beltway Bugle', 'Capitol Quarterly'], L: ['The Daily Solidarity', 'The Commons Crier', 'People\'s Pulse'], R: ['The Liberty Ledger', 'Invisible Hand Weekly', 'The Flag & Ledger'] };
    const PUNDL = { name: 'Dr. Marge Kollektiv', org: 'Institute for Shared Outcomes' };
    const PUNDR = { name: 'Chip Laissez', org: 'Foundation for Unfettered Everything' };
    const SUPQ = ['This is overdue, and honestly I am a little emotional.', 'The data was begging for this, and the data does not beg lightly.', 'A bold step, taken with a steady hand and a mildly smug expression.', 'History will remember this fondly, or at least in a footnote.'];
    const OPPQ = ['Bold, if you enjoy unintended consequences.', 'History will remember this the way it remembers disco.', 'We warned them. We always warn them. Nobody reads the warnings.', 'It is certainly a policy, and that is the nicest thing I can say.', 'I look forward to being proven right in a stern press conference.'];
    const ECON = ['Economists issued a 40-page report concluding "it depends."', 'A panel of economists agreed on exactly nothing, which was widely reported as a consensus.', 'Researchers described the effects as "real, modest, and heavily contested."'];
    const PUND = ['"This could have been prevented," said a commentator who has said that about everything.', '"Now is not the time for blame," said another commentator, immediately blaming someone.', '"Both sides have a point," said a panelist, who then refused to name either.', 'Cable news cut to a man pointing at a map, which is the second-most-trusted source of information.'];
    const QUIPS = {
      C: { A: ['Finally, someone who read the budget before signing it.', 'Adam Smith is smiling. Possibly weeping.'], B: ['Respectable. Would not mind this one at a barbecue.', 'Mostly sound, with a few baffling decisions.'], C: ['Some good instincts, some deeply puzzling ones.', 'The invisible hand is checking its watch.'], D: ['The markets are crying, and not from joy.', 'Somewhere, a deficit hawk is hyperventilating.'], F: ['This is why we have constitutions.', 'A cautionary tale, and not a short one.'] },
      L: { A: ['Solidarity forever. Also, the spreadsheets check out.', 'The people have spoken, and they sound relieved.'], B: ['Progress, with an asterisk the size of a footnote.', 'Good bones, needs a better closing argument.'], C: ['Meh. Reads like a pamphlet written by a committee.', 'The vibes were right. The outcomes were not.'], D: ['A lot of speeches. Not a lot of results.', 'The movement is concerned, and drafting a statement.'], F: ['Somewhere, a union organizer just sighed in Latin.', 'The revolution has been postponed, citing weather.'] }
    };
    // Policy slots: two policies that change the same lever (e.g. the minimum wage) cannot both be enacted.
    // Enacting one retires every other policy that shares a slot, from the desk and from executive actions alike.
    // Slot names stay short (15 characters or fewer) so the slim server engine keeps them.
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
      wealth: ['wealthtax'], carbon: ['carbon'], pentcut: ['defense'], college: ['tuition'], otoptout: ['otrule'], freetrade: ['tariffs', 'bordercarb']
    };
    // Systems a bill needs (SYS) and systems it abolishes (KILL): a bill and an action that clash this way can never both be law.
    const SYS = Object.assign({}, BASE_SYS), KILL = Object.assign({}, BASE_KILL);
    POL.forEach((x) => { x.tp = BASE_TOPIC[x.id]; });
    XA.forEach((x) => { x.tp = BASE_TOPIC[x.id]; });
    POL2.forEach((x) => { if (x.slot) SLOT[x.id] = x.slot; if (x.sys) SYS[x.id] = x.sys; if (x.kill) KILL[x.id] = x.kill; });
    const ALLPOL = POL.concat(POL2);
    this._D = { KEYS, POL: ALLPOL, XA, SLOT, SYS, KILL, DIS_OPTS, EV, FAC, ST, TITLES, HL, EVHL, FACHL, OUT, PUNDL, PUNDR, SUPQ, OPPQ, ECON, PUND, QUIPS };
    return this._D;
  }

  // ---------- random + helpers ----------
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

  // days: 3-28. lvl: 0 = standard (AP), 1 = core (plain language, fewer memos, no executive actions, capital, scandal or impeachment).
  // unit: null, or an AP_UNITS key (classroom sessions only): the desk prefers that unit's bills. null deals exactly as before.
  newGame(seed, days, lvl, unit) {
    const D = this.data();
    days = days == null ? 14 : days; lvl = lvl == null ? 0 : lvl;
    if (!Number.isInteger(days) || days < MIN_DAYS || days > MAX_DAYS) throw new Error('bad days');
    if (lvl !== 0 && lvl !== 1) throw new Error('bad level');
    if (unit != null && !AP_UNITS[unit]) throw new Error('bad unit');
    // memos per day: long terms get fewer so the bill pool lasts (standard: 3 up to 14 days; core: 2, then 1 past 18 days)
    const mpd = lvl === 1 ? this.clamp(Math.round(28 / days), 1, 2) : this.clamp(Math.round(36 / days), 1, 3);
    const g = { rs: seed | 0, day: 1, days: days, lvl: lvl, mpd: mpd, unit: unit || null, phase: 'title', title: 'President', memos: [], moot: [], pols: [], evs: [], hits: [], vet: {}, sched: {}, inc: [], carry: [], flash: [], news: [], todayPol: [], over: false, ok: '', bond: false, riot: false, ds: null, ds0: null, mi: 0,
      cap: 5, cong: 50, scand: 0, imp: null, trials: 0, lastTrial: -9, trialDay: 0, rev: 0, revDay: -9, surv: false, shield: 0, xToday: false, xpend: null, xdone: [], seen: {}, tp: [], fulog: [], press: [], sidc: 0, evlog: [], crlog: [], ser: [], nv: 0 };
    // Schedule random events on days 2..days-1: about 3 per 7 days, always a disaster and a war first (14 days = 6 events).
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

  // ---------- policy slots, systems and the tree ----------
  slotsOf(id) { return this.data().SLOT[id] || []; }
  sysOf(id) { return this.data().SYS[id] || []; }
  killOf(id) { return this.data().KILL[id] || []; }
  // Claim keys a law holds: its slots, 'S:x' for each system it needs, 'K:x' for each system it abolishes.
  claimKeys(id) { return this.slotsOf(id).concat(this.sysOf(id).map((s) => 'S:' + s), this.killOf(id).map((s) => 'K:' + s)); }
  // True when two different bills or actions can never both be law (same lever, or one abolishes what the other needs).
  clash(a, b) {
    if (a === b) return false;
    const sb = this.slotsOf(b);
    if (this.slotsOf(a).some((s) => sb.indexOf(s) >= 0)) return true;
    return this.killOf(a).some((s) => this.sysOf(b).indexOf(s) >= 0) || this.killOf(b).some((s) => this.sysOf(a).indexOf(s) >= 0);
  }
  // claim key -> id of the policy that holds it (enacted, queued as an executive action, or signed today)
  taken(g) {
    const t = {};
    const add = (id) => { this.claimKeys(id).forEach((k) => { t[k] = id; }); };
    g.pols.forEach((p) => { if (!p.rep) add(p.id); });
    if (g.xpend) add(g.xpend);
    g.memos.forEach((m) => { if (m.dec === 'sign') add(m.id); });
    return t;
  }
  // id of the enacted policy that blocks `id`, or null when it is free to use
  blocker(g, id, taken) {
    const t = taken || this.taken(g);
    const need = this.slotsOf(id).concat(this.sysOf(id).map((s) => 'K:' + s), this.killOf(id).map((s) => 'S:' + s));
    for (const k of need) if (t[k] && t[k] !== id) return t[k];
    return null;
  }
  inEffect(g, id) { return g.pols.some((p) => p.id === id && !p.rep); }
  // One req token. Returns proof { k: 's' signed | 'x' executive action | 'v' vetoed | 'n' not in effect, id, d } or null.
  condMet(g, tok, dl) {
    const c = tok.charAt(0);
    if (c === '!') { const id = tok.slice(1); return this.inEffect(g, id) || g.xpend === id ? null : { k: 'n', id: id, d: 0 }; }
    if (c === '~') { const id = tok.slice(1); const d = g.vet[id]; return d != null && g.day - d >= dl ? { k: 'v', id: id, d: d } : null; }
    const e = g.pols.find((p) => p.id === tok && !p.rep);
    return e && g.day - e.d >= dl ? { k: e.x ? 'x' : 's', id: tok, d: e.d } : null;
  }
  // All of a bill’s req conditions (an inner array means any one of them). Returns the proofs, or null when it is not yet time.
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
  // Repeal a law, and every law that only made sense because of it (its plain, non-optional req).
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
    lapsed.forEach((id) => { this.push(g, '"' + this.pol(id).t + '" lapses with it', 'It only made sense alongside "' + this.pol(p.id).t + '", so it goes too.'); });
    return lapsed;
  }

  // Deals the morning memos. A bill is never dealt twice in a game. Follow-up bills (ones with a req) appear once the decision they
  // depend on has been made; the rest of the desk is filled from bills with no prerequisites, balancing planned and market bills
  // and avoiding the same topic on the same or a recent day.
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
    // Unit focus: try the unit's bills first (keeping the planned/market balance if possible), then fall back to the normal deal.
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

  // ---------- model ----------
  // Once the day is ended (incident, trial, brief and end screens), today's laws and shocks have had their first night.
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
    // Shocks fade. The player's crisis responses fade too, but a fifth of each lingers (l: scarring, debt, memories),
    // so the choice still shows in the legacy projection; structural responses (p) build up like laws.
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
  // kind: undefined = a shock that fades, 'l' = a response that leaves a lasting fifth, 'p' = a permanent change
  addEv(g, f, sd, kind) {
    const r = f.map((x) => x * (1 + (this.rn(g) * 2 - 1) * (sd || 0)));
    const e = { d: g.day, f: r }; if (kind) e[kind] = 1;
    g.evs.push(e);
  }

  // ---------- stories (headlines + satirical blurbs) ----------
  lc(t) { return t.charAt(0).toLowerCase() + t.slice(1); }
  outlet(g, slant) { const D = this.data(); return this.pick(g, D.OUT[slant]); }
  reactions(g) { const D = this.data(); return [this.pick(g, D.PUND), this.pick(g, D.PUND)]; }
  polStory(g, p, f) {
    const D = this.data();
    const r = this.rn(g); const slant = r < 0.34 ? 'N' : r < 0.67 ? 'L' : 'R';
    const h = slant === 'N' ? p.hl : slant === 'L' ? D.HL[p.id][0] : D.HL[p.id][1];
    const PH = { g: ['the economy lost a step', 'the economy grew a little faster'], j: ['more people found work', 'unemployment ticked up'], i: ['prices eased', 'prices climbed'], d: ['the budget picture improved', 'the deficit grew'], a: ['voters were less than thrilled', 'voters gave a cautious thumbs-up'], u: ['protest signs went back into the closet', 'tempers rose in the streets'] };
    const SC = [0.5, 0.5, 0.5, 1, 5, 5];
    const ks = ['g', 'j', 'i', 'd', 'a', 'u'];
    const ranked = ks.map((k, i) => ({ k: k, v: f[i], m: Math.abs(f[i]) / SC[i] })).filter((x) => x.m > 0.15).sort((a, b) => b.m - a.m).slice(0, 2);
    const eff = ranked.map((x) => PH[x.k][x.v >= 0 ? (x.k === 'g' || x.k === 'a' ? 1 : x.k === 'u' || x.k === 'j' || x.k === 'i' || x.k === 'd' ? 1 : 1) : 0]);
    const para1 = p.m + (eff.length ? ' Within days, ' + eff.join(' and ') + '.' : ' So far, nothing visibly changed, which analysts called "an effect."');
    const planned = p.lean < 0;
    const sup = planned ? D.PUNDL : D.PUNDR, opp = planned ? D.PUNDR : D.PUNDL;
    const supq = this.pick(g, D.SUPQ), oppq = this.pick(g, D.OPPQ);
    const para2 = sup.name + ' of the ' + sup.org + ' cheered: "' + supq + '" ' + opp.name + ' of the ' + opp.org + ' replied: "' + oppq + '"';
    const para3 = 'Supporters say: ' + p.pro + ' Critics say: ' + p.con;
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
    return { k: 'inc', h: this.pick(g, D.FACHL[c.fac]).replace('{st}', D.ST[c.st][0]), o: this.outlet(g, slant), b: [F.text + (pol ? ' The spark: "' + pol.t + '."' : ' Nobody could agree on the spark.'), this.reactions(g)[0], this.reactions(g)[1]] };
  }
  note(g, h, ctx) {
    const D = this.data();
    const r = this.rn(g); const slant = r < 0.5 ? 'N' : r < 0.75 ? 'L' : 'R';
    const rs = this.reactions(g);
    return { k: 'inc', h: h, o: this.outlet(g, slant), b: [ctx || h, rs[0], this.pick(g, D.ECON)] };
  }
  addNews(g, st) { st.sid = g.sidc; g.sidc += 1; st.day = g.day; g.news.push(st); g.press.unshift(st); if (g.press.length > 36) g.press.length = 36; }
  push(g, h, ctx) { this.addNews(g, this.note(g, h, ctx)); }

  // ---------- turn processing ----------
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
        this.push(g, 'Leaked: the paper trail behind "' + x.t + '"', 'Documents obtained by reporters describe how the decision was made, and who was paid or pressured along the way.');
      }
      g.xdone.push(x.id); g.xpend = null;
    }
    g.inc = [];
    const savedPhase = g.phase; g.phase = 'brief';
    const m = this.M(g);
    // crises carried over from yesterday
    g.carry.forEach((c) => { g.inc.push(c); this.crisisHit(g, c, 0.6); });
    g.carry = [];
    // anger rolls for newly signed policies
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
    // scheduled random event
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
    // generic riots when unrest is already very high
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
        if (this.rn(g) < hold()) { this.addEv(g, [-0.5, 0, 0, 0, -8, -25], 0.2); g.scand = this.clamp(g.scand + 10, 0, 100); this.push(g, 'The crackdown holds: order is restored', 'The streets are quiet. Nobody is calling it calm.'); }
        else { g.over = true; g.ok = 'coup'; this.push(g, 'The guard changes sides; you are overthrown', 'Soldiers lowered their weapons and raised a very different flag.'); }
      } else if (i === 1) {
        const last = g.pols.slice().reverse().find((q) => !q.rep);
        if (last) { this.repeal(g, last); this.push(g, 'You repeal "' + this.pol(last.id).t + '" and open talks', 'The crowd goes home, slowly, still holding its signs.'); }
        else this.push(g, 'You open talks with the crowd', 'It is not clear who is in charge of the crowd.');
        this.addEv(g, [0, 0, 0, 0.8, 4, -28], 0.2); g.cong = this.clamp(g.cong - 4, 0, 100);
      } else if (i === 2) {
        g.over = true; g.ok = 'fled'; this.push(g, 'The President flees the country by helicopter', 'The helicopter left at dawn. The nation noticed by lunch.');
      } else if (i === 3) {
        if (g.lvl === 1) throw new Error('no payoffs in core mode');
        if (g.cap < 3) throw new Error('not enough capital');
        g.cap -= 3; g.scand = this.clamp(g.scand + 20, 0, 100);
        if (this.rn(g) < 0.7) { this.addEv(g, [0, 0, 0.4, 1.5, 0, -22], 0.2); this.push(g, 'Envelopes reach the movement leaders; the barricades come down', 'Several leaders discovered the merits of compromise, and a new boat.'); }
        else { this.addEv(g, [0, 0, 0, 0, -5, 6], 0.2); g.cong = this.clamp(g.cong - 5, 0, 100); this.push(g, 'Payoff exposed: crowds grow', 'The envelopes were photographed. The photograph is everywhere.'); }
      } else throw new Error('bad revolt option');
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
        if (p) { this.repeal(g, p); this.addEv(g, [0, 0, 0, 0, 3, -20], 0.2, 'l'); this.push(g, 'You repealed "' + this.pol(p.id).t + '". The crowds go home, the policy goes with them.'); }
        else { this.addEv(g, [0, 0, 0, 0.8, 2, -15], 0.2, 'l'); this.push(g, 'An emergency relief package calms the crowds. The deficit notices.'); }
        ended = true;
      } else if (i === 1) {
        const chance = this.odds(m, cur, this.role(g));
        if (this.rn(g) < chance) {
          if (p) p.s = Math.min(p.s, 0.6);
          this.addEv(g, [0, 0, 0, 0.3, 2, -12], 0.2, 'l');
          this.push(g, 'Talks succeed. ' + (p ? 'The policy stays at about 60% strength; both sides claim victory.' : 'Both sides agree to disagree quietly.'));
          ended = true;
        } else { this.addEv(g, [0, 0, 0, 0, 0, 4], 0.2, 'l'); this.push(g, 'Talks collapse after a heated lunch. The ' + F.name.toLowerCase() + ' continues.'); }
      } else if (i === 2) {
        this.addEv(g, [0, 0, 0, 0, -7 * this.role(g).cap, -18], 0.2, 'l');
        if (this.rn(g) < this.role(g).back) { this.addEv(g, [0, 0, 0, 0, -4, 15], 0.2, 'l'); this.push(g, 'The crackdown backfires. Footage goes viral and the crowd grows.'); }
        else { this.push(g, 'The National Guard restores order. Approval takes a hit.'); ended = true; }
      } else {
        this.addEv(g, [-0.8, 0, 0, 0, -2, 5], 0.2, 'l');
        if (this.rn(g) < 0.5) { this.push(g, 'The ' + F.name.toLowerCase() + ' fizzles out on its own. Mostly.'); ended = true; }
        else this.push(g, 'Waiting does not help. The ' + F.name.toLowerCase() + ' drags on.');
      }
      if (!ended) {
        const esc = cur.esc + 1;
        if (esc >= 3) { this.addEv(g, [-2, 0.5, 0, 0.5, -6, 10], 0.2, 'l'); this.push(g, 'After three days the unrest burns itself out, leaving a lot of damage.'); }
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
      if (m.u >= 98 && g.rev >= 2) { g.over = true; g.ok = 'coup'; this.push(g, 'Army seizes the capital; the presidency is over', 'The crowds were never going home. Neither, it turns out, were the generals.'); }
      else if (m.u >= 88 && g.rev < 2 && g.day - g.revDay >= 3) {
        g.rev += 1; g.revDay = g.day; g.inc.push({ k: 'revolt' }); g.phase = 'incident';
        this.push(g, 'Revolution at the gates: crowds surround the capital', 'Barricades are up, the guard is wavering, and the helicopter on the lawn has its engine running.');
        return;
      }
    }
    if (!g.over) {
      if (g.imp && g.imp.st === 'warn' && g.imp.w < g.day) g.imp.st = 'trial';
      if (!g.imp && g.lvl !== 1 && g.trials < 2 && g.day >= 3 && g.day - g.lastTrial > 4 && m.a < 28 && g.cong < 25) {
        g.trials += 1;
        g.imp = { st: 'warn', w: g.day, r: 0, conv: this.clamp(Math.round(38 + (30 - g.cong) * 0.9 + (32 - m.a) * 0.6 + g.scand * 0.25 - g.shield), 22, 78) };
        g.imp.c0 = g.imp.conv;
        this.push(g, 'House drafts articles of impeachment', 'Committee chairs say the vote is coming. You have a day or two to change the math, one way or another.');
      } else if (g.imp && g.imp.st === 'trial' && g.trialDay !== g.day) { g.phase = 'trial'; return; }
    }
    if (!g.news.length) this.push(g, 'A quiet night. Cable news invents a feud.');
  }
  verdict(g) {
    const imp = g.imp;
    if (imp.conv >= 67) { imp.done = true; g.over = true; g.ok = 'impeach'; this.push(g, 'Senate convicts: the presidency is over', 'The vote cleared the threshold by a margin both parties are privately calling "tidy."'); }
    else {
      // The survival bonus is only for beating a trial that could really have been lost.
      if (imp.c0 == null || imp.c0 >= 55) g.surv = true;
      g.lastTrial = g.day; g.imp = null;
      this.addEv(g, [0, 0, 0, 0, 3, 0], 0.2);
      if (g.scand > 45) { this.addEv(g, [-0.4, 0, 0, 0, -4, g.scand * 0.15], 0.2); this.push(g, 'Acquitted, but the streets do not believe it', 'The Senate cleared you. The crowds outside have read the leaks and have a different verdict in mind.'); }
      else this.push(g, 'Senate acquits: you keep the job', 'The vote fell short of conviction. Commentators on both sides declare themselves vindicated.');
    }
  }
  resolveTrial(g, i) {
    const imp = g.imp;
    if (g.phase !== 'trial' || !imp) throw new Error('no trial');
    const m = this.M(g);
    let d = this.clamp((45 - m.a) * 0.15, -4, 6) + (g.scand > 40 ? 3 : 0);
    const pay = (c) => { if (g.cap < c) throw new Error('not enough capital'); g.cap -= c; };
    if (i === 0) {
      pay(1); this.addEv(g, [0, 0, 0, 0, 5, 2], 0.2); d -= 6;
      this.push(g, 'You rally the base outside the Capitol', 'Flags, folding chairs and a very long speech. Senators noticed the cameras.');
    } else if (i === 1) {
      const last = g.pols.slice().reverse().find((q) => !q.rep && !q.x);
      g.cong = this.clamp(g.cong + 6, 0, 100);
      if (last) { last.s = Math.min(last.s, 0.5); d -= 6; this.push(g, 'You water down "' + this.pol(last.id).t + '" to win votes', 'Both sides claim the compromise; the policy is now about half strength.'); }
      else { this.addEv(g, [0, 0, 0, 0.6, 1, 0], 0.2); d -= 6; this.push(g, 'Pork-barrel projects appear in swing states', 'Nobody wrote down what was promised. Everybody remembers.'); }
    } else if (i === 2) {
      pay(2); g.scand = this.clamp(g.scand + 12, 0, 100);
      if (this.rn(g) < 0.65 - g.scand / 400) { d -= 22; this.push(g, 'Swing senators discover sudden enthusiasm for your leadership', 'Their staff described the new position as "a deeply principled evolution."'); }
      else { d += 4; g.scand = this.clamp(g.scand + 20, 0, 100); this.push(g, 'Bribery attempt exposed: a senator wore a wire', 'The recording is, by all accounts, extremely clear.'); }
    } else if (i === 3) {
      pay(1);
      if (this.rn(g) < 0.55 - g.scand / 400) { d -= 18; g.scand = this.clamp(g.scand + 15, 0, 100); g.cong = this.clamp(g.cong - 8, 0, 100); this.push(g, 'Embarrassing files on swing senators quietly circulate', 'Three of them announced they had "reconsidered." None would say why.'); }
      else { d += 6; g.scand = this.clamp(g.scand + 25, 0, 100); this.push(g, 'Blackmail attempt backfires and goes public', 'The senator in question held a press conference. Ratings were excellent.'); }
    } else if (i === 4) {
      // Stay out of it and let the Senate decide on the record: no capital, no deals, no new scandal. The count drifts with approval and scandal alone.
      this.push(g, 'You stay out of the Senate fight and keep governing', 'The White House calls the trial "a distraction" and releases a schedule full of ribbon cuttings.');
    } else throw new Error('bad trial option');
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

  // ---------- scoring ----------
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

// ---------- seeds ----------
export function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h & 0x7fffffff; // positive 31-bit
}
export const dailySeed = (dateStr) => hashStr('gias-daily-' + dateStr);
export const utcDate = (d = new Date()) => d.toISOString().slice(0, 10);

// ---------- action log ----------
// Tokens: 's' sign, 'v' veto, 'e' end the day, '0'-'3' incident option, '0'-'4' trial option, 'n' next morning, 'x'+K executive action number K.
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
    if (g.phase !== 'desk' || !x || g.xToday || g.cap < x.cost || g.xdone.indexOf(x.id) >= 0) throw new Error('bad executive action');
    if (g.lvl === 1) throw new Error('executive actions are off in core mode');
    if (eng.blocker(g, x.id)) throw new Error('executive action conflicts with an enacted policy');
    g.cap -= x.cost; g.xToday = true; g.xpend = x.id;
    // The action settles its lever: any memo still waiting on the desk that touches it is withdrawn.
    g.moot = g.moot || [];
    g.memos = g.memos.filter((m, i) => {
      if (i < g.mi || !eng.clash(m.id, x.id)) return true;
      g.moot.push({ id: m.id, by: x.id }); return false;
    });
  } else if (a >= '0' && a <= '4' && a.length === 1) {
    if (g.phase === 'incident' && a !== '4') eng.resolveIncident(g, +a);
    else if (g.phase === 'trial') eng.resolveTrial(g, +a);
    else throw new Error('bad option action');
  } else if (a === 'n') {
    if (g.phase !== 'brief') throw new Error('bad next action');
    eng.nextMorning(g);
  } else throw new Error('unknown action ' + a);
  return g;
}
// opts: { days: 3-28 (default 14), lvl: 0 standard | 1 core (default 0), unit: AP unit focus or null }. The public game always uses the defaults.
export function runLog(seed, role, log, opts) {
  const eng = new Engine();
  if (!eng.data().TITLES.some((t) => t.id === role)) throw new Error('unknown role');
  if (typeof log !== 'string' || log.length > 600) throw new Error('bad log');
  const o = opts || {};
  const g = begin(eng, seed, role, o.days, o.lvl, o.unit);
  for (const a of tokens(log)) { if (g.phase === 'end') throw new Error('log continues past end'); applyAction(eng, g, a); }
  if (g.phase !== 'end') throw new Error('game not finished');
  const sc = eng.scoreCard(g);
  return { g, sc, cons: eng.grade(sc.cons).letter, lib: eng.grade(sc.lib).letter, needle: Math.round(sc.nd) };
}

// Compact, deterministic record of what a player decided, computed from a replayed game. Stored with class results
// and turned into written summaries by the client. Ids only (short strings), so it survives the slim server engine.
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
// Replays a possibly unfinished log (class live leaderboard). Stops at the first token that does not apply.
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
