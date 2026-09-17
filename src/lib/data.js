// UI-only vocabulary, not fetched from the API - these mirror the Literal types
// underwritting_api/app/models.py encodes as Outcome/AnswerType/Operator. Products,
// questions, and rules all come from real endpoints now (see lib/api.js).

export const OUTCOME_LABEL = {
  accept: "Accept",
  increase_premium: "Increase premium",
  refer_to_insurer: "Refer to insurer",
  decline: "Decline",
};

export const ANSWER_TYPES = ["boolean", "number", "text", "enum"];
export const OPERATORS = ["=", "<>", ">", ">=", "<", "<="];
export const OUTCOMES = Object.keys(OUTCOME_LABEL);
