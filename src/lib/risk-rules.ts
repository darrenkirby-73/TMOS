/**
 * Risk limits, in one place.
 *
 * These were previously literal strings repeated across the spec, two coach
 * prompts, the morning form's hints and defaults, the system-definition hint
 * and the demo seed — eight copies that drifted out of step the moment the
 * rule changed. Anything that states a limit to the user or to a model reads
 * it from here.
 *
 * Percentages are of account equity. The relationship between them matters as
 * much as the values: max open risk divided by per-trade risk is how many
 * positions can be open at once, and max new daily risk is how many can be
 * opened in a day. Changing one without the others produces a rule set that
 * contradicts itself.
 */
export const RISK_RULES = {
  /** Risk accepted on a single trade, as a percentage of equity. */
  perTradePercent: 1.0,
  /** Total risk allowed across all open positions. 3 concurrent positions. */
  maxOpenRiskPercent: 3.0,
  /** New risk allowed in one day. 2 new positions. */
  maxNewDailyRiskPercent: 2.0,
} as const;

function pct(value: number): string {
  // Trim a trailing ".0" so hints read "1%" rather than "1.0%".
  return `${Number.isInteger(value) ? value : value.toFixed(2)}%`;
}

export const RISK_RULE_TEXT = {
  perTrade: pct(RISK_RULES.perTradePercent),
  maxOpen: pct(RISK_RULES.maxOpenRiskPercent),
  maxNewDaily: pct(RISK_RULES.maxNewDailyRiskPercent),
  /** One line summarising all three, for prompts and help text. */
  summary: `${pct(RISK_RULES.perTradePercent)} risk per trade, max ${pct(
    RISK_RULES.maxOpenRiskPercent,
  )} total open risk, max ${pct(RISK_RULES.maxNewDailyRiskPercent)} new risk per day`,
} as const;

/**
 * How many positions the limits imply, which is what makes the numbers
 * coherent rather than arbitrary.
 */
export const IMPLIED_POSITIONS = {
  concurrent: RISK_RULES.maxOpenRiskPercent / RISK_RULES.perTradePercent,
  perDay: RISK_RULES.maxNewDailyRiskPercent / RISK_RULES.perTradePercent,
} as const;
