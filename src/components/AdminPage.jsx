import { useState } from "react";
import Badge from "./Badge";
import CatalogBrowser from "./CatalogBrowser";
import { AdminProductForm, AdminQuestionForm, AdminRuleForm } from "./AdminForms";
import { emptyProductDraft, emptyQuestionDraft, emptyRuleDraft } from "../lib/adminDrafts";
import { fmtTime } from "../lib/format";
import { addProductQuestion, addProductRule, createProduct as apiCreateProduct, errorMessage } from "../lib/api";

// Admin — build the product catalog (new product, its questions, its rules) or browse
// what's already there. Every action here calls a real endpoint in underwritting_api/
// app/admin.py (POST /products, .../questions, .../rules, GET .../rules), all behind
// X-Admin-Key - there's exactly one admin key input above, shared by both modes.
export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [mode, setMode] = useState("build"); // "build" | "browse"
  const [step, setStep] = useState(0); // 0 product, 1 questions, 2 rules

  const [product, setProduct] = useState(null);
  const [productDraft, setProductDraft] = useState(emptyProductDraft());
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [productError, setProductError] = useState(null);

  const [questions, setQuestions] = useState([]);
  const [questionDraft, setQuestionDraft] = useState(emptyQuestionDraft(1));
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState(null);

  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState(emptyRuleDraft());
  const [addingRule, setAddingRule] = useState(false);
  const [ruleError, setRuleError] = useState(null);

  const [log, setLog] = useState([]);

  function pushLog(message) {
    setLog((l) => [{ message, time: fmtTime(new Date()) }, ...l]);
  }

  function createProduct() {
    setCreatingProduct(true);
    setProductError(null);
    apiCreateProduct(adminKey, productDraft)
      .then((created) => {
        setProduct(created);
        pushLog(`Created product ${created.code}`);
        setStep(1);
      })
      .catch((err) => setProductError(errorMessage(err, "Couldn't create the product.")))
      .finally(() => setCreatingProduct(false));
  }

  function addQuestion() {
    const body = {
      question_code: questionDraft.code,
      text: questionDraft.text,
      answer_type: questionDraft.answer_type,
      enum_options: questionDraft.answer_type === "enum"
        ? questionDraft.enum_options.split(",").map((s) => s.trim()).filter(Boolean)
        : null,
      sequence: parseInt(questionDraft.sequence, 10) || questions.length + 1,
      is_mandatory: questionDraft.is_mandatory,
    };
    setAddingQuestion(true);
    setQuestionError(null);
    addProductQuestion(adminKey, product.code, body)
      .then((created) => {
        setQuestions((qs) => [...qs, created]);
        pushLog(`Added question ${created.question_code}`);
        setQuestionDraft(emptyQuestionDraft(questions.length + 2));
      })
      .catch((err) => setQuestionError(errorMessage(err, "Couldn't add the question.")))
      .finally(() => setAddingQuestion(false));
  }

  function addRule() {
    const body = {
      name: ruleDraft.name,
      priority: parseInt(ruleDraft.priority, 10) || 1,
      outcome: ruleDraft.outcome,
      stop_evaluation: ruleDraft.stop_evaluation,
      conditions: ruleDraft.conditions,
    };
    setAddingRule(true);
    setRuleError(null);
    addProductRule(adminKey, product.code, body)
      .then((created) => {
        setRules((rs) => [...rs, created]);
        pushLog(`Added rule "${created.name}"`);
        setRuleDraft(emptyRuleDraft());
      })
      .catch((err) => setRuleError(errorMessage(err, "Couldn't add the rule.")))
      .finally(() => setAddingRule(false));
  }

  const questionCodes = questions.map((q) => q.question_code);
  const canAct = adminKey.trim().length > 0;

  return (
    <>
      <p className="intro-line">
        Build a product's catalog entry — create it, add its questions, then the rules
        that decide it — or switch to <b>Browse catalog</b> to see what's already on file.
        These are real, authenticated writes and reads, gated by an admin key — enter yours
        below to enable either mode.
      </p>

      <div className="form-field" style={{ maxWidth: 340, marginBottom: 14 }}>
        <label>Admin key</label>
        <input
          className="textfield"
          style={{ fontFamily: "var(--mono)" }}
          type="password"
          value={adminKey}
          placeholder="paste your admin key"
          onChange={(e) => setAdminKey(e.target.value)}
        />
      </div>

      <div className="seg" style={{ marginBottom: 14 }}>
        <button className={mode === "build" ? "on" : ""} onClick={() => setMode("build")}>
          Build new
        </button>
        <button className={mode === "browse" ? "on" : ""} onClick={() => setMode("browse")}>
          Browse catalog
        </button>
      </div>

      {mode === "browse" ? (
        <CatalogBrowser adminKey={adminKey} />
      ) : (
        <div className="workbench">
          <div className="rail">
            <div className="rail-label">Steps</div>
            <button className={"step" + (step === 0 ? " active" : product ? " done" : "")} onClick={() => setStep(0)}>
              <span className="num">01</span>
              <span className="label">Product</span>
            </button>
            <button
              className={"step" + (step === 1 ? " active" : questions.length ? " done" : "")}
              disabled={!product}
              onClick={() => product && setStep(1)}
            >
              <span className="num">02</span>
              <span className="label">Questions</span>
            </button>
            <button
              className={"step" + (step === 2 ? " active" : rules.length ? " done" : "")}
              disabled={!product}
              onClick={() => product && setStep(2)}
            >
              <span className="num">03</span>
              <span className="label">Rules</span>
            </button>
            <div className="rail-foot">
              Each step is a real write to the catalog, gated by the admin key entered
              above.
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>{step === 0 ? "New product" : step === 1 ? "Add a question" : "Add a rule"}</h2>
              <span className="sub">
                {step === 0 ? "create" : step === 1 ? "attach a question" : "attach a rule"}
              </span>
            </div>
            {!canAct && (
              <div className="form-note" style={{ marginBottom: 12 }}>
                Enter an admin key above before creating or adding anything.
              </div>
            )}
            {step === 0 && (
              <>
                <AdminProductForm
                  draft={productDraft}
                  onChange={setProductDraft}
                  onCreate={createProduct}
                  created={!!product}
                  busy={creatingProduct}
                  disabled={!canAct || creatingProduct}
                />
                {productError && <div className="error-banner" style={{ marginTop: 12 }}>{productError}</div>}
              </>
            )}
            {step === 1 && (
              <>
                <AdminQuestionForm
                  draft={questionDraft}
                  onChange={setQuestionDraft}
                  onAdd={addQuestion}
                  nextSequence={questions.length + 1}
                  busy={addingQuestion}
                  disabled={!canAct || addingQuestion}
                />
                {questionError && <div className="error-banner" style={{ marginTop: 12 }}>{questionError}</div>}
                {questions.length > 0 && (
                  <div className="admin-list">
                    {questions.map((q) => (
                      <div className="admin-item" key={q.question_code}>
                        <div className="row1">
                          <span className="code">{q.question_code}</span>
                          <span className="meta">seq {q.sequence} · {q.answer_type}{q.is_mandatory ? "" : " · optional"}</span>
                        </div>
                        <span className="text">{q.text}</span>
                        {q.enum_options && <span className="meta">options: {q.enum_options.join(", ")}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {step === 2 && (
              <>
                <AdminRuleForm
                  draft={ruleDraft}
                  onChange={setRuleDraft}
                  onAdd={addRule}
                  questionOptions={questionCodes}
                  busy={addingRule}
                  disabled={!canAct || addingRule}
                />
                {ruleError && <div className="error-banner" style={{ marginTop: 12 }}>{ruleError}</div>}
                {rules.length > 0 && (
                  <div className="admin-list">
                    {rules.map((r) => (
                      <div className="admin-item" key={r.id}>
                        <div className="row1">
                          <span className="text">{r.name}</span>
                          <Badge outcome={r.outcome} />
                        </div>
                        <span className="conds">
                          {r.conditions.map((c) => `${c.question_code} ${c.operator} ${c.value}`).join("  AND  ")}
                        </span>
                        {r.stop_evaluation && <span className="meta">stop_evaluation: true</span>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Draft</h2>
              <span className="sub">this session</span>
            </div>
            <div className="draft-summary">
              <div className="line"><span>Product</span><b>{product ? product.code : "—"}</b></div>
              <div className="line"><span>Questions</span><b>{questions.length}</b></div>
              <div className="line"><span>Rules</span><b>{rules.length}</b></div>
            </div>
            <div className="field-block">
              <div className="k">Activity ({log.length})</div>
              {log.length === 0 ? (
                <div className="empty-hist">Nothing yet — start by creating a product.</div>
              ) : (
                <div className="hist-list">
                  {log.map((entry, i) => (
                    <div className="hist-item" key={i}>
                      <div className="row1">
                        <span className="strategy">{entry.message}</span>
                        <span className="ts">{entry.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="foot">
        Wired to the real API: <b>Build new</b> creates real rows in the catalog (every
        product/question/rule you add here is really there afterward — there's no undo).{" "}
        <b>Browse catalog</b> reads real questions and, once you've entered a key above,
        real rules too.
      </div>
    </>
  );
}
