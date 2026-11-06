import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck,
  BarChart3, BriefcaseBusiness, Check, ChevronDown, CircleCheck, CircleHelp,
  ClipboardCheck, FileCheck2, FileSearch, Gauge, Landmark, LoaderCircle,
  LockKeyhole, Menu, PenLine, ShieldCheck, TrendingUp, Wallet, X,
} from 'lucide-react';

const initialForm = {
  applicant_name: 'Demo Applicant', vehicle_type: 'Passenger vehicle',
  age: 35, income: 75000, loan_amount: 25000, credit_score: 680,
  months_employed: 36, num_credit_lines: 3, loan_term: 36, dti_ratio: 0.35,
  education: "Bachelor's", employment_type: 'Full-time', marital_status: 'Single',
  has_mortgage: 'No', has_dependents: 'No', loan_purpose: 'Auto', has_co_signer: 'No',
};

const apiFields = [
  'age', 'income', 'loan_amount', 'credit_score', 'months_employed',
  'num_credit_lines', 'loan_term', 'dti_ratio', 'education', 'employment_type',
  'marital_status', 'has_mortgage', 'has_dependents', 'loan_purpose', 'has_co_signer',
];

const stages = [
  { id: 'application', label: 'Application intake', short: 'Profile', icon: FileCheck2 },
  { id: 'analysis', label: 'Model risk signal', short: 'Analysis', icon: BarChart3 },
  { id: 'context', label: 'Additional context', short: 'Review', icon: ShieldCheck },
  { id: 'plans', label: 'Repayment plans', short: 'Options', icon: Wallet },
  { id: 'completion', label: 'Workflow summary', short: 'Finish', icon: CircleCheck },
];

const routePaths = ['/', '/application', '/risk-review', '/additional-context', '/repayment-plans', '/complete'];
const routeIndex = (path) => Math.max(0, routePaths.indexOf(path));
const currency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);

async function apiRequest(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try { const body = await response.json(); detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail ?? body); } catch { /* keep HTTP status */ }
    throw new Error(detail);
  }
  return response.json();
}

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

function BrandMark({ size = 28 }) {
  return <svg className="brand-emblem" width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path d="M27 25C20 18 13 15 5 16c4 3 7 6 10 10-5-1-9 0-13 3 7 1 13 3 19 7M37 25c7-7 14-10 22-9-4 3-7 6-10 10 5-1 9 0 13 3-7 1-13 3-19 7" stroke="url(#wing)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="m24 28-13-7m12 12L8 30m18 4-13 2m27-8 13-7m-12 10 15-3m-18 6 13 2" stroke="#D7C08C" strokeOpacity=".88" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="32" cy="32" r="13" fill="url(#coin)" stroke="#E5C989" strokeWidth="1.7"/>
    <path d="M37 26c-1.3-2-8-2.5-9.4 1.2-2.1 5.5 10.9 3.8 9.3 9.6-1.2 4.3-8.3 4.5-11.1 1.1M32.4 20v24" stroke="#F5EBD3" strokeWidth="2.2" strokeLinecap="round"/>
    <defs><linearGradient id="wing" x1="5" y1="17" x2="60" y2="39" gradientUnits="userSpaceOnUse"><stop stopColor="#8FE1CB"/><stop offset=".5" stopColor="#E7CB8C"/><stop offset="1" stopColor="#8FE1CB"/></linearGradient><linearGradient id="coin" x1="20" y1="17" x2="46" y2="48" gradientUnits="userSpaceOnUse"><stop stopColor="#35536A"/><stop offset="1" stopColor="#172640"/></linearGradient></defs>
  </svg>;
}

function StageRail({ current, onSelect }) {
  return <div className="stage-rail" aria-label="Application workflow">{stages.map(({ id, label, short, icon: Icon }, index) => {
    const step = index + 1; const done = current > step; const active = current === step;
    return <div className="stage-wrap" key={id}><button className={`stage-node ${active ? 'active' : ''} ${done ? 'done' : ''}`} type="button" onClick={() => done && onSelect(step)} disabled={!done && !active} aria-current={active ? 'step' : undefined}><span className="stage-number">{done ? <Check size={13} /> : <Icon size={14} />}</span><span className="stage-label"><strong>{label}</strong><small>0{step} · {short}</small></span></button>{index < stages.length - 1 && <span className={`stage-line ${done ? 'filled' : ''}`} />}</div>;
  })}</div>;
}

