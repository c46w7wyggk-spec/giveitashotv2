// Content for Supreme Leader mode: rivals, policies, constitutions, actions and events.
// Effects use keys econ, tre, ppl, army, elite (0-100 meters), fear, heat (0-100), fav (favors), rel ({rivalId: delta}),
// plus special flags: debt, guard, deter, purged, quiet.

export const RIVALS = [
  { id: 'bump', n: 'Ronald Bump', ti: 'President', c: 'the United States of Questionable Economies', base: 88, like: 'Capitalism, tribute, and being told he is winning.', dis: 'Socialists, rivals, and anyone who skips his golf course.' },
  { id: 'dragon', n: 'Premier Wen Lo-Pin', ti: 'Premier', c: 'the Great Dragon Republic', base: 80, like: 'Trade deals, ports, and long-term loans.', dis: 'Missed payments and Bump’s friends.' },
  { id: 'euro', n: 'Chancellor Brussela von Leyden', ti: 'Chancellor', c: 'the European Confederation of Paperwork', base: 74, like: 'Free presses, open elections, and filled-in forms.', dis: 'Strongmen, secret police, and blank forms.' },
  { id: 'bear', n: 'Vlad Pootsky', ti: 'President-for-Life', c: 'Northern Bearistan', base: 68, like: 'Gas deals, arms sales, and people who stay out of his business.', dis: 'Anyone who cozies up to Bump.' },
  { id: 'oil', n: 'Emir Abdul the Gilded', ti: 'Emir', c: 'Oilistan', base: 60, like: 'Gala dinners, gifts, and a polite haggle.', dis: 'Cheap gifts and public lectures.' }
];

