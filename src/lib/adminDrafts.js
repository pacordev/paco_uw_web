// Empty-draft factories for the Admin "Build new" forms - split out of AdminForms.jsx so
// that file only exports components (keeps Fast Refresh happy).

export function emptyProductDraft() {
  return { code: "", name: "", description: "" };
}

export function emptyQuestionDraft(nextSequence) {
  return { code: "", text: "", answer_type: "boolean", enum_options: "", sequence: String(nextSequence), is_mandatory: true };
}

export function emptyRuleDraft() {
  return { name: "", priority: "1", outcome: "decline", stop_evaluation: false, conditions: [] };
}
