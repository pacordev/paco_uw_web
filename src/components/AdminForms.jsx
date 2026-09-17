import { ANSWER_TYPES, OPERATORS, OUTCOMES } from "../lib/data";

export function TextField({ label, value, onChange, placeholder, mono }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <input
        className="textfield"
        style={mono ? { fontFamily: "var(--mono)" } : undefined}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function SelectField({ label, value, options, onChange }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

export function AdminProductForm({ draft, onChange, onCreate, created, busy, disabled }) {
  return (
    <div className="form-grid">
      <TextField
        label="Product code"
        value={draft.code}
        onChange={(v) => onChange({ ...draft, code: v.toUpperCase() })}
        placeholder="e.g. BOAT_BASIC"
        mono
      />
      <TextField
        label="Name"
        value={draft.name}
        onChange={(v) => onChange({ ...draft, name: v })}
        placeholder="e.g. Basic Boat Insurance"
      />
      <TextField
        label="Description (optional)"
        value={draft.description}
        onChange={(v) => onChange({ ...draft, description: v })}
        placeholder="Shown in the product picker"
      />
      <div className="form-actions">
        <button className="btn" disabled={!draft.code || !draft.name || disabled} onClick={onCreate}>
          {busy ? "Creating…" : "Create product"}
        </button>
        {created && <span className="toast">✓ product created</span>}
        <span className="form-note" style={{ marginLeft: "auto" }}>
          needs a product before questions or rules can attach to it
        </span>
      </div>
    </div>
  );
}

export function AdminQuestionForm({ draft, onChange, onAdd, nextSequence, busy, disabled }) {
  return (
    <div className="form-grid">
      <div className="form-row">
        <TextField
          label="Question code"
          value={draft.code}
          onChange={(v) => onChange({ ...draft, code: v.toUpperCase() })}
          placeholder="e.g. Q_BOAT_LENGTH"
          mono
        />
        <SelectField
          label="Answer type"
          value={draft.answer_type}
          options={ANSWER_TYPES}
          onChange={(v) => onChange({ ...draft, answer_type: v })}
        />
      </div>
      <TextField
        label="Question text"
        value={draft.text}
        onChange={(v) => onChange({ ...draft, text: v })}
        placeholder="e.g. Boat length (ft)?"
      />
      {draft.answer_type === "enum" && (
        <TextField
          label="Options (comma-separated)"
          value={draft.enum_options}
          onChange={(v) => onChange({ ...draft, enum_options: v })}
          placeholder="low, medium, high"
        />
      )}
      <div className="form-row">
        <TextField label="Sequence" value={draft.sequence} onChange={(v) => onChange({ ...draft, sequence: v })} />
        <div className="form-field">
          <label>Mandatory</label>
          <div className="check-row">
            <input
              type="checkbox"
              checked={draft.is_mandatory}
              onChange={(e) => onChange({ ...draft, is_mandatory: e.target.checked })}
            />
            required before evaluating
          </div>
        </div>
      </div>
      <div className="form-actions">
        <button className="btn" disabled={!draft.code || !draft.text || disabled} onClick={onAdd}>
          {busy ? "Adding…" : "Add question"}
        </button>
        <span className="form-note">next sequence suggested: {nextSequence}</span>
      </div>
    </div>
  );
}

export function AdminRuleForm({ draft, onChange, onAdd, questionOptions, busy, disabled }) {
  function updateCondition(i, patch) {
    onChange({ ...draft, conditions: draft.conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
  }
  function addCondition() {
    onChange({
      ...draft,
      conditions: [...draft.conditions, { question_code: questionOptions[0] || "", operator: "=", value: "" }],
    });
  }
  function removeCondition(i) {
    onChange({ ...draft, conditions: draft.conditions.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="form-grid">
      <TextField label="Rule name" value={draft.name} onChange={(v) => onChange({ ...draft, name: v })} placeholder="e.g. Boat too long" />
      <div className="form-row">
        <SelectField label="Outcome" value={draft.outcome} options={OUTCOMES} onChange={(v) => onChange({ ...draft, outcome: v })} />
        <TextField label="Priority" value={draft.priority} onChange={(v) => onChange({ ...draft, priority: v })} />
        <div className="form-field">
          <label>Stop evaluation</label>
          <div className="check-row">
            <input
              type="checkbox"
              checked={draft.stop_evaluation}
              onChange={(e) => onChange({ ...draft, stop_evaluation: e.target.checked })}
            />
            Model B can short-circuit on this
          </div>
        </div>
      </div>
      <div className="form-field">
        <label>Conditions (all must match)</label>
        {draft.conditions.length === 0 && (
          <p className="form-note" style={{ margin: "0 0 8px" }}>no conditions yet — a rule needs at least one</p>
        )}
        {draft.conditions.map((c, i) => (
          <div className="cond-row" key={i}>
            <select className="select" value={c.question_code} onChange={(e) => updateCondition(i, { question_code: e.target.value })}>
              {questionOptions.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
            <select className="select" value={c.operator} onChange={(e) => updateCondition(i, { operator: e.target.value })}>
              {OPERATORS.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
            <input
              className="textfield"
              value={c.value}
              onChange={(e) => updateCondition(i, { value: e.target.value })}
              placeholder="value"
            />
            <button className="remove-btn" onClick={() => removeCondition(i)} title="Remove condition">×</button>
          </div>
        ))}
        <button
          className="btn ghost"
          style={{ marginTop: 8 }}
          onClick={addCondition}
          disabled={questionOptions.length === 0}
        >
          + Add condition
        </button>
      </div>
      <div className="form-actions">
        <button className="btn" disabled={!draft.name || draft.conditions.length === 0 || disabled} onClick={onAdd}>
          {busy ? "Adding…" : "Add rule"}
        </button>
      </div>
    </div>
  );
}