// [econ, tre, ppl, army, elite] per day. opt: fear, heat per day, once: [5] one-time, bump: extra Bump anger per day.
const P = (id, t, d, lean, e, o) => Object.assign({ id, t, d, lean, e, fear: 0, heat: 0, once: null, bump: 0 }, o || {});
export const POLS = [
  P('oilnat', 'Nationalize the Oil Fields', 'The oil now belongs to the people. The people may look at it.', -3, [-0.1, 0.9, 0.3, 0, -0.4]),
  P('bread', 'Free Bread for All', 'Bread is a human right. Budgeting is a human wrong.', -2, [0, -0.6, 0.8, 0, 0]),
  P('flat', 'Flat 10% Tax', 'Everyone pays the same, which is either fair or very funny.', 2, [0.4, -0.2, -0.1, 0, 0.4]),
  P('health', 'Universal Healthcare', 'Free checkups, expensive waiting rooms.', -2, [0.1, -0.5, 0.6, 0, -0.1]),
  P('privat', 'Privatize Everything', 'Even the national anthem now has a sponsor.', 3, [0.5, 0.6, -0.5, 0, 0.5], { once: [0, 15, 0, 0, 0] }),
  P('draft', 'Conscription for All', 'Every citizen is now a soldier, whether or not they own a boot.', 0, [-0.2, -0.1, -0.3, 0.8, 0]),
  P('sez', 'Special Economic Zone', 'No taxes, no unions, free pizza for investors.', 2, [0.7, 0.2, -0.2, 0, 0.3]),
  P('plan', 'Five-Year Plan', 'The plan is flawless. Reality keeps missing its meetings.', -2, [0.3, -0.2, 0.1, 0.1, -0.2]),
  P('farms', 'Collectivized Farms', 'Everyone shares the harvest. The harvest has questions.', -3, [-0.3, 0.1, 0.2, 0, -0.2]),
  P('openb', 'Open Borders for Business', 'Money may cross freely. People can be dealt with later.', 2, [0.5, 0.2, -0.2, 0, 0.2]),
  P('airline', 'National Flag Airline', 'It loses money and gains prestige, mostly in the lounge.', -1, [-0.1, -0.3, 0.3, 0, 0.1]),
  P('secpol', 'Secret Police Bureau', 'They are very discreet. You will hear about it from them.', 0, [0, -0.3, -0.4, 0.3, 0.3], { fear: 0.8 }),
  P('freeuni', 'Free University', 'Education for all. Jobs for some.', -2, [0.1, -0.3, 0.4, 0, -0.1]),
  P('statue', 'Giant Golden Statue of You', 'Visible from space. Questionable on the budget.', 0, [0, -0.5, 0.2, 0, 0.3], { once: [0, 0, 4, 0, 0] }),
  P('crypto', 'National Crypto Treasury', 'The reserves are held in a coin named after a dog.', 1, [0.2, 0.4, -0.2, 0, 0.2], { once: [0, -5, 0, 0, 0] }),
  P('tourism', 'Tourism Board', 'Come for the beaches. Please ignore the tanks.', 1, [0.4, 0.4, 0.1, 0, 0]),
  P('tariff', 'Tariff Wall', 'Foreign goods are expensive. So is everything else.', -1, [-0.1, 0.3, 0.1, 0.1, -0.1]),
  P('debt', 'Borrow Big', 'Spend now, pay never. That is the next leader’s problem.', 0, [0, -0.7, 0, 0, 0], { once: [4, 25, 5, 0, 0] }),
  P('pressfree', 'Press Freedom Act', 'Journalists may criticize you. You may regret this.', -1, [0, 0, 0.4, 0, -0.2], { heat: -0.5 }),
  P('statemedia', 'State Media Empire', 'Every channel is now your favorite channel.', 0, [0, -0.2, 0.2, 0, 0.1], { fear: 0.4 }),
  P('mercs', 'Hire Mercenaries', 'Loyalty guaranteed, as long as the invoices clear.', 0, [0, -0.5, 0, 0.8, 0]),
  P('mining', 'Rare Earth Mining Rights', 'Dig it up, sell it all, apologize to the hills.', 1, [0.5, 0.5, -0.3, 0, 0.2]),
  P('unions', 'Powerful Labor Unions', 'Workers united. Schedules not.', -2, [-0.1, -0.1, 0.5, 0, -0.3]),
  P('dereg', 'Deregulation Blitz', 'We burned the rulebook. The fire department was also deregulated.', 3, [0.6, 0.2, -0.3, 0, 0.4]),
  P('nuke', 'Nuclear Program', 'For energy purposes only. Wink.', 0, [0.1, -0.5, 0.2, 0.5, 0], { heat: 1.2, bump: 1 }),
  P('stipend', 'Leader’s Cash Stipend', 'A monthly check from you to them. Handwritten.', -2, [0, -0.7, 0.7, 0, -0.1]),
  P('casino', 'Casino Nation', 'The house always wins, and the house is you.', 2, [0.3, 0.5, -0.3, 0, 0.3]),
  P('ration', 'Rationing Boards', 'Equal portions, unequal enthusiasm.', -3, [-0.2, 0.1, 0.1, 0, -0.1], { fear: 0.2 }),
  P('swf', 'Sovereign Wealth Fund', 'Save for a rainy day. It has been sunny for years.', 1, [0, 0.7, 0, 0, -0.1]),
  P('oath', 'Loyalty Oath', 'Sign here to prove you love the leader.', 0, [0, 0, -0.2, 0.3, 0.3], { fear: 0.5 })
];

