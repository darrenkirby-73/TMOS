import type { CoachWorkflow } from "@/lib/types";

/** What the UI should collect from the user before running a workflow. */
export type InputField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "scale" | "boolean" | "select";
  hint?: string;
  options?: string[];
  required?: boolean;
};

/** Stored data the payload assembler should attach for this workflow. */
export type ContextKind =
  | "today_day_record"
  | "recent_trades"
  | "all_closed_trades"
  | "week_day_records"
  | "week_trades"
  | "tags";

export type WorkflowDefinition = {
  id: CoachWorkflow;
  label: string;
  blurb: string;
  /** Inputs collected in the UI and sent as the user turn. */
  inputs: InputField[];
  /** Stored context to assemble from the database. */
  context: ContextKind[];
  /** Workflow-specific instructions appended to the system + role prompts. */
  taskPrompt: string;
};
