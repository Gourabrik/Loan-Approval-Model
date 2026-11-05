import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, BarChart3,
  BriefcaseBusiness, Check, ChevronDown, CircleHelp, Clock3, ExternalLink,
  FileSearch, Gauge, Landmark, LoaderCircle, LockKeyhole, Menu, ShieldCheck,
  Sparkles, TrendingUp, X,
} from 'lucide-react';

const initialForm = {
  age: 35, income: 75000, loan_amount: 25000, credit_score: 680,
  months_employed: 36, num_credit_lines: 3, loan_term: 36, dti_ratio: 0.35,
  education: "Bachelor's", employment_type: 'Full-time', marital_status: 'Single',
  has_mortgage: 'No', has_dependents: 'No', loan_purpose: 'Auto', has_co_signer: 'No',
};

const currency = (value) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
}).format(value || 0);

const apiRequest = async (url, options) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail ?? body);
    } catch { /* keep the HTTP status message */ }
    throw new Error(detail);
  }
  return response.json();
};

function Field({ label, hint, children }) {
  return <label className="field"><span className="field-label">{label}{hint && <span className="hint" title={hint}><CircleHelp size={13} /></span>}</span>{children}</label>;
}

function NumberField({ label, value, onChange, min, max, step = 1, prefix, suffix, hint }) {
  return <Field label={label} hint={hint}><span className="input-wrap">{prefix && <span className="input-affix">{prefix}</span>}<input type="number" value={value} min={min} max={max} step={step} required onChange={onChange} />{suffix && <span className="input-affix">{suffix}</span>}</span></Field>;
}