const C = (id, t, d, lean, e, o) => Object.assign({ id, t, d, lean, e, fear: 0, fav: 0, coup: 1, shock: 1, bump: 0, charter: false, lawless: false, divine: false }, o || {});
export const CONS = [
  C('charter', 'Charter of Liberties', 'Courts, a free press and a legislature. Lovely, and very annoying. Dark deeds cost an extra Favor and draw more heat.', -1, [0.1, 0, 0.3, -0.1, -0.1], { coup: 0.6, charter: true }),
  C('divine', 'Divine Mandate', 'You rule because the heavens said so. The heavens have not commented. Silencing critics is blessed and draws no heat.', 0, [-0.2, 0, 0.2, 0.3, 0], { divine: true }),
  C('strong', 'Strongman Decree', 'Rule by decree: fast, loud and legally optional. Fear grows, Favors come faster, the generals get ideas.', 0, [0, 0, -0.3, 0, 0.2], { fear: 1, fav: 1, coup: 1.4 }),
  C('assembly', 'People’s Assembly', 'Everything is decided by vote. Eventually. Citizens love it, generals and tycoons less so.', -2, [-0.1, -0.2, 0.5, -0.2, -0.2]),
  C('merchant', 'Merchant Republic', 'Rule by the chamber of commerce, which has a lot of chambers. Growth up, solidarity down.', 2, [0.5, 0.2, -0.1, 0, 0.1]),
  C('elders', 'Council of Elders', 'Wisdom, beards and long naps. Shocks hit softer and the elite is delighted.', 0, [-0.1, 0, 0, 0, 0.4], { shock: 0.75 })
];
export const NOCON = C('none', 'No Constitution', 'Total freedom for you, because nothing is written down. Dark deeds work more often and draw less heat, but coups come easier and Bump finds you unpredictable.', 0, [0, 0, 0, 0, 0], { coup: 1.5, lawless: true, bump: 0.5 });

