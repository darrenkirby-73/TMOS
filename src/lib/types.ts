export type Direction = "long" | "short";
export type TradeType = "shadow" | "live_small" | "live_full";
export type TradeStatus = "open" | "closed";
export type TagCategory =
  | "winning_attitude"
  | "losing_attitude"
  | "setup"
  | "system"
  | "lapse_type";
export type CoachWorkflow =
  | "morning_coach"
  | "pre_trade_review"
  | "evening_debrief"
  | "trade_analyst"
  | "weekly_review";

export const TRADE_TYPES: { value: TradeType; label: string }[] = [
  { value: "shadow", label: "Shadow" },
  { value: "live_small", label: "Live (small)" },
  { value: "live_full", label: "Live (full)" },
];

// Vocabulary options offered by the app; stored as plain text so the user
// can evolve their own wording later.
export const STRESS_TRENDS = ["improved", "stable", "worse"] as const;
export const DECISION_QUALITIES = ["good", "mixed", "poor"] as const;

export type ChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
};

export type Trade = {
  id: string;
  user_id: string;
  day_record_id: string | null;
  date: string;
  ticker: string;
  direction: Direction;
  setup: string | null;
  system: string | null;
  entry_price: number;
  stop_price: number;
  exit_price: number | null;
  quantity: number;
  risk_amount_gbp: number;
  r_result: number | null;
  is_complex_trade: boolean;
  position_size: number | null;
  trade_type: TradeType;
  status: TradeStatus;
  plan_compliant: boolean;
  mistake: boolean;
  discipline_lapse: boolean;
  lapse_type: string | null;
  losing_attitude_present: boolean;
  attitude_tag: string | null;
  winning_attitude_applied: string | null;
  decision_quality: string | null;
  stress_before_trade: number | null;
  stress_after_trade: number | null;
  screenshot_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DayRecord = {
  id: string;
  user_id: string;
  date: string;
  traded: boolean;
  planned_risk_per_trade: number | null;
  max_daily_risk: number | null;
  max_trades_planned: number | null;
  stress_before: number | null;
  energy_before: number | null;
  conditions_acceptable: boolean | null;
  winning_attitude_focus: string | null;
  losing_attitude_watch: string | null;
  discipline_checklist: ChecklistItem[] | null;
  decision_sequence: string | null;
  decision_commitment: boolean | null;
  morning_completed_at: string | null;
  stress_after: number | null;
  stress_trend: string | null;
  num_trades: number;
  total_r_today: number | null;
  plan_compliant_trades: number;
  mistakes_count: number;
  discipline_lapses_count: number;
  top_lapse_type: string | null;
  losing_attitudes_observed: string[] | null;
  winning_attitudes_applied: string[] | null;
  decision_quality: string | null;
  worst_decision_note: string | null;
  best_catch_note: string | null;
  tomorrow_adjustment: string | null;
  evening_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Tag = {
  id: string;
  user_id: string;
  category: TagCategory;
  label: string;
  created_at: string;
};

export type SystemStatus = "active" | "testing" | "retired";

export const SYSTEM_STATUSES: { value: SystemStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "testing", label: "Testing" },
  { value: "retired", label: "Retired" },
];

/**
 * The definition behind a system name. Trades reference systems by text, not
 * by id, so a definition can be edited or retired without touching history.
 */
export type TradingSystem = {
  id: string;
  user_id: string;
  name: string;
  status: SystemStatus;
  markets: string | null;
  timeframe: string | null;
  entry_rules: string | null;
  exit_rules: string | null;
  stop_rules: string | null;
  position_sizing: string | null;
  edge_rationale: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type WeeklyReflection = {
  id: string;
  user_id: string;
  week_start_date: string;
  went_well: string | null;
  what_broke_down: string | null;
  improvement_risk: string | null;
  improvement_stress: string | null;
  improvement_attitude_discipline: string | null;
  improvement_decision_process: string | null;
  rules_to_adjust: string | null;
  created_at: string;
  updated_at: string;
};

export type CoachingSession = {
  id: string;
  user_id: string;
  workflow: CoachWorkflow;
  input_payload: Record<string, unknown>;
  response: string;
  model: string;
  created_at: string;
};