function ContributionList({ explanation }) {
  const drivers = [...(explanation?.default_log_odds_contributions || [])].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 6);
  const largest = Math.max(0.01, ...drivers.map((item) => Math.abs(item.contribution)));
  return <div className="contribution-list">{drivers.map((item) => {
    const positive = item.contribution >= 0;
    return <div className="contribution" key={item.feature}><div className="contribution-top"><span>{item.feature.replaceAll('_', ' ')}</span><strong className={positive ? 'contribution-up' : 'contribution-down'}>{positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(item.contribution).toFixed(3)}</strong></div><div className="contribution-track"><i className={positive ? 'positive' : 'negative'} style={{ width: `${Math.max(5, Math.abs(item.contribution) / largest * 100)}%` }} /></div></div>;
  })}</div>;
}

export default function App() {
  const [page, setPage] = useState(() => routeIndex(window.location.pathname));
  const [form, setForm] = useState(initialForm);
  const [apiStatus, setApiStatus] = useState('checking');
  const [modelInfo, setModelInfo] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [liquidReserve, setLiquidReserve] = useState(0);
  const [reserveType, setReserveType] = useState('Savings balance');
  const [riskTriggerPct, setRiskTriggerPct] = useState(50);
  const [scenarioApr, setScenarioApr] = useState(10);
  const [budgetTargetPct, setBudgetTargetPct] = useState(35);
  const [repaymentOptions, setRepaymentOptions] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const goTo = (destination) => {
    const next = Math.max(0, Math.min(routePaths.length - 1, destination));
    if (window.location.pathname !== routePaths[next]) window.history.pushState({}, '', routePaths[next]);
    setPage(next); setMenuOpen(false); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const checkApi = async () => {
    setApiStatus('checking');
    try { const [, info] = await Promise.all([apiRequest('/health'), apiRequest('/model-info')]); setModelInfo(info); setApiStatus('online'); }
    catch { setApiStatus('offline'); }
  };

  useEffect(() => {
    const onRoute = () => setPage(routeIndex(window.location.pathname));
    window.addEventListener('popstate', onRoute); checkApi();
    return () => window.removeEventListener('popstate', onRoute);
  }, []);

  const changeField = (key) => (event) => {
    const numeric = ['age', 'income', 'loan_amount', 'credit_score', 'months_employed', 'num_credit_lines', 'loan_term', 'dti_ratio'].includes(key);
    setForm((current) => ({ ...current, [key]: numeric ? Number(event.target.value) : event.target.value }));
  };

  const runAnalysis = async (event) => {
    event?.preventDefault(); setLoading(true); setError('');
    try {
      const profile = Object.fromEntries(apiFields.map((key) => [key, form[key]]));
      const result = await apiRequest('/workflow/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) });
      setWorkflow(result); setApiStatus('online'); setConfirmed(false); goTo(2);
    } catch (cause) { setError(cause.message || 'Model analysis failed. Check the API connection.'); setApiStatus('offline'); }
    finally { setLoading(false); }
  };

  const loadRepaymentOptions = async () => {
    setLoading(true); setError('');
    try {
      const result = await apiRequest('/workflow/repayment-options', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loan_amount: form.loan_amount, annual_income: form.income, scenario_apr_pct: scenarioApr, budget_target_pct: budgetTargetPct, term_months: form.loan_term }) });
      setRepaymentOptions(result);
      setSelectedPlanId(`emi-${form.loan_term}`);
      goTo(4);
    } catch (cause) { setError(cause.message || 'Could not calculate repayment scenarios.'); }
    finally { setLoading(false); }
  };

  const restart = () => {
    setForm(initialForm); setWorkflow(null); setRepaymentOptions(null); setLiquidReserve(0); setRiskTriggerPct(50); setScenarioApr(10); setBudgetTargetPct(35); setAcknowledged(false); setConfirmed(false); setError(''); goTo(0);
  };

  const classifierMetrics = modelInfo?.metrics?.default_classifier?.model;
  const riskProbability = workflow?.prediction?.default_probability ?? null;
  const additionalReviewTriggered = riskProbability != null && riskProbability * 100 >= riskTriggerPct;
  const selectedPlan = repaymentOptions?.plans.find((plan) => plan.id === selectedPlanId) ?? null;
  const monthlyPaymentRatio = selectedPlan?.term_months ? selectedPlan.monthly_payment / repaymentOptions.monthly_income : null;
  const withinBudget = monthlyPaymentRatio != null && monthlyPaymentRatio * 100 <= budgetTargetPct;
  const reserveCoverage = selectedPlan?.term_months && selectedPlan.monthly_payment ? liquidReserve / selectedPlan.monthly_payment : null;

  return <div className="site-shell">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <header className="topbar" style={{ width: '100%', margin: 0, padding: 0 }}>
      <div className="topbar-inner">
        <button className="wordmark wordmark-button" onClick={() => goTo(0)} aria-label="Apsara Finance home"><span className="logo-mark"><BrandMark size={33} /></span><span className="brand-name"><strong>Apsara</strong><small>Finance</small></span></button>
        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
        <nav className={`nav-links ${menuOpen ? 'nav-open' : ''}`}><button onClick={() => goTo(0)}>Overview</button><button onClick={() => goTo(1)}>Application</button><button onClick={() => goTo(2)}>Risk analysis</button><button onClick={() => goTo(4)}>Repayment plans</button></nav>
        <div className="top-actions"><button type="button" className={`api-pill ${apiStatus}`} onClick={checkApi} title="Click to refresh model connection"><i />{apiStatus === 'online' ? 'Models online' : apiStatus === 'checking' ? 'Connecting' : 'API offline'}</button><button className="nav-cta" onClick={() => goTo(1)}>{page === 0 ? 'Start application' : 'Application workspace'} <ArrowRight size={14} /></button></div>
      </div>
    </header>

    <main id="home">
      {page === 0 && <>
        <section className="hero section-wrap" id="platform"><div className="hero-copy"><div className="hero-kicker"><span className="kicker-line" /> CREDIT RISK INTELLIGENCE <span className="kicker-line" /></div><h1>A clearer path from<br />profile to <em>possibility.</em></h1><p className="hero-description">A guided lending workflow for exploring applicant inputs, historical risk signals, additional financial context, and transparent repayment scenarios.</p><div className="hero-actions"><button className="button-primary" onClick={() => goTo(1)}>Start an application <ArrowRight size={16} /></button><a className="button-quiet" href="#how-it-works">How it works <ArrowDownRight size={16} /></a></div><div className="hero-trust"><span><ShieldCheck size={15} /> Human review remains essential</span><span><LockKeyhole size={14} /> Stateless local demo</span></div></div>
          <div className="hero-visual" aria-label="Illustrative loan workflow"><div className="visual-orbit orbit-a" /><div className="visual-orbit orbit-b" /><div className="glass-float glass-float-top"><span className="float-icon"><Activity size={16} /></span><span><small>MODEL SIGNAL</small><strong>Historical risk estimate</strong></span><span className="float-check"><Check size={14} /></span></div><div className="preview-card glass-card"><div className="preview-head"><div><span className="preview-eyebrow">APPLICATION JOURNEY</span><h2>One guided experience</h2></div><span className="preview-menu"><span /><span /><span /></span></div><div className="workflow-preview-list">{stages.slice(0, 4).map(({ id, label, icon: Icon }, index) => <div className="workflow-preview-row" key={id}><span className={`workflow-preview-icon preview-step-${index}`}><Icon size={14} /></span><span>{label}</span><span className="preview-step-number">0{index + 1}</span></div>)}</div><div className="preview-foot"><span><span className="legend-dot buffer-dot" /> Model-backed analysis</span><span className="preview-lock"><LockKeyhole size={12} /> simulation</span></div></div><div className="glass-float glass-float-bottom"><span className="float-icon float-icon-green"><BarChart3 size={16} /></span><span><small>TRANSPARENT BY DESIGN</small><strong>Human review stays in the loop</strong></span><BadgeCheck className="float-badge" size={18} /></div></div></section>
        <section className="metrics-strip section-wrap"><Metric label="Default model" value={classifierMetrics ? `${(classifierMetrics.roc_auc * 100).toFixed(1)}%` : '—'} note="ROC-AUC · held-out data" icon={Gauge} /><Metric label="Precision signal" value={classifierMetrics ? `${(classifierMetrics.average_precision * 100).toFixed(1)}%` : '—'} note="Average precision" icon={TrendingUp} /><Metric label="Rate model" value={modelInfo ? (modelInfo.interest_rate_model_status === 'beats_baseline' ? 'Validated' : 'Baseline wins') : '—'} note="Compared with train-mean baseline" icon={Activity} /><Metric label="Explainability" value="SHAP" note="Local feature contributions" icon={FileSearch} /></section>
        <section className="workflow-overview section-wrap" id="how-it-works"><div className="overview-heading"><span className="section-eyebrow">A MORE USEFUL WORKFLOW</span><h2>Every step has a purpose.</h2><p>Move from a representative profile to model context and repayment math without presenting an estimate as a lending decision.</p></div><div className="overview-grid">{stages.map(({ id, label, icon: Icon }, index) => <button className="overview-card" key={id} onClick={() => goTo(index + 1)}><span className="overview-icon"><Icon size={18} /></span><span className="overview-number">0{index + 1}</span><strong>{label}</strong><p>{['Collect model inputs in a clear, validated profile.', 'View the default-risk estimate and its SHAP signals.', 'Follow the model-triggered context path and review checklist.', 'Compare EMI and one-time payment scenarios.', 'See a concise summary of the non-binding workflow.'][index]}</p><ArrowRight className="overview-arrow" size={15} /></button>)}</div></section>
        <section className="method-section" id="method"><div className="section-wrap method-wrap"><div className="method-intro"><span className="section-eyebrow">BUILT FOR TRANSPARENCY</span><h2>Risk estimates are not approvals.</h2><p>This classifier predicts the historical dataset’s Default label. A positive class means default in the source data, not an approval. Additional review is a demo routing step only.</p><a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer" className="docs-link">Explore API documentation <ArrowUpRight size={14} /></a></div><div className="method-steps"><div className="method-step"><span>01</span><div><strong>Historical model analysis</strong><p>Default probability and local feature contributions come from the trained classifiers.</p></div><BarChart3 size={17} /></div><div className="method-step"><span>02</span><div><strong>Additional context</strong><p>Liquid reserve stays in the browser and is used only to illustrate scenario coverage.</p></div><ShieldCheck size={17} /></div><div className="method-step"><span>03</span><div><strong>Repayment comparison</strong><p>API-calculated EMI options use an APR assumption selected by the user.</p></div><ClipboardCheck size={17} /></div></div></div></section>
      </>}

      {page > 0 && <section className="workspace section-wrap multi-page-workspace" id="workflow"><div className="section-heading"><div><span className="section-eyebrow">GUIDED APPLICATION WORKFLOW</span><h2>{page === 1 ? 'Application intake' : page === 2 ? 'Model risk signal' : page === 3 ? 'Additional context' : page === 4 ? 'Repayment plans' : 'Workflow summary'}</h2><p>{page === 1 ? 'Use representative, non-personal values for this educational demo.' : page === 2 ? 'Review the historical default estimate and the model’s strongest signals.' : page === 3 ? 'Follow the risk-trigger branch and add optional financial context.' : page === 4 ? 'Compare monthly repayment and one-time scenarios with your own assumptions.' : 'Review the outcome of this simulated, non-binding workflow.'}</p></div><div className="workspace-meta"><span><LockKeyhole size={14} /> Applicant inputs are not stored</span><span className="meta-separator" />{workflow && <button type="button" onClick={restart}>Start over</button>}</div></div>
        <StageRail current={page} onSelect={goTo} />

        {page === 1 && <form className="form-card workflow-form page-enter" onSubmit={runAnalysis}><div className="form-head"><span className="form-icon"><BriefcaseBusiness size={18} /></span><div><h3>Applicant profile</h3><p>Complete the profile used by the historical model.</p></div><span className="step-chip">01 <span>/</span> INTAKE</span></div>
          <div className="form-section-title"><span>Applicant and loan details</span><i /></div>
          <div className="form-grid"><Field label="Applicant name (demo only)"><span className="input-wrap"><input type="text" value={form.applicant_name} onChange={(e) => setForm({ ...form, applicant_name: e.target.value })} /></span></Field><SelectField label="Vehicle / asset type" value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })} options={['Passenger vehicle', 'Motorcycle', 'Commercial vehicle', 'Other asset']} /><NumberField label="Age" value={form.age} min={18} max={100} onChange={(e) => setForm({ ...form, age: Number(e.target.value) })} /><NumberField label="Annual salary / income" value={form.income} min={1} max={100000000} prefix="$" onChange={(e) => setForm({ ...form, income: Number(e.target.value) })} /><SelectField label="Loan purpose" value={form.loan_purpose} onChange={(e) => setForm({ ...form, loan_purpose: e.target.value })} options={['Auto', 'Business', 'Education', 'Home', 'Other']} /><NumberField label="Requested amount" value={form.loan_amount} min={1} max={100000000} prefix="$" onChange={(e) => setForm({ ...form, loan_amount: Number(e.target.value) })} /><NumberField label="Credit score" value={form.credit_score} min={300} max={850} onChange={(e) => setForm({ ...form, credit_score: Number(e.target.value) })} hint="Accepted range: 300 to 850." /><NumberField label="Debt-to-income ratio" value={form.dti_ratio} min={0} max={5} step={0.01} suffix="×" onChange={(e) => setForm({ ...form, dti_ratio: Number(e.target.value) })} hint="Enter as a ratio. 0.35 means 35%." /><NumberField label="Loan term" value={form.loan_term} min={1} max={120} suffix="months" onChange={(e) => setForm({ ...form, loan_term: Number(e.target.value) })} /><NumberField label="Open credit lines" value={form.num_credit_lines} min={0} max={100} onChange={(e) => setForm({ ...form, num_credit_lines: Number(e.target.value) })} /><NumberField label="Employment tenure" value={form.months_employed} min={0} max={720} suffix="months" onChange={(e) => setForm({ ...form, months_employed: Number(e.target.value) })} /><SelectField label="Education" value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} options={["Bachelor's", 'High School', "Master's", 'PhD']} /><SelectField label="Employment type" value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })} options={['Full-time', 'Part-time', 'Self-employed', 'Unemployed']} /><SelectField label="Marital status" value={form.marital_status} onChange={(e) => setForm({ ...form, marital_status: e.target.value })} options={['Single', 'Married', 'Divorced']} /><SelectField label="Mortgage" value={form.has_mortgage} onChange={(e) => setForm({ ...form, has_mortgage: e.target.value })} options={['No', 'Yes']} /><SelectField label="Dependents" value={form.has_dependents} onChange={(e) => setForm({ ...form, has_dependents: e.target.value })} options={['No', 'Yes']} /><SelectField label="Co-signer" value={form.has_co_signer} onChange={(e) => setForm({ ...form, has_co_signer: e.target.value })} options={['No', 'Yes']} /></div>
          <div className="privacy-callout"><ShieldCheck size={16} /><span><strong>No PAN/KYC in this demo.</strong> Identity verification is not connected. Do not enter real applicant or government-ID data.</span></div>
          {apiStatus === 'offline' && <div className="error-box" role="alert"><span><X size={15} /></span><div><strong>Model API is offline</strong><small>Start the API with <code>python -m uvicorn api.main:app --reload</code>, then click the connection indicator to retry.</small></div></div>}
          {error && <div className="error-box" role="alert"><span><X size={15} /></span><div><strong>Analysis could not be completed</strong><small>{error}</small></div></div>}
          <div className="form-submit-row"><p className="form-footnote"><LockKeyhole size={12} /> Name and vehicle type stay in this browser and are not sent to the model.</p><button className="analyze-button" type="submit" disabled={loading || apiStatus !== 'online'}>{loading ? <><LoaderCircle className="spin" size={17} /> Running model…</> : <>Continue to risk analysis <ArrowRight size={16} /></>}</button></div>
        </form>}

        {page === 2 && workflow && <div className="stage-content page-enter"><div className="stage-content-heading"><span className="stage-content-icon"><BarChart3 size={18} /></span><div><h3>Default-risk analysis</h3><p>Application reference {workflow.workflow_id.slice(0, 8)} · profile data was not saved.</p></div><span className="simulation-badge"><CircleCheck size={13} /> Model response</span></div>
          <div className="analysis-result-grid"><article className="result-card primary-result"><div className="result-card-head"><div><span className="result-kicker">CLASSIFIER TARGET: DEFAULT</span><h3>Estimated default probability</h3></div><span className="result-icon"><Activity size={18} /></span></div><div className="risk-display"><div className="risk-ring" style={{ '--risk': `${workflow.prediction.default_probability * 100}%` }}><div><strong>{(workflow.prediction.default_probability * 100).toFixed(1)}%</strong><span>model output</span></div></div><div className="risk-copy"><span className="risk-badge">Historical risk signal</span><p>Class 1 in this dataset means default. It does not mean approved or eligible.</p></div></div><div className="result-divider" /><div className="rate-estimate"><span className="rate-icon"><TrendingUp size={17} /></span><div><span className="result-kicker">HISTORICAL RATE MODEL</span><strong>{workflow.prediction.estimated_interest_rate_pct == null ? 'Withheld' : `${workflow.prediction.estimated_interest_rate_pct.toFixed(2)}%`}</strong></div><span className={`rate-status ${workflow.prediction.interest_rate_model_status}`}>{workflow.prediction.interest_rate_model_status === 'beats_baseline' ? 'Beats baseline' : 'Below baseline'}</span></div>{workflow.prediction.estimated_interest_rate_pct == null && <p className="rate-note">No rate estimate is shown because this model did not beat the training-mean baseline.</p>}<p className="disclaimer">{workflow.prediction.disclaimer}</p></article>
            <article className="result-card drivers-card"><div className="drivers-head"><div><span className="result-kicker">LOCAL EXPLANATION</span><h3>Signals behind the estimate</h3></div><span className="shap-tag">SHAP</span></div><ContributionList explanation={workflow.explanation} /><p className="explanation-note">SHAP shows model contribution direction, not causation.</p></article></div>
          <div className={`risk-branch ${additionalReviewTriggered ? 'branch-triggered' : ''}`}><span className="branch-icon">{additionalReviewTriggered ? <ShieldCheck size={18} /> : <CircleCheck size={18} />}</span><div><strong>{additionalReviewTriggered ? 'Additional-context path triggered' : 'Standard-context path'}</strong><p>The estimate {additionalReviewTriggered ? 'meets' : 'is below'} the illustrative {riskTriggerPct}% review trigger. Both paths still require human review; this is not an approval decision.</p></div><button className="button-outline compact-button" onClick={() => goTo(3)}>Continue <ArrowRight size={14} /></button></div>
        </div>}

        {page === 3 && workflow && <div className="stage-content page-enter"><div className="stage-content-heading"><span className="stage-content-icon review-icon"><ShieldCheck size={18} /></span><div><h3>{additionalReviewTriggered ? 'Additional information path' : 'Additional context review'}</h3><p>{additionalReviewTriggered ? 'The example review trigger was met. Add optional liquidity context for the scenario.' : 'The model is below the example trigger. Human review is still required; context is optional.'}</p></div><span className="review-required"><CircleHelp size={13} /> Not a decision</span></div>
          <div className="context-layout"><article className="context-card"><span className="review-icon-box amber"><Wallet size={19} /></span><span className="result-kicker">OPTIONAL FINANCIAL BUFFER</span><h4>Fixed deposit or bank balance</h4><p>Enter a hypothetical liquid reserve amount for the local payment-coverage illustration.</p><div className="context-fields"><SelectField label="Reserve type" value={reserveType} onChange={(e) => setReserveType(e.target.value)} options={['Savings balance', 'Fixed deposit', 'Other liquid reserve', 'Not provided']} /><NumberField label="Reserve amount" value={liquidReserve} min={0} max={100000000} prefix="$" onChange={(e) => setLiquidReserve(Number(e.target.value))} /></div><div className="privacy-callout"><LockKeyhole size={15} /><span>This value stays in browser memory; it is not sent to either API endpoint or stored.</span></div></article>
            <article className="context-card trigger-card"><span className="review-icon-box blue"><Gauge size={19} /></span><span className="result-kicker">ILLUSTRATIVE ROUTING RULE</span><h4>Review trigger</h4><p>Adjust the example threshold to see how the educational workflow branches. It does not change the model or determine eligibility.</p><div className="scenario-label-row"><label htmlFor="risk-trigger">Additional-review trigger</label><strong>{riskTriggerPct}%</strong></div><input id="risk-trigger" className="scenario-range" type="range" min="10" max="90" step="1" value={riskTriggerPct} onChange={(e) => setRiskTriggerPct(Number(e.target.value))} /><div className="range-ends"><span>10%</span><span>90%</span></div><div className="trigger-result"><span className={`legend-dot ${additionalReviewTriggered ? 'risk-dot' : 'buffer-dot'}`} /><strong>{additionalReviewTriggered ? 'Additional review route' : 'Standard review route'}</strong></div></article></div>
          <div className="review-grid"><article className="review-card"><span className="review-icon-box"><FileCheck2 size={18} /></span><span className="result-kicker">PROFILE CHECK</span><h4>Review the submitted details</h4><p>{form.applicant_name || 'Demo applicant'} · {form.age} years · {currency(form.income)} annual income · {currency(form.loan_amount)} requested</p><div className="review-fact"><Check size={14} /> Representative profile only</div></article><article className="review-card"><span className="review-icon-box amber"><ShieldCheck size={18} /></span><span className="result-kicker">HUMAN SAFEGUARD</span><h4>No automated approval</h4><p>This model predicts a historical default label. It cannot approve, reject, verify identity, or authorize funds.</p><div className="review-fact"><Check size={14} /> Human judgment required</div></article></div>
          <div className="review-disclaimer"><LockKeyhole size={15} /><span>No PAN, KYC, bureau, bank, or asset verification service is connected. Reserve details remain local to this page.</span></div>
          {error && <div className="error-box" role="alert"><span><X size={15} /></span><div><strong>Could not calculate repayment plans</strong><small>{error}</small></div></div>}
          <div className="stage-actions"><button className="button-outline" onClick={() => goTo(2)}><ArrowLeft size={15} /> Back to risk analysis</button><button className="analyze-button action-next" disabled={loading} onClick={loadRepaymentOptions}>{loading ? <><LoaderCircle className="spin" size={16} /> Calculating options…</> : <>Analyze repayment options <ArrowRight size={15} /></>}</button></div>
        </div>}

        {page === 4 && repaymentOptions && <div className="stage-content page-enter"><div className="stage-content-heading"><span className="stage-content-icon offer-icon"><Wallet size={18} /></span><div><h3>Compare repayment plans</h3><p>All amounts are arithmetic scenarios based on the APR assumption you select.</p></div><span className="simulation-badge amber-badge"><Activity size={13} /> Simulation only</span></div>
          <div className="plan-controls"><div className="scenario-control"><div className="scenario-label-row"><label htmlFor="scenario-apr">Illustrative annual APR</label><strong>{Number(scenarioApr).toFixed(2)}%</strong></div><input id="scenario-apr" className="scenario-range" type="range" min="0" max="30" step="0.25" value={scenarioApr} onChange={(e) => setScenarioApr(Number(e.target.value))} /><div className="range-ends"><span>0%</span><span>30%</span></div></div><div className="scenario-control"><div className="scenario-label-row"><label htmlFor="budget-target">Personal payment target</label><strong>{budgetTargetPct}% of monthly income</strong></div><input id="budget-target" className="scenario-range" type="range" min="5" max="80" step="1" value={budgetTargetPct} onChange={(e) => setBudgetTargetPct(Number(e.target.value))} /><div className="range-ends"><span>5%</span><span>80%</span></div></div><button className="button-outline recalc-button" onClick={loadRepaymentOptions} disabled={loading}>{loading ? <LoaderCircle className="spin" size={14} /> : <Activity size={14} />} Update scenarios</button></div>
          {error && <div className="error-box" role="alert"><span><X size={15} /></span><div><strong>Scenario refresh failed</strong><small>{error}</small></div></div>}
          <div className="plan-grid">{repaymentOptions.plans.map((plan) => { const monthlyRatio = plan.term_months ? plan.monthly_payment / repaymentOptions.monthly_income * 100 : null; return <button type="button" className={`plan-card ${selectedPlanId === plan.id ? 'selected' : ''}`} key={plan.id} onClick={() => setSelectedPlanId(plan.id)}><span className="plan-radio">{selectedPlanId === plan.id && <i />}</span><span className="plan-name">{plan.label}</span><strong className="plan-payment">{currency(plan.monthly_payment)}<small>{plan.term_months ? '/ month' : ' one-time'}</small></strong><span className="plan-detail">Total payment <b>{currency(plan.total_payment)}</b></span><span className="plan-detail">Estimated interest <b>{currency(plan.total_interest)}</b></span>{monthlyRatio != null && <span className={`plan-target ${monthlyRatio <= budgetTargetPct ? 'within' : 'over'}`}>{monthlyRatio.toFixed(1)}% of monthly income · {monthlyRatio <= budgetTargetPct ? 'within' : 'above'} your target</span>}</button>; })}</div>
          <div className="plan-disclaimer"><CircleHelp size={15} /><span>Plans are not ranked as suitable or beneficial. Compare the monthly payment, total payment, and your chosen target. APR is a user-selected assumption, not a model recommendation.</span></div>
          <div className="stage-actions"><button className="button-outline" onClick={() => goTo(3)}><ArrowLeft size={15} /> Back to context</button><button className="analyze-button action-next" disabled={!selectedPlan || loading} onClick={() => { setConfirmed(false); goTo(5); }}>Review selected scenario <ArrowRight size={15} /></button></div>
        </div>}

        {page === 5 && selectedPlan && repaymentOptions && <div className="stage-content page-enter"><div className="summary-hero"><span className="completion-check"><Check size={25} /></span><span className="section-eyebrow">SIMULATION SUMMARY</span><h3>{confirmed ? 'Demo workflow complete.' : 'Review the scenario.'}</h3><p>{confirmed ? 'No lending decision was made, no document was signed, and no funds were moved.' : 'This is a non-binding preview. Review the summary before completing the demo flow.'}</p></div>
          <div className="completion-summary"><div><span>Profile reference</span><strong>{workflow?.workflow_id.slice(0, 8) ?? '—'}</strong></div><div><span>Model default estimate</span><strong>{workflow ? `${(workflow.prediction.default_probability * 100).toFixed(1)}%` : '—'}</strong></div><div><span>Selected payment scenario</span><strong>{selectedPlan.label}</strong></div><div><span>Monthly payment</span><strong>{selectedPlan.term_months ? currency(selectedPlan.monthly_payment) : 'One-time'}</strong></div><div><span>Total payment scenario</span><strong>{currency(selectedPlan.total_payment)}</strong></div><div><span>Reserve context</span><strong>{liquidReserve ? `${currency(liquidReserve)} · ${reserveType}` : 'Not provided'}</strong></div></div>
          {reserveCoverage != null && <div className="coverage-note"><Wallet size={16} /><span>Entered reserve represents about <strong>{reserveCoverage.toFixed(1)} monthly payments</strong> in this scenario. This is a simple ratio, not a suitability or approval assessment.</span></div>}
          {!confirmed && <label className="check-row final-ack"><input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} /><span>I understand this is an educational, non-binding workflow simulation.</span></label>}
          <div className="stage-actions"><button className="button-outline" onClick={() => goTo(4)}><ArrowLeft size={15} /> Back to plans</button>{confirmed ? <button className="analyze-button action-next" onClick={restart}>Start another profile <ArrowRight size={15} /></button> : <button className="analyze-button action-next" disabled={!acknowledged} onClick={() => setConfirmed(true)}>Complete demo workflow <Check size={15} /></button>}</div>
        </div>}
      </section>}

      {page === 0 && <section className="method-section" id="method"><div className="section-wrap method-wrap"><div className="method-intro"><span className="section-eyebrow">BUILT FOR TRANSPARENCY</span><h2>Risk estimates are not approvals.</h2><p>This model predicts the historical dataset’s Default label. A positive class means default in the source data, not approval. The review branch and payment plans are educational simulations only.</p><a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer" className="docs-link">Explore API documentation <ArrowUpRight size={14} /></a></div><div className="method-steps"><div className="method-step"><span>01</span><div><strong>Model-backed analysis</strong><p>Default probability and local feature contributions are calculated by the trained models.</p></div><BarChart3 size={17} /></div><div className="method-step"><span>02</span><div><strong>Additional context</strong><p>Liquid reserve remains in the browser and is used only to illustrate payment coverage.</p></div><ShieldCheck size={17} /></div><div className="method-step"><span>03</span><div><strong>Repayment comparisons</strong><p>API-calculated plans use an APR assumption selected by the user.</p></div><ClipboardCheck size={17} /></div></div></div></section>}
    </main>
    <footer className="footer section-wrap"><button className="wordmark wordmark-button" onClick={() => goTo(0)}><span className="logo-mark"><BrandMark size={26} /></span><span className="brand-name"><strong>Apsara</strong><small>Finance</small></span></button><span>Local educational demo <i /> multi-step workflow</span><span className="footer-note"><ShieldCheck size={13} /> No credit decision, signature, or transfer is made.</span></footer>
  </div>;
}
