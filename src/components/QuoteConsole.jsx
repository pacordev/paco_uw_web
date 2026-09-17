import { useEffect, useState } from "react";
import Badge from "./Badge";
import { fmtTime } from "../lib/format";
import {
  createQuote,
  errorMessage,
  evaluateQuote,
  getProductQuestions,
  getProducts,
  submitAnswers,
} from "../lib/api";

function ProductPicker({ products, selected, onSelect }) {
  return (
    <div className="product-grid">
      {products.map((p) => (
        <button
          key={p.code}
          className={"product-card" + (p.code === selected ? " selected" : "")}
          onClick={() => onSelect(p.code)}
        >
          <span className="code">{p.code}</span>
          <span className="name">{p.name}</span>
          {p.description && <span className="desc">{p.description}</span>}
        </button>
      ))}
    </div>
  );
}

function Field({ q, value, onChange }) {
  if (q.answer_type === "boolean") {
    return (
      <div className="seg">
        <button className={value === "true" ? "on" : ""} onClick={() => onChange("true")}>Yes</button>
        <button className={value === "false" ? "on" : ""} onClick={() => onChange("false")}>No</button>
      </div>
    );
  }
  if (q.answer_type === "enum") {
    return (
      <div className="seg">
        {q.enum_options.map((opt) => (
          <button
            key={opt}
            className={value === opt ? "on" : ""}
            onClick={() => onChange(opt)}
          >
            {opt[0].toUpperCase() + opt.slice(1)}
          </button>
        ))}
      </div>
    );
  }
  if (q.answer_type === "number") {
    return (
      <input
        className="numfield"
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <input
      className="numfield"
      style={{ width: "100%" }}
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function QuestionForm({ questions, answers, onChange, onSubmit, canSubmit, submitting, lastSaved, submitError }) {
  return (
    <>
      <div className="qlist">
        {questions.map((q) => (
          <div className="qrow" key={q.question_code}>
            <span className="qcode">{q.question_code}{!q.is_mandatory && " · optional"}</span>
            <span className="qtext">{q.text}</span>
            <Field q={q} value={answers[q.question_code]} onChange={(v) => onChange(q.question_code, v)} />
          </div>
        ))}
      </div>
      <div className="form-actions">
        <button className="btn" disabled={!canSubmit || submitting} onClick={onSubmit}>
          {submitting ? "Saving…" : "Submit answers"}
        </button>
        {lastSaved && !submitting && (
          <span className="toast">✓ answers saved</span>
        )}
        <span className="form-note" style={{ marginLeft: "auto" }}>
          upsert on resubmit — answers can be corrected any time before evaluating
        </span>
      </div>
      {submitError && <div className="error-banner" style={{ marginTop: 12 }}>{submitError}</div>}
    </>
  );
}

function SessionPanel({ quoteId, answersSubmitted, history, onEvaluate, evaluating, evaluateError }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Session</h2>
        <span className="sub">quote_evaluation</span>
      </div>

      <div className="field-block">
        <div className="k">quote_id</div>
        <div className="token-line">{quoteId ?? "—"}</div>
      </div>

      <div className="field-block">
        <div className="k">Run evaluation</div>
        <div className="eval-actions">
          <button className="btn" disabled={!answersSubmitted || evaluating} onClick={() => onEvaluate("full")}>
            {evaluating ? "Evaluating…" : "Model A — full"}
          </button>
          <p className="eval-desc">Looks at all of your answers first, then gives the most serious result out of everything it found.</p>
          <button className="btn model-b" disabled={!answersSubmitted || evaluating} onClick={() => onEvaluate("short_circuit")}>
            Model B — short-circuit
          </button>
          <p className="eval-desc">Goes through your answers one by one and stops the moment it finds a serious enough problem.</p>
        </div>
        <div className="engine-note">
          Nothing runs automatically — after you submit your answers, pick one of the
          buttons above to get a decision.
        </div>
        {evaluateError && <div className="error-banner" style={{ marginTop: 10 }}>{evaluateError}</div>}
      </div>

      <div className="field-block">
        <div className="k">History ({history.length})</div>
        {history.length === 0 ? (
          <div className="empty-hist">
            No evaluations yet on this quote. Every run is kept — re-evaluating never
            overwrites a prior result.
          </div>
        ) : (
          <div className="hist-list">
            {history.map((h, i) => (
              <div className="hist-item" key={i}>
                <div className="row1">
                  <span className="strategy">{h.strategy}</span>
                  <span className="ts">{h.time}</span>
                </div>
                <Badge outcome={h.outcome} />
                {h.trigger && (
                  <div className="trigger-note">
                    Answer that decided it: <span className="trigger-q">{h.trigger}</span>
                    {h.stoppedEarly && " — caught this early, didn't need to check the rest"}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuoteConsole({ onQuoteChange }) {
  const [products, setProducts] = useState(null); // null = still loading
  const [productsError, setProductsError] = useState(null);
  const [productCode, setProductCode] = useState(null);
  const [step, setStep] = useState(0);

  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState(null);

  const [quote, setQuote] = useState(null); // {quoteId, accessToken}
  const [creatingQuote, setCreatingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState(null);

  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [lastSaved, setLastSaved] = useState(false);

  const [history, setHistory] = useState([]);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluateError, setEvaluateError] = useState(null);

  useEffect(() => {
    onQuoteChange?.(quote?.quoteId ?? null);
  }, [quote, onQuoteChange]);

  useEffect(() => {
    let cancelled = false;
    getProducts()
      .then((data) => {
        if (cancelled) return;
        setProducts(data);
        if (data.length > 0) selectProduct(data[0].code);
      })
      .catch((err) => {
        if (!cancelled) setProductsError(errorMessage(err, "Couldn't load products."));
      });
    return () => {
      cancelled = true;
    };
    // run once on mount - selectProduct is stable for the app's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectProduct(code) {
    setProductCode(code);
    setStep(1);
    setAnswers({});
    setHistory([]);
    setSubmitError(null);
    setEvaluateError(null);
    setLastSaved(false);
    setQuote(null);
    setQuoteError(null);

    setQuestionsLoading(true);
    setQuestionsError(null);
    getProductQuestions(code)
      .then((data) => setQuestions(data))
      .catch((err) => setQuestionsError(errorMessage(err, "Couldn't load questions.")))
      .finally(() => setQuestionsLoading(false));

    setCreatingQuote(true);
    createQuote(code)
      .then((data) => {
        const q = { quoteId: data.quote_id, accessToken: data.access_token };
        setQuote(q);
        try {
          // best-effort only - a private window or blocked site data shouldn't break
          // the flow, and there's no GET /quotes/{quote_id} yet to restore a session
          // from this on reload, so this is purely for later inspection
          localStorage.setItem(`binder.quote.${code}`, JSON.stringify(q));
        } catch {
          /* ignore */
        }
      })
      .catch((err) => setQuoteError(errorMessage(err, "Couldn't start a quote.")))
      .finally(() => setCreatingQuote(false));
  }

  function updateAnswer(code, value) {
    setAnswers((a) => ({ ...a, [code]: value }));
    setLastSaved(false);
  }

  const answeredCount = Object.values(answers).filter((v) => v !== undefined && v !== "").length;

  function handleSubmit() {
    if (!quote || answeredCount === 0) return;
    const payload = Object.entries(answers)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([question_code, answer_text]) => ({ question_code, answer_text }));

    setSubmitting(true);
    setSubmitError(null);
    submitAnswers(quote.quoteId, quote.accessToken, payload)
      .then(() => setLastSaved(true))
      .catch((err) => setSubmitError(errorMessage(err, "Couldn't save your answers.")))
      .finally(() => setSubmitting(false));
  }

  function runEvaluation(strategy) {
    if (!quote) return;
    setEvaluating(true);
    setEvaluateError(null);
    evaluateQuote(quote.quoteId, quote.accessToken, strategy)
      .then((data) => {
        // the API returns question codes, not text - questions is already loaded for
        // this product, so turn "Q_SMOKER + Q_BMI" into their real question text with
        // no extra fetch
        const triggerText = data.trigger
          ? data.trigger.question_codes
              .map((code) => questions.find((q) => q.question_code === code)?.text || code)
              .join(" + ")
          : null;
        setHistory((h) => [
          {
            strategy,
            outcome: data.outcome,
            trigger: triggerText,
            stoppedEarly: data.trigger?.stopped_early ?? false,
            time: fmtTime(new Date(data.evaluated_at)),
          },
          ...h,
        ]);
      })
      .catch((err) => setEvaluateError(errorMessage(err, "Couldn't evaluate this quote.")))
      .finally(() => setEvaluating(false));
  }

  const selectedProduct = products?.find((p) => p.code === productCode);

  return (
    <>
      <p className="intro-line">
        Pick a product below, answer its questions, then run either evaluation model from
        the panel on the right to get a decision — the history there also shows which
        answer drove each result. Need to manage the catalog instead? Switch to the{" "}
        <b>Admin</b> tab above: <b>Build new</b> creates a product and its questions/rules
        from scratch, and <b>Browse catalog</b> lets you look up what's already on file
        (browsing rules needs an admin key, entered once you're there).
      </p>

      {productsError ? (
        <div className="error-banner">Couldn't load products: {productsError}</div>
      ) : products === null ? (
        <div className="empty-hist">Loading products…</div>
      ) : (
        <div className="workbench">
          <div className="rail">
            <div className="rail-label">Steps</div>
            <button className={"step" + (step === 0 ? " active" : " done")} onClick={() => setStep(0)}>
              <span className="num">01</span>
              <span className="label">Select product</span>
            </button>
            <button
              className={"step" + (step === 1 ? " active" : "")}
              disabled={!productCode}
              onClick={() => productCode && setStep(1)}
            >
              <span className="num">02</span>
              <span className="label">Answer questions</span>
            </button>
            <div className="step-note">
              <span className="num">03</span>
              <span className="label">Evaluate →</span>
            </div>
            <div className="rail-foot">
              Evaluation runs from the session panel on the right — it's always available
              once answers are saved, not a separate page.
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>{step === 0 ? "Products" : (selectedProduct?.name ?? productCode)}</h2>
              <span className="sub">{step === 0 ? "catalog" : productCode}</span>
            </div>
            {step === 0 ? (
              <ProductPicker products={products} selected={productCode} onSelect={selectProduct} />
            ) : questionsError ? (
              <div className="error-banner">Couldn't load questions: {questionsError}</div>
            ) : questionsLoading ? (
              <div className="empty-hist">Loading questions…</div>
            ) : (
              <QuestionForm
                questions={questions}
                answers={answers}
                onChange={updateAnswer}
                onSubmit={handleSubmit}
                canSubmit={!!quote && answeredCount > 0}
                submitting={submitting}
                lastSaved={lastSaved}
                submitError={submitError}
              />
            )}
            {step === 1 && !quote && creatingQuote && (
              <div className="form-note" style={{ marginTop: 12 }}>Starting your quote…</div>
            )}
            {step === 1 && quoteError && (
              <div className="error-banner" style={{ marginTop: 12 }}>Couldn't start a quote: {quoteError}</div>
            )}
          </div>

          <SessionPanel
            quoteId={quote?.quoteId}
            answersSubmitted={lastSaved}
            history={history}
            onEvaluate={runEvaluation}
            evaluating={evaluating}
            evaluateError={evaluateError}
          />
        </div>
      )}

      <div className="foot">
        Every product, question, quote, answer, and evaluation on this page is real —
        nothing here is mock data.
      </div>
    </>
  );
}