// kind: clean | dark. tg: needs a foreign leader. p: base success. ok/bad: effects. $t = chosen leader.
export const ACTS = [
  { id: 'extort', t: 'Extort a Foreign Leader', d: 'You have photos. They have money. Everyone has regrets.', cost: 2, tg: true, kind: 'dark', p: 0.42, ok: { tre: 15, heat: 7, rel: { $t: -12 } }, bad: { heat: 16, ppl: -3, rel: { $t: -28 } }, win: 'The payment arrived in unmarked briefcases.', lose: 'They called your bluff and then called the newspapers.' },
  { id: 'bribeL', t: 'Bribe a Foreign Leader', d: 'A generous gift, to be received warmly and never mentioned.', cost: 2, tre: 10, tg: true, kind: 'dark', p: 0.75, ok: { rel: { $t: 24 } }, bad: { heat: 8, rel: { $t: -10 } }, win: 'The gift was accepted with a polite cough.', lose: 'The gift was leaked. The cough was not polite.' },
  { id: 'bribeG', t: 'Bribe the Generals', d: 'Gold watches for everyone with a star on their shoulder.', cost: 1, tre: 12, kind: 'dark', p: 0.9, ok: { army: 14 }, bad: { army: -4, heat: 4 }, win: 'The army is suddenly very loyal.', lose: 'A colonel took the watch and told his friends.' },
  { id: 'bribeE', t: 'Host an Oligarch Dinner', d: 'Seven courses and one very flexible tax code.', cost: 1, tre: 12, kind: 'clean', p: 1, ok: { elite: 14 }, bad: {}, win: 'The elite loved the dessert menu and the tax code.', lose: '' },
  { id: 'silence', t: 'Silence the Press', d: 'The newspapers will print only good news. Both of them.', cost: 1, kind: 'dark', p: 0.8, ok: { fear: 9, ppl: -4, heat: 5, quiet: 1 }, bad: { ppl: -9, heat: 11 }, win: 'The headlines are suddenly much nicer.', lose: 'The ban made the front page, in every language.' },
  { id: 'extortE', t: 'Squeeze the Oligarchs', d: 'A voluntary donation, delivered with a firm handshake.', cost: 1, kind: 'dark', p: 0.62, ok: { tre: 16, elite: -9 }, bad: { elite: -16, ppl: -2, heat: 3 }, win: 'The oligarchs paid up and pretended it was charity.', lose: 'The oligarchs moved their yachts and their loyalty.' },
  { id: 'purge', t: 'Purge the Officer Corps', d: 'Disloyal generals retire to a very remote retirement home.', cost: 2, kind: 'dark', p: 1, ok: { army: -8, fear: 12, heat: 3, purged: 3 }, bad: {}, win: 'The army is nervous but no coup can start for three days.', lose: '' },
  { id: 'blackmail', t: 'Blackmail the Opposition', d: 'Their search history is quite colorful.', cost: 1, kind: 'dark', p: 0.66, ok: { ppl: 5, fear: 4, heat: 3 }, bad: { ppl: -7, heat: 6 }, win: 'The opposition has gone suspiciously quiet.', lose: 'The opposition went public with the evidence of the blackmail.' },
  { id: 'rally', t: 'Hold a Mass Rally', d: 'Flags, speeches, free sausages. Attendance is voluntary but noted.', cost: 1, tre: 5, kind: 'clean', p: 1, ok: { ppl: 9, army: 1 }, bad: {}, win: 'The crowd roared, mostly at the sausages.', lose: '' },
  { id: 'build', t: 'Build Infrastructure', d: 'Roads, ports and one bridge that actually goes somewhere.', cost: 1, tre: 12, kind: 'clean', p: 1, ok: { econ: 9, ppl: 2 }, bad: {}, win: 'The ribbon was cut. The contractors were paid.', lose: '' },
  { id: 'trade', t: 'Sign a Trade Deal', d: 'Tariffs fall, handshakes rise.', cost: 1, tg: true, kind: 'clean', p: 0.55, relp: 0.005, ok: { rel: { $t: 10 }, econ: 5, tre: 5 }, bad: { rel: { $t: -4 } }, win: 'Cargo ships are sailing in both directions.', lose: 'Talks collapsed over the wording of one comma.' },
  { id: 'ally', t: 'Seek an Alliance', d: 'Friendship, but with a signed treaty and a photo op.', cost: 2, tg: true, kind: 'clean', p: 0.45, relp: 0.0067, ok: { rel: { $t: 22 }, heat: -4 }, bad: { rel: { $t: -6 } }, win: 'A treaty was signed and a flag was swapped.', lose: 'They stood you up at the signing.' },
  { id: 'propag', t: 'Run a Propaganda Blitz', d: 'Billboards, jingles and a patriotic cartoon duck.', cost: 1, tre: 4, kind: 'clean', p: 1, ok: { ppl: 7 }, bad: {}, win: 'Everyone is humming the duck song.', lose: '' },
  { id: 'mobil', t: 'Mobilize the Border', d: 'Tanks to the frontier. A strong signal to strong neighbors.', cost: 1, kind: 'clean', p: 1, ok: { army: 4, fear: 5, deter: 3 }, bad: {}, win: 'The border looks much scarier on satellite photos.', lose: '' },
  { id: 'spies', t: 'Fund Counter-Intelligence', d: 'Catch the spies, the kidnappers and the intern who talks too much.', cost: 1, tre: 7, kind: 'clean', p: 1, ok: { guard: 1 }, bad: {}, win: 'Your security detail now has a security detail.', lose: '' },
  { id: 'lowlie', t: 'Lay Low', d: 'Skip the scheming. The world forgets a little. You get one Favor back.', cost: 0, kind: 'clean', p: 1, ok: { heat: -8, fav: 1 }, bad: {}, win: 'Nothing happened, and that was the plan.', lose: '' }
];