function SelectField({ label, value, onChange, options }) {
  return <Field label={label}><span className="select-wrap"><select value={value} onChange={onChange}>{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={15} /></span></Field>;
}

function Metric({ label, value, note, icon: Icon }) {
  return <div className="metric-card"><span className="metric-icon"><Icon size={17} /></span><div><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-note">{note}</span></div></div>;
}

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [apiStatus, setApiStatus] = useState('checking');
  const [modelInfo, setModelInfo] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([apiRequest('/health'), apiRequest('/model-info')])
      .then(([, info]) => { if (active) { setApiStatus('online'); setModelInfo(info); } })
      .catch(() => { if (active) setApiStatus('offline'); });
    return () => { active = false; };
  }, []);

  const setValue = (key) => (event) => {
    const numeric = ['age', 'income', 'loan_amount', 'credit_score', 'months_employed', 'num_credit_lines', 'loan_term', 'dti_ratio'].includes(key);
    setForm((current) => ({ ...current, [key]: numeric ? Number(event.target.value) : event.target.value }));
  };

  const runAnalysis = async (event) => {
    event.preventDefault();
    setLoading(true); setError(''); setNotice(''); setExplanation(null);
    try {
      const payload = { ...form };
      const result = await apiRequest('/predict', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      setPrediction(result);
      setApiStatus('online');
      try {
        setExplanation(await apiRequest('/explain', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        }));
      } catch {
        setNotice('Risk estimate completed. Feature explanations are temporarily unavailable.');
      }
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (cause) {
      setError(cause.message || 'Unable to analyze this profile. Check that the API is running.');
      setApiStatus('offline');
    } finally { setLoading(false); }
  };

  const resetForm = () => { setForm(initialForm); setPrediction(null); setExplanation(null); setError(''); setNotice(''); };
  const classifierMetrics = modelInfo?.metrics?.default_classifier?.model;
  const rateStatus = modelInfo?.interest_rate_model_status;
  const riskPercent = prediction ? Math.round(prediction.default_probability * 1000) / 10 : null;
  const riskTone = riskPercent == null ? 'neutral' : riskPercent < 15 ? 'low' : riskPercent < 30 ? 'moderate' : 'high';
  const contributions = useMemo(() => {
    if (!explanation?.default_log_odds_contributions) return [];
    return [...explanation.default_log_odds_contributions]
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 6);
  }, [explanation]);
  const largestContribution = Math.max(0.01, ...contributions.map((item) => Math.abs(item.contribution)));

  return (
    <div className="site-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="topbar">
        <a className="wordmark" href="#home" aria-label="Nexora home"><span className="logo-mark"><Sparkles size={18} /></span><span>Nexora<span className="wordmark-dot">.</span></span></a>
        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
        <nav className={`nav-links ${menuOpen ? 'nav-open' : ''}`}>
          <a href="#platform" onClick={() => setMenuOpen(false)}>Platform</a><a href="#analysis" onClick={() => setMenuOpen(false)}>Risk analysis</a><a href="#method" onClick={() => setMenuOpen(false)}>Methodology</a>
        </nav>
        <div className="top-actions"><span className={`api-pill ${apiStatus}`}><i />{apiStatus === 'online' ? 'Models online' : apiStatus === 'checking' ? 'Connecting' : 'API offline'}</span><a className="nav-cta" href="#analysis">Open workspace <ArrowRight size={14} /></a></div>
      </header>

      <main id="home">
        <section className="hero section-wrap" id="platform">
          <div className="hero-copy">
            <div className="hero-kicker"><span className="kicker-dot" /> CREDIT RISK INTELLIGENCE <span className="kicker-divider" /> MODEL-POWERED ANALYSIS</div>
            <h1>See the signals<br />behind <span>credit risk.</span></h1>
            <p className="hero-description">A clearer view of default risk and historical rate patterns. Explore a profile, understand the model, and inspect the factors behind each estimate.</p>
            <div className="hero-actions"><a className="button-primary" href="#analysis">Analyze a profile <ArrowRight size={16} /></a><a className="button-quiet" href="#method">Explore the methodology <ArrowDownRight size={16} /></a></div>
            <div className="hero-trust"><span><ShieldCheck size={15} /> Explainable model outputs</span><span><LockKeyhole size={14} /> Local demo environment</span></div>
          </div>
          <div className="hero-visual" aria-label="Illustrative model risk dashboard">
            <div className="visual-orbit orbit-a" /><div className="visual-orbit orbit-b" />
            <div className="glass-float glass-float-top"><span className="float-icon"><Activity size={16} /></span><span><small>MODEL SIGNAL</small><strong>Multi-factor analysis</strong></span><span className="float-check"><Check size={14} /></span></div>
            <div className="preview-card glass-card">
              <div className="preview-head"><div><span className="preview-eyebrow">RISK PROFILE PREVIEW</span><h2>Applicant overview</h2></div><span className="preview-menu"><span /><span /><span /></span></div>
              <div className="preview-score"><div className="preview-gauge"><div className="gauge-inner"><strong>{riskPercent == null ? '—' : `${riskPercent}%`}</strong><span>default risk</span></div></div><div className="preview-score-copy"><span className="mini-status"><i /> {prediction ? 'Analysis complete' : 'Awaiting profile'}</span><strong>{prediction ? `${riskTone[0].toUpperCase()}${riskTone.slice(1)} risk range` : 'Ready when you are'}</strong><small>{prediction ? 'Estimated from historical patterns' : 'Submit an application to see its signals'}</small></div></div>
              <div className="preview-chart-head"><span>Signal direction</span><span>ILLUSTRATIVE</span></div>
              <div className="preview-bars"><span className="bar bar-a" /><span className="bar bar-b" /><span className="bar bar-c" /><span className="bar bar-d" /><span className="bar bar-e" /><span className="bar bar-f" /><span className="bar bar-g" /><span className="bar bar-h" /></div>
              <div className="preview-foot"><span><span className="legend-dot risk-dot" /> risk-increasing</span><span><span className="legend-dot buffer-dot" /> risk-reducing</span><span className="preview-lock"><LockKeyhole size={12} /> demo</span></div>
            </div>
            <div className="glass-float glass-float-bottom"><span className="float-icon float-icon-green"><BarChart3 size={16} /></span><span><small>MODEL TRANSPARENCY</small><strong>Baseline performance tracked</strong></span><BadgeCheck className="float-badge" size={18} /></div>
          </div>
        </section>

        <section className="metrics-strip section-wrap" aria-label="Model information">
          <Metric label="Default model" value={classifierMetrics ? `${(classifierMetrics.roc_auc * 100).toFixed(1)}%` : '—'} note="ROC-AUC · held-out data" icon={Gauge} />
          <Metric label="Precision signal" value={classifierMetrics ? `${(classifierMetrics.average_precision * 100).toFixed(1)}%` : '—'} note="Average precision" icon={TrendingUp} />
          <Metric label="Rate model" value={rateStatus === 'beats_baseline' ? 'Validated' : rateStatus ? 'Baseline wins' : '—'} note="Compared with train-mean baseline" icon={Activity} />
          <Metric label="Explainability" value="SHAP" note="Local feature contributions" icon={FileSearch} />
        </section>

        <section className="workspace section-wrap" id="analysis">
          <div className="section-heading"><div><span className="section-eyebrow">THE ANALYSIS WORKSPACE</span><h2>Build a risk profile.</h2><p>Enter a representative profile to explore model estimates and their key drivers.</p></div><div className="workspace-meta"><span><LockKeyhole size={14} /> Your input stays in this local demo</span><span className="meta-separator" /><button type="button" onClick={resetForm}>Reset fields</button></div></div>

          <div className="workspace-grid">
            <form className="form-card" onSubmit={runAnalysis}>
              <div className="form-head"><span className="form-icon"><BriefcaseBusiness size={18} /></span><div><h3>Applicant profile</h3><p>Complete the fields to run the trained models.</p></div><span className="step-chip">01 <span>/</span> PROFILE</span></div>
              <div className="form-section-title"><span>Financial profile</span><i /></div>
              <div className="form-grid">
                <NumberField label="Annual income" value={form.income} min={1} max={100000000} prefix="$" onChange={setValue('income')} />
                <NumberField label="Requested amount" value={form.loan_amount} min={1} max={100000000} prefix="$" onChange={setValue('loan_amount')} />
                <NumberField label="Credit score" value={form.credit_score} min={300} max={850} onChange={setValue('credit_score')} hint="Score range accepted by this model: 300 to 850." />
                <NumberField label="Debt-to-income ratio" value={form.dti_ratio} min={0} max={5} step={0.01} suffix="×" onChange={setValue('dti_ratio')} hint="Enter as a ratio: 0.35 means 35%." />
                <NumberField label="Loan term" value={form.loan_term} min={1} max={120} suffix="months" onChange={setValue('loan_term')} />
                <NumberField label="Open credit lines" value={form.num_credit_lines} min={0} max={100} onChange={setValue('num_credit_lines')} />
              </div>
              <div className="form-section-title section-divider"><span>Applicant details</span><i /></div>
              <div className="form-grid">
                <NumberField label="Age" value={form.age} min={18} max={100} onChange={setValue('age')} />
                <NumberField label="Employment tenure" value={form.months_employed} min={0} max={720} suffix="months" onChange={setValue('months_employed')} />
                <SelectField label="Education" value={form.education} onChange={setValue('education')} options={["Bachelor's", 'High School', "Master's", 'PhD']} />
                <SelectField label="Employment type" value={form.employment_type} onChange={setValue('employment_type')} options={['Full-time', 'Part-time', 'Self-employed', 'Unemployed']} />
                <SelectField label="Marital status" value={form.marital_status} onChange={setValue('marital_status')} options={['Single', 'Married', 'Divorced']} />
                <SelectField label="Loan purpose" value={form.loan_purpose} onChange={setValue('loan_purpose')} options={['Auto', 'Business', 'Education', 'Home', 'Other']} />
                <SelectField label="Mortgage" value={form.has_mortgage} onChange={setValue('has_mortgage')} options={['No', 'Yes']} />
                <SelectField label="Dependents" value={form.has_dependents} onChange={setValue('has_dependents')} options={['No', 'Yes']} />
                <SelectField label="Co-signer" value={form.has_co_signer} onChange={setValue('has_co_signer')} options={['No', 'Yes']} />
              </div>
              {error && <div className="error-box" role="alert"><span><X size={15} /></span><div><strong>Unable to complete analysis</strong><small>{error}</small>{apiStatus === 'offline' && <code>python -m uvicorn api.main:app --reload</code>}</div></div>}
              {notice && <div className="notice-box" role="status">{notice}</div>}
              <button className="analyze-button" type="submit" disabled={loading || apiStatus === 'offline'}>{loading ? <><LoaderCircle className="spin" size={17} /> Analyzing profile…</> : <>Generate risk analysis <ArrowRight size={16} /></>}</button>
              <p className="form-footnote"><LockKeyhole size={12} /> Educational model only. Do not enter real applicant data.</p>
            </form>

            <aside className="results-column" id="results">
              <div className="result-card primary-result">
                <div className="result-card-head"><div><span className="result-kicker">MODEL ESTIMATE</span><h3>Default risk</h3></div><span className={`result-icon ${riskTone}`}><Activity size={18} /></span></div>
                <div className="risk-display"><div className={`risk-ring ${riskTone}`} style={{ '--risk': `${riskPercent ?? 0}%` }}><div><strong>{riskPercent == null ? '—' : `${riskPercent}%`}</strong><span>estimated</span></div></div><div className="risk-copy"><span className={`risk-badge ${riskTone}`}>{riskPercent == null ? 'Awaiting analysis' : `${riskTone} relative range`}</span><p>{prediction ? 'Probability estimate for the dataset’s historical default label.' : 'Submit a profile to generate a model estimate.'}</p></div></div>
                <div className="result-divider" />
                <div className="rate-estimate"><span className="rate-icon"><TrendingUp size={17} /></span><div><span className="result-kicker">HISTORICAL RATE ESTIMATE</span><strong>{prediction?.estimated_interest_rate_pct == null ? (prediction ? 'Withheld' : '—') : `${prediction.estimated_interest_rate_pct.toFixed(2)}%`}</strong></div><span className={`rate-status ${prediction?.interest_rate_model_status || ''}`}>{prediction ? (prediction.interest_rate_model_status === 'beats_baseline' ? 'Beats baseline' : 'Below baseline') : 'Awaiting input'}</span></div>
                {prediction?.estimated_interest_rate_pct == null && prediction && <p className="rate-note">This model did not outperform the training-mean baseline, so no rate estimate is shown.</p>}
                {prediction && <p className="disclaimer">{prediction.disclaimer}</p>}
              </div>

              <div className="result-card drivers-card">
                <div className="drivers-head"><div><span className="result-kicker">LOCAL EXPLANATION</span><h3>What moved the estimate?</h3></div><span className="shap-tag">SHAP</span></div>
                {!prediction && <div className="empty-drivers"><span><BarChart3 size={19} /></span><p>Feature contributions will appear here after you run an analysis.</p></div>}
                {prediction && !explanation && !notice && <div className="empty-drivers"><LoaderCircle className="spin" size={19} /><p>Preparing the local explanation…</p></div>}
                {contributions.length > 0 && <div className="contribution-list">{contributions.map((item) => {
                  const positive = item.contribution >= 0;
                  return <div className="contribution" key={item.feature}><div className="contribution-top"><span>{item.feature.replaceAll('_', ' ')}</span><strong className={positive ? 'contribution-up' : 'contribution-down'}>{positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(item.contribution).toFixed(3)}</strong></div><div className="contribution-track"><i className={positive ? 'positive' : 'negative'} style={{ width: `${Math.max(5, Math.abs(item.contribution) / largestContribution * 100)}%` }} /></div></div>;
                })}</div>}
                {prediction && explanation && contributions.length === 0 && <div className="empty-drivers"><p>No local feature contributions were returned.</p></div>}
                {explanation && <p className="explanation-note">Contribution direction is relative to the model’s default-risk output; it is not a causal explanation.</p>}
              </div>
            </aside>
          </div>
        </section>

        <section className="method-section" id="method"><div className="section-wrap method-wrap"><div className="method-intro"><span className="section-eyebrow">BUILT FOR TRANSPARENCY</span><h2>From profile to explainable signal.</h2><p>Explore the model’s estimates as research outputs, with baseline comparisons and local explanations alongside the prediction.</p><a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer" className="docs-link">Explore API documentation <ExternalLink size={14} /></a></div><div className="method-steps"><div className="method-step"><span>01</span><div><strong>Profile inputs</strong><p>Structured financial and demographic fields are validated against the API schema.</p></div><Landmark size={17} /></div><div className="method-step"><span>02</span><div><strong>Two model outputs</strong><p>A default-risk classifier and historical rate regressor are evaluated independently.</p></div><BarChart3 size={17} /></div><div className="method-step"><span>03</span><div><strong>Baseline and SHAP</strong><p>Rate estimates are shown only when the model beats its baseline; feature contributions add context.</p></div><FileSearch size={17} /></div></div></div></section>
      </main>

      <footer className="footer section-wrap"><a className="wordmark" href="#home"><span className="logo-mark"><Sparkles size={16} /></span><span>Nexora<span className="wordmark-dot">.</span></span></a><span>Model exploration workspace <i /> Local educational demo</span><span className="footer-note"><ShieldCheck size={13} /> No approval or lending decision is made.</span></footer>
    </div>
  );
}
