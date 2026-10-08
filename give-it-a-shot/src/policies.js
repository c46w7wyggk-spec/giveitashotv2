// The full desk-bill catalog beyond the original 35. Each part file holds one area; see policies/p.js for the fields.
import { HEALTH_EDU } from './policies/health_edu.js';
import { TAX_FIN } from './policies/tax_finance.js';
import { LHT } from './policies/labor_housing_trade.js';
import { ETM } from './policies/energy_tech_misc.js';
export { BASE_TOPIC, BASE_SYS, BASE_KILL } from './policies/base_tree.js';
export const POL2 = [].concat(HEALTH_EDU, TAX_FIN, LHT, ETM);