const O = (l, d, fx, res, p, bad, rbad) => ({ l, d, fx: fx || {}, res: res || '', p: p == null ? null : p, bad: bad || null, rbad: rbad || '' });
// Domestic and world events. {city} is filled with one of your cities.
export const EVENTS = {
  bread: { kind: 'Unrest', title: 'Bread riots in {city}', text: 'Prices went up, patience went down, and someone set fire to a bakery. It was a very good bakery.', opts: [
    O('Send in the army', 'Restore order with boots and batons.', { fear: 10, ppl: -2, army: -2 }, 'The crowds dispersed. So did the bread.', 0.7, { ppl: -12, army: -8, heat: 8 }, 'Soldiers refused the order. The photos went global.'),
    O('Open the granaries', 'Hand out the emergency reserves.', { tre: -10, ppl: 9 }, 'Free bread calmed the street. The treasury is less calm.'),
    O('Blame foreign speculators', 'Somebody abroad must have done this.', { ppl: 3, heat: 4, rel: { dragon: -5 } }, 'The crowd found a new enemy. The enemy filed a complaint.')] },
  strike: { kind: 'Labor', title: 'Dock workers walk out in {city}', text: 'No cargo is moving. The seagulls have taken over the port and are said to be negotiating.', opts: [
    O('Negotiate', 'Give them most of what they asked.', { tre: -6, econ: 2, ppl: 4 }, 'The cranes started moving again.'),
    O('Ban the union', 'Illegal strike means illegal union.', { ppl: -6, elite: 6, fear: 6 }, 'The dock reopened under a new, quieter management.'),
    O('Bribe the leaders', 'A generous consulting contract for each.', { tre: -8, ppl: 2 }, 'The leaders found the contract very persuasive.', 0.7, { ppl: -8, heat: 5 }, 'The bribe was recorded and posted online.')] },
  plot: { kind: 'Palace', title: 'Whispers of a coup plot', text: 'A colonel has been seen having lunch with a general, which is suspicious because neither of them eats lunch.', opts: [
    O('Purge them quietly', 'Arrest the colonel. Retire the general.', { army: -6, fear: 8, heat: 4, purged: 2 }, 'The plot ended before the dessert course.'),
    O('Pay the generals off', 'Raise military salaries by a lot.', { tre: -12, army: 8 }, 'Loyalty is back on the menu.'),
    O('Ignore it', 'It is probably just lunch.', {}, 'It was just lunch.', 0.5, { army: -18, elite: -5 }, 'It was not lunch. Half the army wants your job.')] },
  scandal: { kind: 'Scandal', title: 'Minister caught with a gold toilet', text: 'Your finance minister has built a golden bathroom in a country that has no running water in half its villages.', opts: [
    O('Fire him', 'Make an example of the toilet owner.', { elite: -6, ppl: 5 }, 'He is gone. The toilet has been sold at auction.'),
    O('Cover it up', 'Toilet? What toilet?', { heat: 6, ppl: -4, elite: 4 }, 'The story fades, except for the toilet.'),
    O('Blame the opposition', 'They must have planted it.', { ppl: 2, elite: 3 }, 'Some believed you. Some pretended to.', 0.6, { ppl: -8 }, 'Nobody believed you, and the toilet is trending.')] },
  boom: { kind: 'Good news', title: 'Rare gold found near {city}', text: 'A farmer tripped on a rock, and the rock turned out to be a gold nugget the size of a loaf of bread.', opts: [
    O('The state keeps it', 'Nationalize the find immediately.', { tre: 16, elite: -3 }, 'The treasury glows. The farmer is furious.'),
    O('Sell licenses to the elite', 'Auction the mining rights.', { tre: 8, elite: 8 }, 'Tycoons love a good auction.'),
    O('Share it with the people', 'A bonus for every household.', { ppl: 10, tre: 4 }, 'Everyone loves you for roughly a week.')] },
  flood: { kind: 'Disaster', title: 'Floods swamp {city}', text: 'The river took a shortcut through the town and kept going.', opts: [
    O('Mount a relief effort', 'Boats, blankets and cameras.', { tre: -10, ppl: 6 }, 'The relief effort looked great on television.'),
    O('Call it an act of fate', 'Offer prayers and little else.', { ppl: -4, army: -1 }, 'Prayers were offered. Rain continued.'),
    O('Ask for foreign aid', 'Open the door for international help.', { ppl: 3, elite: -2, rel: { euro: 8 } }, 'Aid arrived with a lot of forms.')] },
  bank: { kind: 'Finance', title: 'Run on the national bank', text: 'Someone posted a rumor that the bank has no money, which is true, so everyone is queueing.', opts: [
    O('Guarantee all deposits', 'The state promises to pay everything.', { tre: -14, econ: 4 }, 'The queues melted and the vault emptied a little.'),
    O('Let it fail', 'Markets sort themselves out.', { econ: -8, elite: -6, ppl: -4 }, 'The bank went under. So did a lot of savings.'),
    O('Print the money', 'The printing press goes brrr.', { econ: 2, tre: 6, ppl: -5 }, 'Prices will be exciting next month.')] },
  expose: { kind: 'Press', title: 'Journalist exposes your yacht', text: 'A reporter found out you own a yacht. It has your face on the sail.', opts: [
    O('Arrest the journalist', 'Charges to be decided later.', { fear: 8, ppl: -7, heat: 8, rel: { euro: -8 } }, 'The journalist is gone. The headline is not.'),
    O('Ignore it', 'Nothing to see here, just a very large boat.', { ppl: -3 }, 'People forgot after a few days, mostly.'),
    O('Buy the newspaper', 'A friendly editor is a good editor.', { tre: -8, elite: 4, heat: 3 }, 'The paper now thinks you are a modest sailor.')] },
  students: { kind: 'Unrest', title: 'Student protests in {city}', text: 'Students are chanting in unison, which would be impressive if it did not rhyme with your name.', opts: [
    O('Meet with them', 'Hear them out and nod a lot.', { ppl: 3, elite: -2 }, 'The students left feeling heard. Nothing changed.'),
    O('Close the universities', 'Summer break starts early.', { ppl: -6, fear: 8, econ: -2 }, 'The campuses are quiet. The streets less so.'),
    O('Infiltrate the leaders', 'Plant a friendly face in every committee.', { ppl: 3, fear: 4 }, 'The groups started arguing among themselves.', 0.6, { ppl: -8, heat: 5 }, 'The spy was found. He was wearing a fake mustache.')] },
  famine: { kind: 'Disaster', title: 'Harvest fails across the east', text: 'It did not rain, then it rained too much, then there were locusts, which seems unfair.', opts: [
    O('Ask Bearistan for grain', 'Pootsky always has a spare silo.', { rel: { bear: 10 }, tre: -5, ppl: 4, heat: 3 }, 'The grain train arrived with a bill and a smile.'),
    O('Ration and hoard', 'The capital eats first.', { ppl: -6, elite: 5 }, 'The capital ate well. The countryside noticed.'),
    O('Emergency imports', 'Buy grain anywhere at any price.', { tre: -14, ppl: 6 }, 'Bread appeared. The treasury did not.')] },
  pandemic: { kind: 'Health', title: 'A mystery flu spreads from {city}', text: 'Doctors say it is probably just a flu. The doctors who said that have not been seen since.', opts: [
    O('Lock the country down', 'Everyone stays home.', { econ: -6, ppl: -2, fear: 6 }, 'The flu slowed. The economy did too.'),
    O('Business as usual', 'Wash your hands and hope.', { ppl: -4 }, 'Luck held.', 0.5, { ppl: -10, army: -4 }, 'The flu swept through barracks and bazaars.'),
    O('Buy foreign vaccines', 'A deal with the Confederation.', { rel: { euro: 8 }, tre: -8, ppl: 4 }, 'Vaccines arrived, with forms attached.')] },
  border: { kind: 'Security', title: 'Skirmish on the northern border', text: 'A neighbor’s patrol wandered across the line. Your patrol wandered back. Somebody fired a flare.', opts: [
    O('Strike back', 'Show them what your tanks look like.', { army: 6, ppl: 8 }, 'The neighbor retreated. Your tanks gave a victory lap.', 0.55, { army: -10, ppl: -6, heat: 8 }, 'The counterattack failed. The neighbor kept your jeeps.'),
    O('Negotiate', 'A peaceful solution, over tea.', { elite: 3, ppl: 1 }, 'Tea was served. Borders unchanged.'),
    O('Do nothing', 'The flare will burn out.', { ppl: -4, army: -4 }, 'The soldiers sulked. The flare burned out.')] },
  dragon: { kind: 'World', title: 'The Dragon offers a big loan', text: 'Premier Wen Lo-Pin wants to build you a port, a railway and a statue of himself in your capital. Terms are very long and very small print.', opts: [
    O('Accept the loan', 'Sign now, pay for decades.', { tre: 20, rel: { dragon: 10 }, debt: 1 }, 'The money arrived. So did the interest.'),
    O('Refuse', 'Sovereignty is not for rent.', { rel: { dragon: -4 }, ppl: 2 }, 'You kept your pride and your credit rating.'),
    O('Haggle', 'Ask for better terms.', { tre: 12, rel: { dragon: 6 } }, 'The Premier smiled and lowered one number.', 0.5, { rel: { dragon: -8 } }, 'The Premier did not appreciate the haggling.')] },
  bear: { kind: 'World', title: 'Bearistan wants a naval base', text: 'Vlad Pootsky offers cheap gas, plenty of mercenaries and a lovely naval base on your coast. He says it is just for fishing.', opts: [
    O('Accept', 'Cheap gas and friends with big boats.', { econ: 4, army: 5, rel: { bear: 15, bump: -10 }, heat: 6 }, 'The base was built. The fish were not consulted.'),
    O('Decline', 'No foreign bases.', { rel: { bear: -5 }, econ: -2 }, 'Pootsky was polite, in a way that matters.'),
    O('Play both sides', 'Tell Bump about the offer and ask for more.', { tre: 10, rel: { bear: 5, bump: 5 } }, 'Both sent gifts. Neither was fooled.', 0.5, { rel: { bear: -10, bump: -10 }, heat: 6 }, 'Both found out. Neither forgave.')] },
  emir: { kind: 'World', title: 'The Emir invites you to a gala', text: 'It will be seven days and seven courses. Gifts are expected. Gifts are exchanged. Gifts are measured.', opts: [
    O('Attend and dazzle', 'Bring the nicest gift you can afford.', { elite: 8, tre: 8, ppl: -3 }, 'The Emir was dazzled and so was your tax code.'),
    O('Send regrets', 'You are busy running a country.', { rel: { oil: -6 } }, 'The Emir noted your absence in his big book.'),
    O('Ask for a loan', 'Dessert first, then business.', { tre: 16 }, 'The Emir wrote a very large check.', 0.6, { rel: { oil: -10 }, ppl: -3 }, 'The Emir found the question rude.')] },
  euro: { kind: 'World', title: 'The Confederation offers aid with strings', text: 'The Chancellor will fund your schools and clinics if you promise to hold free elections, free speech and fill in Form 27-B.', opts: [
    O('Accept the terms', 'Take the money and sign the paperwork.', { tre: 14, ppl: 3, rel: { euro: 12 }, fear: -10 }, 'Money came. So did the observers.'),
    O('Refuse', 'Nobody tells you how to run your country.', { rel: { euro: -6 }, ppl: -1 }, 'The Chancellor sighed in four languages.'),
    O('Accept half', 'Take the funding, skip the elections.', { tre: 8, rel: { euro: 4 } }, 'The Chancellor accepted your terms, with an asterisk.', 0.6, { rel: { euro: -8 }, heat: 4 }, 'The Chancellor noticed. The Chancellor always notices.')] },
  bumpwarn: { kind: 'Bump', bump: true, title: 'Ronald Bump posts about you', text: 'The President posted four lines about you at 3 a.m. One was in capital letters. Two contained the word "sad".', opts: [
    O('Flatter him', 'Praise his hair, his deals and his golf.', { tre: -6, rel: { bump: 10 }, ppl: -3, anger: -8 }, 'Bump called you "a great leader, very great". It cost you a golf course.'),
    O('Defy him', 'Tell the world that you answer to nobody.', { ppl: 8, army: 3, heat: 6, anger: 8 }, 'The crowd cheered. Washington noticed.'),
    O('Lobby quietly', 'Send a lobbyist and a fruit basket.', { rel: { bump: 6 }, anger: -10 }, 'The fruit basket worked. Barely.', 0.6, { heat: 8, anger: 5 }, 'The lobbyist was spotted wearing your flag pin.'),
    O('Offer him a casino', 'Name a hotel after him on your best beach.', { tre: -8, elite: 4, rel: { bump: 12 }, anger: -12 }, 'The Bump Grand Casino & Resort is open for business.')] },
  bumpsanc: { kind: 'Bump', bump: true, title: 'Bump announces sanctions', text: 'He called a press conference in the Rose Garden, with a chart. The chart had your country in red.', opts: [
    O('Pay tribute', 'A generous gift to the Presidential library.', { tre: -14, rel: { bump: 10 }, ppl: -5, anger: -18 }, 'He called it a "tremendous deal". You called it rent.'),
    O('Retaliate with the Dragon', 'Move your trade and loyalty to Beijing-adjacent friends.', { rel: { dragon: 12, bump: -12 }, anger: 10, econ: 2 }, 'The Premier was delighted. Bump was not.'),
    O('Smuggle around the ban', 'Everything still ships, just under other names.', { econ: 2 }, 'The cargo ships found creative paperwork.', 0.6, { heat: 12, anger: 8 }, 'The coast guard found the creative paperwork.'),
    O('Rally the nation', 'This is a fight for national dignity.', { ppl: 10, anger: 4, econ: -4 }, 'The people stood tall and ate a bit less.')] },
  bumpult: { kind: 'Bump', bump: true, title: 'Bump delivers a final ultimatum', text: '"Change course, or we come get you." That is a paraphrase. The original had more adjectives.', opts: [
    O('Comply', 'Do what he says and hope history is kind.', { tre: -20, ppl: -8, elite: 4, anger: -35 }, 'He said "great decision" and scheduled a golf game.'),
    O('Mobilize and bluff', 'Parade the army and call it ready.', { army: 6, ppl: 8, anger: -20 }, 'The bluff worked, for now.', 0.45, { anger: 15, army: -4 }, 'The bluff was called. He is serious.'),
    O('Move to the bunker', 'Sleep somewhere new every night.', { guard: 2, ppl: -6, fear: 4 }, 'The leader’s location is now a state secret, even to the leader.'),
    O('Beg the Dragon for cover', 'Offer the Premier a few favors.', { rel: { dragon: 12, bump: -6 }, anger: 5, deter: 4 }, 'The Premier’s ships were spotted nearby. Bump took note.')] }
};
export const EVIDS = ['bread', 'strike', 'plot', 'scandal', 'boom', 'flood', 'bank', 'expose', 'students', 'famine', 'pandemic', 'border', 'dragon', 'bear', 'emir', 'euro'];

export const SYL = ['Bar', 'Zan', 'Mor', 'Kal', 'Dor', 'Vel', 'Tir', 'Sol', 'Ran', 'Gol', 'Pek', 'Nur', 'Lim', 'Bor', 'Quo', 'Fen', 'Han', 'Yor'];
export const SUF = ['ia', 'stan', 'land', 'ovia', 'ara', 'enia', 'mark', 'esh'];
export const CITYSUF = ['grad', 'ton', 'burg', 'abad', 'polis', 'ville', 'mere', 'ford'];
