import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck,
  BarChart3, BriefcaseBusiness, Building2, Car, Check, ChevronDown, CircleCheck,
  CircleHelp, ClipboardCheck, FileCheck2, FileSearch, Gauge, GraduationCap,
  Home, Landmark, LoaderCircle, LockKeyhole, Menu, PenLine, Percent,
  ShieldCheck, SlidersHorizontal, Sparkles, TrendingUp, User, Users, Wallet, X,
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
        <section className="hero section-wrap" id="platform">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span className="kicker-line" />
              <span>AI-POWERED RISK INTELLIGENCE</span>
            </div>
            <h1>Predictive loan risk, <em>simplified.</em></h1>
            <p className="hero-description">
              Evaluate applicant default probabilities with audited machine learning, explore transparent SHAP factor attributions, and simulate customizable repayment scenarios.
            </p>
            <div className="hero-actions">
              <button className="button-primary" onClick={() => goTo(1)}>
                Start assessment <ArrowRight size={17} />
              </button>
              <a className="button-quiet" href="#features">
                Explore workflow <ArrowDownRight size={16} />
              </a>
            </div>
            <div className="hero-trust">
              <span><ShieldCheck size={16} /> Human-in-the-loop oversight</span>
              <span><LockKeyhole size={15} /> Stateless local simulation</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="Visual loan risk assessment preview">
            <div className="visual-orbit orbit-a" />
            <div className="visual-orbit orbit-b" />

            {/* High-Fidelity App Showcase Mockup */}
            <div className="showcase-card glass-card">
              <div className="showcase-header">
                <div>
                  <span className="showcase-badge">LIVE MODEL PREVIEW</span>
                  <h3>Risk Assessment Preview</h3>
                </div>
                <span className="live-pulse"><i /> Active Engine</span>
              </div>

              <div className="showcase-hero-gauge">
                <div className="dial-wrap">
                  <svg viewBox="0 0 160 92" className="gauge-svg">
                    <path d="M 20 80 A 60 60 0 0 1 140 80" fill="none" stroke="#EDE9DF" strokeWidth="12" strokeLinecap="round" />
                    <path d="M 20 80 A 60 60 0 0 1 106 32" fill="none" stroke="url(#goldGrad)" strokeWidth="12" strokeLinecap="round" />
                    <defs>
                      <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#A8882E" />
                        <stop offset="100%" stopColor="#C9A84C" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="dial-center">
                    <strong>28.4%</strong>
                    <span>Default Risk</span>
                  </div>
                </div>

                <div className="dial-meta">
                  <div className="meta-row">
                    <span>Risk Category</span>
                    <strong className="badge-low">Low-to-Medium</strong>
                  </div>
                  <div className="meta-row">
                    <span>Benchmark Score</span>
                    <strong>720 FICO</strong>
                  </div>
                  <div className="meta-row">
                    <span>Rate Status</span>
                    <strong>{modelInfo?.interest_rate_model_status === 'beats_baseline' ? 'Dynamic ML' : 'Historical Median'}</strong>
                  </div>
                </div>
              </div>

              {/* Visual SHAP Driver Snippet */}
              <div className="showcase-drivers">
                <div className="drivers-title">
                  <span>Top Driving Factors</span>
                  <small>SHAP contribution</small>
                </div>
                <div className="driver-mini-bar">
                  <span>Annual Income ($95,000)</span>
                  <div className="mini-track"><div className="mini-fill pos" style={{ width: '75%' }} /></div>
                </div>
                <div className="driver-mini-bar">
                  <span>DTI Ratio (0.28)</span>
                  <div className="mini-track"><div className="mini-fill pos" style={{ width: '60%' }} /></div>
                </div>
                <div className="driver-mini-bar">
                  <span>Requested Loan ($30,000)</span>
                  <div className="mini-track"><div className="mini-fill neg" style={{ width: '38%' }} /></div>
                </div>
              </div>
            </div>

            {/* Floating Highlights */}
            <div className="glass-float float-top-right">
              <span className="float-icon"><Activity size={18} /></span>
              <div>
                <small>MODEL RELIABILITY</small>
                <strong>ROC-AUC {classifierMetrics ? `${(classifierMetrics.roc_auc * 100).toFixed(1)}%` : '89.4%'}</strong>
              </div>
            </div>

            <div className="glass-float float-bottom-left">
              <span className="float-icon float-gold"><BadgeCheck size={18} /></span>
              <div>
                <small>TRANSPARENCY</small>
                <strong>Zero Black-Box Logic</strong>
              </div>
            </div>
          </div>
        </section>

        {/* 3 High-Impact Pillars (Organized & decluttered) */}
        <section className="pillars-section section-wrap" id="features">
          <div className="pillars-header">
            <span className="section-eyebrow">DESIGNED FOR CLARITY</span>
            <h2>Three stages of transparent intelligence</h2>
            <p>Every step provides interpretable signals without presenting estimates as binding lending decisions.</p>
          </div>

          <div className="pillars-grid">
            <div className="pillar-card" onClick={() => goTo(1)}>
              <div className="pillar-num">01</div>
              <div className="pillar-icon"><BriefcaseBusiness size={24} /></div>
              <h3>Intake & Validation</h3>
              <p>Structure financial profiles including income, obligations, and employment tenure with instant client-side validation.</p>
              <div className="pillar-action"><span>Configure profile</span> <ArrowRight size={15} /></div>
            </div>

            <div className="pillar-card highlight" onClick={() => goTo(2)}>
              <div className="pillar-num">02</div>
              <div className="pillar-icon"><BarChart3 size={24} /></div>
              <h3>SHAP Risk Attribution</h3>
              <p>Break down individual positive and negative feature contributions driving the default probability log-odds.</p>
              <div className="pillar-action"><span>Explore model signals</span> <ArrowRight size={15} /></div>
            </div>

            <div className="pillar-card" onClick={() => goTo(4)}>
              <div className="pillar-num">03</div>
              <div className="pillar-icon"><Wallet size={24} /></div>
              <h3>Repayment Modeling</h3>
              <p>Stress-test scenario monthly obligations across flexible terms and assess personal liquid reserve buffers.</p>
              <div className="pillar-action"><span>Simulate scenarios</span> <ArrowRight size={15} /></div>
            </div>
          </div>
        </section>

        {/* Single, Unified Method Section */}
        <section className="method-section" id="method">
          <div className="section-wrap method-wrap">
            <div className="method-intro">
              <span className="section-eyebrow">RESPONSIBLE AI</span>
              <h2>Risk estimates are not approvals.</h2>
              <p>
                This educational application predicts historical default probability based on public benchmark data. It is non-binding, stateless, and designed to help explore credit sensitivity.
              </p>
              <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer" className="docs-link">
                View API Documentation <ArrowUpRight size={14} />
              </a>
            </div>
            <div className="method-steps">
              <div className="method-step">
                <span>01</span>
                <div>
                  <strong>Statistical Classification</strong>
                  <p>Ensemble gradient boosting evaluates non-linear correlations across credit, income, and debt ratios.</p>
                </div>
                <BarChart3 size={18} />
              </div>
              <div className="method-step">
                <span>02</span>
                <div>
                  <strong>SHAP Interpretability</strong>
                  <p>Game-theoretic Shapley values decompose log-odds into transparent positive and negative feature contributions.</p>
                </div>
                <ShieldCheck size={18} />
              </div>
              <div className="method-step">
                <span>03</span>
                <div>
                  <strong>Scenario Mathematics</strong>
                  <p>Flexible loan calculators model debt-to-income stress testing under customizable interest rates.</p>
                </div>
                <ClipboardCheck size={18} />
              </div>
            </div>
          </div>
        </section>
      </>}

      {page > 0 && <section className="workspace section-wrap multi-page-workspace" id="workflow"><div className="section-heading"><div><span className="section-eyebrow">GUIDED APPLICATION WORKFLOW</span><h2>{page === 1 ? 'Application intake' : page === 2 ? 'Model risk signal' : page === 3 ? 'Additional context' : page === 4 ? 'Repayment plans' : 'Workflow summary'}</h2><p>{page === 1 ? 'Use representative, non-personal values for this educational demo.' : page === 2 ? 'Review the historical default estimate and the model’s strongest signals.' : page === 3 ? 'Follow the risk-trigger branch and add optional financial context.' : page === 4 ? 'Compare monthly repayment and one-time scenarios with your own assumptions.' : 'Review the outcome of this simulated, non-binding workflow.'}</p></div><div className="workspace-meta"><span><LockKeyhole size={14} /> Applicant inputs are not stored</span><span className="meta-separator" />{workflow && <button type="button" onClick={restart}>Start over</button>}</div></div>
        <StageRail current={page} onSelect={goTo} />

        {page === 1 && (() => {
          const ltiRatio = (form.loan_amount / Math.max(1, form.income)) * 100;
          const dtiPct = form.dti_ratio * 100;
          const approxMonthly = Math.round((form.loan_amount * (1 + 0.085 * (form.loan_term / 12))) / form.loan_term);
          const creditTier = form.credit_score >= 750 ? { label: 'Exceptional', color: '#27AE60', bg: '#EAF5EE' }
            : form.credit_score >= 700 ? { label: 'Good', color: '#C9A84C', bg: '#FDF8EA' }
            : form.credit_score >= 640 ? { label: 'Fair', color: '#B87A1A', bg: '#FEF6E4' }
            : { label: 'Subprime', color: '#C0392B', bg: '#FDE9E7' };

          const purposeOptions = [
            { id: 'Auto', label: 'Auto', icon: Car },
            { id: 'Home', label: 'Home', icon: Home },
            { id: 'Business', label: 'Business', icon: Building2 },
            { id: 'Education', label: 'Education', icon: GraduationCap },
            { id: 'Other', label: 'Other', icon: BriefcaseBusiness },
          ];

          return (
            <div className="intake-workspace page-enter">
              {/* Left Column: Interactive Form Controls */}
              <form className="form-card intake-main-form" onSubmit={runAnalysis}>
                <div className="form-head">
                  <span className="form-icon"><SlidersHorizontal size={20} /></span>
                  <div>
                    <h3>Applicant & Loan Parameters</h3>
                    <p>Adjust values interactively to explore historical credit sensitivity.</p>
                  </div>
                  <span className="step-chip">01 <span>/</span> INTAKE</span>
                </div>

                {/* Section 1: Loan Purpose & Requested Capital */}
                <div className="form-section-group">
                  <div className="section-subtitle">
                    <span>1. LOAN CAPITAL & PURPOSE</span>
                  </div>
                  
                  <div className="purpose-chip-grid">
                    {purposeOptions.map(({ id, label, icon: Icon }) => (
                      <button
                        type="button"
                        key={id}
                        className={`purpose-chip ${form.loan_purpose === id ? 'selected' : ''}`}
                        onClick={() => setForm(f => ({ ...f, loan_purpose: id }))}
                      >
                        <Icon size={18} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="form-grid" style={{ marginTop: '16px' }}>
                    <NumberField
                      label="Requested Loan Amount"
                      value={form.loan_amount}
                      min={1000}
                      max={1000000}
                      step={500}
                      prefix="$"
                      onChange={changeField('loan_amount')}
                    />
                    <SelectField
                      label="Loan Term (Months)"
                      value={form.loan_term}
                      onChange={changeField('loan_term')}
                      options={[12, 24, 36, 48, 60, 72, 84]}
                    />
                  </div>
                </div>

                {/* Section 2: Financial Capacity & Interactive Sliders */}
                <div className="form-section-group">
                  <div className="section-subtitle">
                    <span>2. FINANCIAL CAPACITY & CREDIT HEALTH</span>
                  </div>

                  <div className="form-grid">
                    <NumberField
                      label="Annual Gross Salary / Income"
                      value={form.income}
                      min={1000}
                      max={10000000}
                      step={1000}
                      prefix="$"
                      onChange={changeField('income')}
                    />
                    <Field label="Applicant Reference (Demo)">
                      <span className="input-wrap">
                        <input
                          type="text"
                          value={form.applicant_name}
                          onChange={(e) => setForm({ ...form, applicant_name: e.target.value })}
                        />
                      </span>
                    </Field>
                  </div>

                  {/* Interactive Credit Score Slider */}
                  <div className="interactive-slider-box">
                    <div className="slider-header-row">
                      <div className="slider-title">
                        <span>FICO Credit Score</span>
                        <small>Range: 300 to 850</small>
                      </div>
                      <div className="slider-val-badge" style={{ color: creditTier.color, background: creditTier.bg }}>
                        <strong>{form.credit_score}</strong>
                        <span>{creditTier.label}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      className="slider-range-bar"
                      min={300}
                      max={850}
                      value={form.credit_score}
                      onChange={changeField('credit_score')}
                    />
                    <div className="slider-track-labels">
                      <span>300 (Poor)</span>
                      <span>580 (Fair)</span>
                      <span>670 (Good)</span>
                      <span>850 (Exceptional)</span>
                    </div>
                  </div>

                  {/* Interactive DTI Ratio Slider */}
                  <div className="interactive-slider-box" style={{ marginTop: '14px' }}>
                    <div className="slider-header-row">
                      <div className="slider-title">
                        <span>Debt-To-Income (DTI) Ratio</span>
                        <small>Total debt payments / Gross income</small>
                      </div>
                      <div className="slider-val-badge" style={{ color: dtiPct > 45 ? '#C0392B' : '#2D7D5F', background: dtiPct > 45 ? '#FDE9E7' : '#EAF5EE' }}>
                        <strong>{dtiPct.toFixed(0)}%</strong>
                        <span>{dtiPct < 36 ? 'Conservative' : dtiPct <= 49 ? 'Manageable' : 'High Burden'}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      className="slider-range-bar dti-range"
                      min={0.05}
                      max={1.0}
                      step={0.01}
                      value={form.dti_ratio}
                      onChange={changeField('dti_ratio')}
                    />
                    <div className="slider-track-labels">
                      <span>5%</span>
                      <span>36% Target</span>
                      <span>50% Threshold</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Employment & Profile Factors */}
                <div className="form-section-group">
                  <div className="section-subtitle">
                    <span>3. EMPLOYMENT & BACKGROUND FACTORS</span>
                  </div>

                  <div className="form-grid">
                    <NumberField
                      label="Applicant Age"
                      value={form.age}
                      min={18}
                      max={100}
                      onChange={changeField('age')}
                    />
                    <NumberField
                      label="Employment Tenure (Months)"
                      value={form.months_employed}
                      min={0}
                      max={600}
                      suffix="mo"
                      onChange={changeField('months_employed')}
                    />
                    <SelectField
                      label="Employment Status"
                      value={form.employment_type}
                      onChange={changeField('employment_type')}
                      options={['Full-time', 'Part-time', 'Self-employed', 'Unemployed']}
                    />
                    <SelectField
                      label="Highest Education"
                      value={form.education}
                      onChange={changeField('education')}
                      options={["Bachelor's", 'High School', "Master's", 'PhD']}
                    />
                    <NumberField
                      label="Open Credit Accounts"
                      value={form.num_credit_lines}
                      min={0}
                      max={50}
                      onChange={changeField('num_credit_lines')}
                    />
                    <SelectField
                      label="Marital Status"
                      value={form.marital_status}
                      onChange={changeField('marital_status')}
                      options={['Single', 'Married', 'Divorced']}
                    />
                  </div>

                  {/* Visual Segmented Yes/No Toggles */}
                  <div className="toggle-chip-grid">
                    <div className="toggle-item">
                      <span className="toggle-label">Has Active Mortgage?</span>
                      <div className="toggle-segmented">
                        <button
                          type="button"
                          className={form.has_mortgage === 'No' ? 'active' : ''}
                          onClick={() => setForm(f => ({ ...f, has_mortgage: 'No' }))}
                        >
                          No
                        </button>
                        <button
                          type="button"
                          className={form.has_mortgage === 'Yes' ? 'active' : ''}
                          onClick={() => setForm(f => ({ ...f, has_mortgage: 'Yes' }))}
                        >
                          Yes
                        </button>
                      </div>
                    </div>

                    <div className="toggle-item">
                      <span className="toggle-label">Has Dependents?</span>
                      <div className="toggle-segmented">
                        <button
                          type="button"
                          className={form.has_dependents === 'No' ? 'active' : ''}
                          onClick={() => setForm(f => ({ ...f, has_dependents: 'No' }))}
                        >
                          No
                        </button>
                        <button
                          type="button"
                          className={form.has_dependents === 'Yes' ? 'active' : ''}
                          onClick={() => setForm(f => ({ ...f, has_dependents: 'Yes' }))}
                        >
                          Yes
                        </button>
                      </div>
                    </div>

                    <div className="toggle-item">
                      <span className="toggle-label">Has Co-Signer?</span>
                      <div className="toggle-segmented">
                        <button
                          type="button"
                          className={form.has_co_signer === 'No' ? 'active' : ''}
                          onClick={() => setForm(f => ({ ...f, has_co_signer: 'No' }))}
                        >
                          No
                        </button>
                        <button
                          type="button"
                          className={form.has_co_signer === 'Yes' ? 'active' : ''}
                          onClick={() => setForm(f => ({ ...f, has_co_signer: 'Yes' }))}
                        >
                          Yes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="privacy-callout">
                  <ShieldCheck size={16} />
                  <span><strong>Simulated Sandbox:</strong> All data is evaluated client-to-API in memory. Never enter government-issued IDs, SSNs, or sensitive confidential records.</span>
                </div>

                {apiStatus === 'offline' && (
                  <div className="error-box" role="alert">
                    <span><X size={15} /></span>
                    <div>
                      <strong>Model API is offline</strong>
                      <small>Ensure the Python backend is active at <code>http://127.0.0.1:8000</code>.</small>
                    </div>
                  </div>
                )}
                {error && (
                  <div className="error-box" role="alert">
                    <span><X size={15} /></span>
                    <div>
                      <strong>Analysis could not be completed</strong>
                      <small>{error}</small>
                    </div>
                  </div>
                )}

                <div className="form-submit-row">
                  <p className="form-footnote">
                    <LockKeyhole size={13} /> Evaluated with calibrated gradient boosting & SHAP vectors.
                  </p>
                  <button className="analyze-button" type="submit" disabled={loading || apiStatus !== 'online'}>
                    {loading ? (
                      <><LoaderCircle className="spin" size={17} /> Computing risk factors…</>
                    ) : (
                      <>Run Risk Analysis Engine <ArrowRight size={16} /></>
                    )}
                  </button>
                </div>
              </form>

              {/* Right Column: Live Financial Profile Radar (Interactive Sidebar) */}
              <aside className="intake-sidebar">
                <div className="radar-card glass-card">
                  <div className="radar-head">
                    <span className="radar-tag">LIVE FINANCIAL RADAR</span>
                    <h4>Profile Snapshot</h4>
                  </div>

                  {/* Live Credit Health Gauge */}
                  <div className="radar-metric-block">
                    <div className="radar-metric-header">
                      <span>Credit Health Band</span>
                      <strong style={{ color: creditTier.color }}>{creditTier.label} ({form.credit_score})</strong>
                    </div>
                    <div className="credit-meter-bar">
                      <div
                        className="credit-needle"
                        style={{ left: `${Math.min(100, Math.max(0, ((form.credit_score - 300) / 550) * 100))}%` }}
                      />
                    </div>
                    <div className="credit-meter-bounds">
                      <small>300</small>
                      <small>850</small>
                    </div>
                  </div>

                  {/* Live Loan vs Income Ratio */}
                  <div className="radar-metric-block">
                    <div className="radar-metric-header">
                      <span>Loan-to-Income Exposure</span>
                      <strong>{ltiRatio.toFixed(1)}% of salary</strong>
                    </div>
                    <div className="lti-track">
                      <div
                        className="lti-fill"
                        style={{
                          width: `${Math.min(100, ltiRatio)}%`,
                          background: ltiRatio > 50 ? '#C0392B' : ltiRatio > 35 ? '#C9A84C' : '#2D7D5F'
                        }}
                      />
                    </div>
                  </div>

                  {/* Live Indicative Footprint */}
                  <div className="radar-repayment-preview">
                    <div className="preview-label">
                      <Sparkles size={14} />
                      <span>Estimated Indicative Payment</span>
                    </div>
                    <div className="preview-amount">
                      <strong>{currency(approxMonthly)}</strong>
                      <small>/ month</small>
                    </div>
                    <p className="preview-note">
                      Based on {form.loan_term}mo term for {currency(form.loan_amount)} requested. Actual rates calculated via ML model.
                    </p>
                  </div>

                  {/* Summary Profile Checklist */}
                  <div className="radar-summary-list">
                    <div className="radar-summary-item">
                      <span>Purpose:</span>
                      <strong>{form.loan_purpose}</strong>
                    </div>
                    <div className="radar-summary-item">
                      <span>Annual Income:</span>
                      <strong>{currency(form.income)}</strong>
                    </div>
                    <div className="radar-summary-item">
                      <span>Debt Burden (DTI):</span>
                      <strong>{dtiPct.toFixed(0)}%</strong>
                    </div>
                    <div className="radar-summary-item">
                      <span>Employment:</span>
                      <strong>{form.employment_type} ({form.months_employed}mo)</strong>
                    </div>
                  </div>

                  <div className="radar-cta-box">
                    <button
                      type="button"
                      className="radar-quick-cta"
                      disabled={loading || apiStatus !== 'online'}
                      onClick={runAnalysis}
                    >
                      {loading ? 'Evaluating...' : 'Analyze This Profile →'}
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          );
        })()}

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
    </main>
    <footer className="footer section-wrap"><button className="wordmark wordmark-button" onClick={() => goTo(0)}><span className="logo-mark"><BrandMark size={26} /></span><span className="brand-name"><strong>Apsara</strong><small>Finance</small></span></button><span>Local educational demo <i /> multi-step workflow</span><span className="footer-note"><ShieldCheck size={13} /> No credit decision, signature, or transfer is made.</span></footer>
  </div>;
}
