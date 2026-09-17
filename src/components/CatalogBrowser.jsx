import { useEffect, useState } from "react";
import Badge from "./Badge";
import { errorMessage, getProductQuestions, getProductRules, getProducts } from "../lib/api";

export default function CatalogBrowser({ adminKey }) {
  const [products, setProducts] = useState(null); // null = still loading
  const [productsError, setProductsError] = useState(null);
  const [code, setCode] = useState(null);

  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState(null);

  const [rules, setRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getProducts()
      .then((data) => {
        if (cancelled) return;
        setProducts(data);
        if (data.length > 0) setCode(data[0].code);
      })
      .catch((err) => {
        if (!cancelled) setProductsError(errorMessage(err, "Couldn't load products."));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    setQuestionsLoading(true);
    setQuestionsError(null);
    getProductQuestions(code)
      .then((data) => !cancelled && setQuestions(data))
      .catch((err) => !cancelled && setQuestionsError(errorMessage(err, "Couldn't load questions.")))
      .finally(() => !cancelled && setQuestionsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    if (!code) return;
    if (!adminKey) {
      setRules([]);
      setRulesError(null);
      return;
    }
    let cancelled = false;
    setRulesLoading(true);
    setRulesError(null);
    getProductRules(code, adminKey)
      .then((data) => !cancelled && setRules(data))
      .catch((err) => !cancelled && setRulesError(errorMessage(err, "Couldn't load rules.")))
      .finally(() => !cancelled && setRulesLoading(false));
    return () => {
      cancelled = true;
    };
  }, [code, adminKey]);

  if (productsError) {
    return <div className="error-banner">Couldn't load products: {productsError}</div>;
  }
  if (products === null) {
    return <div className="empty-hist">Loading products…</div>;
  }

  const product = products.find((p) => p.code === code);

  return (
    <div className="workbench">
      <div className="rail">
        <div className="rail-label">Products</div>
        {products.map((p) => (
          <button
            key={p.code}
            className={"catalog-item" + (p.code === code ? " active" : "")}
            onClick={() => setCode(p.code)}
          >
            <span className="code">{p.code}</span>
            <span className="name">{p.name}</span>
          </button>
        ))}
        <div className="rail-foot">
          Questions are public. Rules are admin-only — enter an admin key above to load
          them.
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>{product?.name ?? code}</h2>
          <span className="sub">{questions.length} questions</span>
        </div>
        {questionsError ? (
          <div className="error-banner">{questionsError}</div>
        ) : questionsLoading ? (
          <div className="empty-hist">Loading questions…</div>
        ) : (
          <div className="qlist">
            {questions.map((q, i) => (
              <div className="qrow" key={q.question_code}>
                <span className="qcode">{q.question_code}</span>
                <span className="qtext">{q.text}</span>
                <span className="qmeta">
                  seq {q.sequence ?? i + 1} · {q.answer_type}
                  {q.enum_options ? ` (${q.enum_options.join(", ")})` : ""}
                  {q.is_mandatory ? " · mandatory" : " · optional"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Rules</h2>
          <span className="sub">{rules.length} total</span>
        </div>
        {!adminKey ? (
          <div className="empty-hist">Enter an admin key above to load this product's rules.</div>
        ) : rulesError ? (
          <div className="error-banner">{rulesError}</div>
        ) : rulesLoading ? (
          <div className="empty-hist">Loading rules…</div>
        ) : rules.length === 0 ? (
          <div className="empty-hist">No rules on record for this product.</div>
        ) : (
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
      </div>
    </div>
  );
}
