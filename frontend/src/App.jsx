import { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight,
  BadgeCheck, BarChart3, BriefcaseBusiness, Building2, Car, Check, ChevronDown,
  CircleCheck, CircleHelp, ClipboardCheck, Download, FileCheck2, FileSearch, Gauge,
  GraduationCap, Home, Landmark, LoaderCircle, LockKeyhole, Menu, PenLine,
  Percent, ShieldAlert, ShieldCheck, SlidersHorizontal, Sparkles, TrendingDown,
  TrendingUp, User, Users, Wallet, X,
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
const monthlyInstallment = (principal, annualRatePct, termMonths) => {
  if (!termMonths || termMonths <= 0) return principal;
  const monthlyRate = annualRatePct / 1200;
  if (monthlyRate === 0) return principal / termMonths;
  const growth = (1 + monthlyRate) ** termMonths;
  return principal * monthlyRate * growth / (growth - 1);
};
const routeIndex = (path) => Math.max(0, routePaths.indexOf(path));
const currency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
const HISTORY_KEY = 'apsara-assessment-history';
const readHistory = () => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; } };
function downloadPersonInsight(record) {
  const prediction = record.workflow.prediction;
  const plan = record.repayment_options?.plans?.find((item) => item.id === `emi-${record.profile.loan_term}`);
  const monthlyIncome = record.repayment_options?.monthly_income ?? record.profile.income / 12;
  const ratioPct = plan && monthlyIncome ? (plan.monthly_payment / monthlyIncome) * 100 : null;
  const ratio = ratioPct == null ? 'Unavailable' : `${ratioPct.toFixed(1)}%`;
  const riskPct = prediction.default_probability * 100;
  const comparisonMax = Math.max(record.bank_balance_amount || 0, record.profile.loan_amount || 0, 1);
  const drivers = (record.workflow.explanation?.default_log_odds_contributions || []).slice().sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 5);
  const ascii = (value) => String(value ?? '').normalize('NFKD').replace(/[^\x20-\x7E]/g, '?');
  const escape = (value) => ascii(value).replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
  const lines = [
    { text: 'APSARA FINANCE | INDIVIDUAL MODEL INSIGHT', size: 17, color: '1 1 1', gap: 23, header: true },
    { text: `Applicant: ${record.applicant_name || 'Applicant'}     Reference: ${record.workflow.workflow_id.slice(0, 8)}`, size: 11, color: '1 1 1' },
    { text: `Assessment date: ${new Date(record.created_at).toLocaleString()}`, size: 9, color: '0.82 0.86 0.90' },
    { text: 'RISK AND REPAYMENT SUMMARY', size: 12, color: '0.55 0.42 0.14', gap: 8 },
    { text: `Estimated historical default probability: ${(prediction.default_probability * 100).toFixed(1)}%`, size: 11 },
    { text: `Estimated historical interest rate: ${prediction.estimated_interest_rate_pct != null ? `${prediction.estimated_interest_rate_pct.toFixed(2)}%` : 'Unavailable'}`, size: 11 },
    { text: `Requested loan: ${currency(record.profile.loan_amount)} over ${record.profile.loan_term} months`, size: 11 },
    { text: `Annual gross salary: ${currency(record.profile.income)} | Monthly gross salary: ${currency(monthlyIncome)}`, size: 11 },
    { text: `Indicative monthly payment: ${plan ? currency(plan.monthly_payment) : 'Unavailable'} | Payment-to-salary ratio: ${ratio}`, size: 11 },
    { text: `Bank balance: ${record.bank_balance_type || 'Not provided'} - ${currency(record.bank_balance_amount)}`, size: 11 },
    { text: 'VISUAL COMPARISON', size: 12, color: '0.55 0.42 0.14', gap: 8 },
    { type: 'bar', text: 'Default risk', value: riskPct, max: 100, color: riskPct >= 50 ? '0.78 0.25 0.23' : riskPct >= 25 ? '0.82 0.56 0.16' : '0.13 0.57 0.43', suffix: `${riskPct.toFixed(1)}%`, gap: 28 },
    { type: 'bar', text: 'Payment / salary', value: ratioPct ?? 0, max: 50, color: ratioPct > 35 ? '0.78 0.25 0.23' : '0.13 0.57 0.43', threshold: 35, suffix: ratio, gap: 28 },
    { type: 'bar', text: 'Bank balance', value: record.bank_balance_amount || 0, max: comparisonMax, color: '0.12 0.55 0.69', suffix: currency(record.bank_balance_amount), gap: 28 },
    { type: 'bar', text: 'Requested loan', value: record.profile.loan_amount || 0, max: comparisonMax, color: '0.47 0.38 0.72', suffix: currency(record.profile.loan_amount), gap: 28 },
    { text: 'Risk scale: 0-100%. Payment ratio scale: 0-50%; marker indicates a 35% reference target.', size: 8, color: '0.38 0.42 0.47', gap: 15 },
    { text: 'Bank balance and requested loan use the same dollar scale for direct comparison.', size: 8, color: '0.38 0.42 0.47', gap: 15 },
    { text: 'APPLICANT PROFILE', size: 12, color: '0.55 0.42 0.14', gap: 8 },
    { text: `Age: ${record.profile.age} | Credit score: ${record.profile.credit_score} | DTI: ${(record.profile.dti_ratio * 100).toFixed(0)}%`, size: 10 },
    { text: `Employment: ${record.profile.employment_type} | Purpose: ${record.profile.loan_purpose} | Education: ${record.profile.education}`, size: 10 },
    { text: 'TOP MODEL INSIGHTS', size: 12, color: '0.55 0.42 0.14', gap: 8 },
    ...drivers.map((item, index) => ({ text: `${index + 1}. ${humanizeFeature(item.feature)} - ${item.contribution >= 0 ? '+' : ''}${item.contribution.toFixed(3)} log-odds (${item.contribution >= 0 ? 'increases' : 'reduces'} estimated default risk)`, size: 10 })),
    { text: 'INTERPRETATION', size: 12, color: '0.55 0.42 0.14', gap: 8 },
    { text: `Top listed feature ${drivers[0] ? (drivers[0].contribution >= 0 ? 'increases' : 'reduces') : 'contributes to'} the model estimate for this profile.`, size: 10 },
    { text: 'This educational estimate reflects historical dataset patterns. It is not an approval decision,', size: 9, color: '0.38 0.42 0.47', gap: 8 },
    { text: 'credit decision, financial recommendation, or prediction of an individual outcome.', size: 9, color: '0.38 0.42 0.47' },
    { text: 'Bank balance is shown as cash-buffer context and is not used by the default-risk model.', size: 9, color: '0.38 0.42 0.47' },
  ];
  let y = 773;
  const commands = ['0.97 0.97 0.95 rg 0 0 612 792 re f', '0.08 0.17 0.28 rg 0 712 612 80 re f', '0.82 0.66 0.31 rg 0 707 612 5 re f'];
  for (const line of lines) {
    y -= line.gap ?? (line.type === 'bar' ? 27 : 19);
    if (line.type === 'bar') {
      const x = 198; const width = 260; const height = 9; const barY = y - 3; const fraction = Math.max(0, Math.min(1, line.value / line.max));
      commands.push(`0.18 0.22 0.28 rg BT /F1 9 Tf 52 ${y} Td (${escape(line.text)}) Tj ET`);
      commands.push(`0.88 0.89 0.88 rg ${x} ${barY} ${width} ${height} re f`);
      for (const mark of [0.25, 0.5, 0.75]) commands.push(`0.72 0.74 0.74 RG 0.5 w ${x + width * mark} ${barY - 2} m ${x + width * mark} ${barY + height + 2} l S`);
      commands.push(`${line.color} rg ${x} ${barY} ${Math.max(1, width * fraction)} ${height} re f`);
      if (line.threshold != null) commands.push(`0.12 0.16 0.22 RG 1 w ${x + width * line.threshold / line.max} ${barY - 4} m ${x + width * line.threshold / line.max} ${barY + height + 4} l S`);
      commands.push(`0.16 0.20 0.26 rg BT /F1 9 Tf 470 ${y} Td (${escape(line.suffix)}) Tj ET`);
    } else {
      commands.push(`${line.color || '0.16 0.20 0.26'} rg BT /F1 ${line.size} Tf 52 ${y} Td (${escape(line.text)}) Tj ET`);
    }
  }
  commands.push('0.78 0.80 0.80 RG 0.7 w 48 38 m 564 38 l S', '0.38 0.42 0.47 rg BT /F1 8 Tf 52 24 Td (Educational model output | Historical patterns only - not a credit decision.) Tj ET');
  const stream = commands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(new TextEncoder().encode(pdf).length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  const safeName = ascii(record.applicant_name || 'applicant').trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'applicant';
  link.href = url; link.download = `insights-${safeName}-${record.workflow.workflow_id.slice(0, 8)}.pdf`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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

const humanizeFeature = (name) => {
  const clean = name.replace(/^(numeric|categorical)__/, '');
  const map = {
    loan_to_annual_income: 'Loan-to-Income Exposure',
    loan_to_income: 'Loan-to-Income Exposure',
    monthly_installment_to_income_ratio: 'Monthly Installment / Income',
    age: 'Applicant Age',
    income: 'Annual Gross Income',
    credit_score: 'Credit Score (FICO)',
    dti_ratio: 'Debt-to-Income Ratio',
    loan_amount: 'Requested Loan Amount',
    loan_term: 'Loan Term Duration',
    months_employed: 'Employment Stability',
    num_credit_lines: 'Open Credit Lines',
    'has_co_signer_No': 'Solo Applicant (No Co-signer)',
    'has_co_signer_Yes': 'Joint Applicant (Has Co-signer)',
    'has_mortgage_No': 'No Existing Mortgage',
    'has_mortgage_Yes': 'Carries Active Mortgage',
    'has_dependents_No': 'No Financial Dependents',
    'has_dependents_Yes': 'Has Dependents',
    'employment_type_Full-Time': 'Full-Time Employment',
    'employment_type_Part-Time': 'Part-Time Employment',
    'employment_type_Self-Employed': 'Self-Employed Status',
    'employment_type_Unemployed': 'Unemployed Status',
    'education_PhD': 'Doctoral Degree (PhD)',
    'education_Master\'s': 'Master\'s Degree',
    'education_Bachelor\'s': 'Bachelor\'s Degree',
    'education_High School': 'High School Education',
    'marital_status_Single': 'Single Marital Status',
    'marital_status_Married': 'Married Status',
    'marital_status_Divorced': 'Divorced Status',
  };
  return map[clean] || clean.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

function ShapFactorDeck({ explanation, filter, onFilterChange }) {
  const rawDrivers = [...(explanation?.default_log_odds_contributions || [])].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const largest = Math.max(0.01, ...rawDrivers.map((item) => Math.abs(item.contribution)));
  
  const filteredDrivers = rawDrivers.filter((item) => {
    if (filter === 'increased') return item.contribution >= 0;
    if (filter === 'reduced') return item.contribution < 0;
    return true;
  }).slice(0, 8);

  const posCount = rawDrivers.filter(d => d.contribution >= 0).length;
  const negCount = rawDrivers.filter(d => d.contribution < 0).length;

  return (
    <div className="shap-deck-wrap">
      {/* Filter Tabs */}
      <div className="shap-filter-bar">
        <button
          type="button"
          className={`shap-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => onFilterChange('all')}
        >
          All Drivers ({rawDrivers.length})
        </button>
        <button
          type="button"
          className={`shap-tab risk-tab ${filter === 'increased' ? 'active' : ''}`}
          onClick={() => onFilterChange('increased')}
        >
          <span className="dot dot-risk" /> Increased Risk ({posCount})
        </button>
        <button
          type="button"
          className={`shap-tab buffer-tab ${filter === 'reduced' ? 'active' : ''}`}
          onClick={() => onFilterChange('reduced')}
        >
          <span className="dot dot-buffer" /> Reduced Risk ({negCount})
        </button>
      </div>

      {/* Driver Cards */}
      <div className="shap-driver-cards">
        {filteredDrivers.map((item) => {
          const isRiskIncreaser = item.contribution >= 0;
          const pctWidth = Math.max(6, Math.min(100, (Math.abs(item.contribution) / largest) * 100));
          return (
            <div className={`shap-driver-row ${isRiskIncreaser ? 'driver-risk' : 'driver-buffer'}`} key={item.feature}>
              <div className="driver-info">
                <div className="driver-name-group">
                  <span className="driver-badge">{isRiskIncreaser ? 'Increases Default Probability' : 'Reduces Default Probability'}</span>
                  <strong>{humanizeFeature(item.feature)}</strong>
                </div>
                <div className={`driver-val-pill ${isRiskIncreaser ? 'pill-risk' : 'pill-buffer'}`}>
                  {isRiskIncreaser ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  <span>{isRiskIncreaser ? '+' : ''}{item.contribution.toFixed(3)} log-odds</span>
                </div>
              </div>
              <div className="driver-progress-track">
                <div
                  className={`driver-progress-bar ${isRiskIncreaser ? 'bar-risk' : 'bar-buffer'}`}
                  style={{ width: `${pctWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState(() => routeIndex(window.location.pathname));
  const [form, setForm] = useState(initialForm);
  const [apiStatus, setApiStatus] = useState('checking');
  const [modelInfo, setModelInfo] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [history, setHistory] = useState(readHistory);
  const [liquidReserve, setLiquidReserve] = useState(0);
  const [reserveType, setReserveType] = useState('Savings Balance');
  const [riskTriggerPct, setRiskTriggerPct] = useState(50);
  const [scenarioApr, setScenarioApr] = useState(10);
  const [budgetTargetPct, setBudgetTargetPct] = useState(35);
  const [repaymentOptions, setRepaymentOptions] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [shapFilter, setShapFilter] = useState('all');
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
      const scenarios = await apiRequest('/workflow/repayment-options', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loan_amount: form.loan_amount, annual_income: form.income, scenario_apr_pct: scenarioApr, budget_target_pct: budgetTargetPct, term_months: form.loan_term }) });
      setRepaymentOptions(scenarios); setSelectedPlanId(`emi-${form.loan_term}`);
      const record = { applicant_name: form.applicant_name.trim(), created_at: new Date().toISOString(), bank_balance_type: reserveType, bank_balance_amount: liquidReserve, profile, workflow: result, repayment_options: scenarios };
      const updatedHistory = [record, ...readHistory()].slice(0, 50);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory)); setHistory(updatedHistory);
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
    setForm(initialForm); setWorkflow(null); setRepaymentOptions(null); setLiquidReserve(0); setReserveType('Savings Balance'); setRiskTriggerPct(50); setScenarioApr(10); setBudgetTargetPct(35); setAcknowledged(false); setConfirmed(false); setError(''); goTo(0);
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
        <nav className={`nav-links ${menuOpen ? 'nav-open' : ''}`}><button onClick={() => goTo(0)}>Overview</button><button onClick={() => goTo(1)}>Application</button><button onClick={() => goTo(2)}>Risk analysis</button><button onClick={() => goTo(4)}>Repayment plans</button><button onClick={() => { if (page !== 0) goTo(0); setTimeout(() => document.getElementById('history')?.scrollIntoView({ behavior: 'smooth' }), 0); setMenuOpen(false); }}>History</button></nav>
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

      {page > 0 && <section className="workspace section-wrap multi-page-workspace" id="workflow"><div className="section-heading"><div><span className="section-eyebrow">GUIDED APPLICATION WORKFLOW</span><h2>{page === 1 ? 'Financial profile first' : page === 2 ? 'Risk & repayment analysis' : page === 3 ? 'Additional context' : page === 4 ? 'Repayment plans' : 'Workflow summary'}</h2><p>{page === 1 ? 'Start with available bank balance, then enter salary and loan details for the analysis.' : page === 2 ? 'Review the historical default estimate and monthly repayment as a share of salary.' : page === 3 ? 'Follow the risk-trigger branch and review optional financial context.' : page === 4 ? 'Compare monthly repayment and one-time scenarios with your own assumptions.' : 'Review the outcome of this simulated, non-binding workflow.'}</p></div><div className="workspace-meta"><span><LockKeyhole size={14} /> History stays in this browser</span><span className="meta-separator" />{workflow && <button type="button" onClick={restart}>Start over</button>}</div></div>
        <StageRail current={page} onSelect={goTo} />

        {page === 1 && (() => {
          const ltiRatio = (form.loan_amount / Math.max(1, form.income)) * 100;
          const dtiPct = form.dti_ratio * 100;
          const approxMonthly = Math.round(monthlyInstallment(form.loan_amount, scenarioApr, form.loan_term));
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

                <div className="form-section-group">
                  <div className="section-subtitle"><span>1. BANK BALANCE DETAILS</span></div>
                  <p className="form-helper-copy">Enter an approximate balance only. Do not enter account numbers or banking credentials.</p>
                  <div className="reserve-type-grid">
                    {['Savings Balance', 'Fixed Deposit', 'Liquid Portfolio', 'None'].map((type) => <button type="button" key={type} className={`reserve-type-chip ${reserveType === type ? 'selected' : ''}`} onClick={() => { setReserveType(type); if (type === 'None') setLiquidReserve(0); }}><span>{type}</span></button>)}
                  </div>
                  {reserveType !== 'None' && <div className="interactive-slider-box" style={{ marginTop: '14px' }}>
                    <div className="slider-header-row"><div className="slider-title"><span>Available Balance</span><small>Approximate cash or liquid savings</small></div><div className="slider-val-badge" style={{ background: '#EAF5EE', color: '#2D7D5F' }}><strong>{currency(liquidReserve)}</strong></div></div>
                    <Field label="Balance amount"><span className="input-wrap"><span className="input-affix">$</span><input type="number" min={0} max={10000000} step={100} value={liquidReserve} onChange={(e) => setLiquidReserve(Number(e.target.value))} /></span></Field>
                    <input type="range" className="slider-range-bar" min={0} max={100000} step={1000} value={liquidReserve} onChange={(e) => setLiquidReserve(Number(e.target.value))} />
                    <div className="slider-track-labels"><span>$0</span><span>$25,000</span><span>$50,000</span><span>$100,000</span></div>
                  </div>}
                </div>

                <div className="form-section-group">
                  <div className="section-subtitle"><span>APPLICANT</span></div>
                  <Field label="Name"><span className="input-wrap"><input type="text" value={form.applicant_name} required autoComplete="name" onChange={changeField('applicant_name')} placeholder="Enter applicant name" /></span></Field>
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
                      <strong>{ltiRatio.toFixed(1)}% of annual income</strong>
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
                      Estimate uses {scenarioApr}% APR over {form.loan_term} months. Taxes, fees, and other debts are excluded.
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

        {page === 2 && workflow && (() => {
          const prob = workflow.prediction.default_probability;
          const probPct = (prob * 100).toFixed(1);
          const benchmarkDiff = (prob * 100 - 24.1).toFixed(1);
          const isHighRisk = prob >= 0.5;
          const isModerate = prob >= 0.25 && prob < 0.5;

          return (
            <div className="risk-cockpit-workspace page-enter">
              {/* Top Banner Status */}
              <div className="cockpit-top-bar">
                <div className="cockpit-title-group">
                  <span className="cockpit-tag">EVALUATED MODEL SIGNAL</span>
                  <h3>Default Risk & Attribution Cockpit</h3>
                  <p>Application Reference <code>{workflow.workflow_id.slice(0, 8)}</code> · Evaluated with gradient boosting pipeline</p>
                </div>
                <div className="cockpit-status-badges">
                  <span className="badge-calibrated"><Check size={14} /> Pipeline Calibrated</span>
                  <span className="badge-stateless"><LockKeyhole size={13} /> Stateless Evaluation</span>
                </div>
              </div>

              {/* Two Column Grid */}
              <div className="cockpit-grid">
                {/* Left Column: Risk Gauge & Rate Estimator */}
                <div className="cockpit-left-col">
                  {/* Gauge Card */}
                  <div className="cockpit-gauge-card glass-card">
                    <div className="gauge-card-header">
                      <div>
                        <span className="gauge-kicker">CLASSIFIER SIGNAL</span>
                        <h4>Default Probability</h4>
                      </div>
                      <div className={`risk-tier-chip ${isHighRisk ? 'tier-high' : isModerate ? 'tier-mod' : 'tier-low'}`}>
                        {isHighRisk ? <AlertTriangle size={14} /> : <Check size={14} />}
                        <span>{isHighRisk ? 'High Risk Exposure' : isModerate ? 'Moderate Risk' : 'Conservative Risk'}</span>
                      </div>
                    </div>

                    {/* SVG Gauge Display */}
                    <div className="cockpit-gauge-visual">
                      <div className="gauge-arc-wrap">
                        <svg viewBox="0 0 200 110" className="cockpit-svg-arc">
                          {/* Background Arc */}
                          <path
                            d="M 25 100 A 75 75 0 0 1 175 100"
                            fill="none"
                            stroke="#EDE9DF"
                            strokeWidth="16"
                            strokeLinecap="round"
                          />
                          {/* Filled Value Arc */}
                          <path
                            d="M 25 100 A 75 75 0 0 1 175 100"
                            fill="none"
                            stroke="url(#cockpitGrad)"
                            strokeWidth="16"
                            strokeDasharray="236"
                            strokeDashoffset={236 - (236 * Math.min(1, Math.max(0, prob)))}
                            strokeLinecap="round"
                          />
                          <defs>
                            <linearGradient id="cockpitGrad" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#27AE60" />
                              <stop offset="50%" stopColor="#C9A84C" />
                              <stop offset="100%" stopColor="#C0392B" />
                            </linearGradient>
                          </defs>
                        </svg>

                        <div className="gauge-readout-center">
                          <strong>{probPct}%</strong>
                          <span>Default Probability</span>
                        </div>
                      </div>

                      <div className="gauge-benchmark-note">
                        <span>Benchmark Delta</span>
                        <strong className={Number(benchmarkDiff) >= 0 ? 'text-warn' : 'text-good'}>
                          {Number(benchmarkDiff) >= 0 ? `+${benchmarkDiff}%` : `${benchmarkDiff}%`} vs population median (24.1%)
                        </strong>
                      </div>
                    </div>

                    {/* Compact Profile Pills */}
                    <div className="cockpit-profile-strip">
                      <div className="profile-pill">
                        <span>Purpose</span>
                        <strong>{form.loan_purpose}</strong>
                      </div>
                      <div className="profile-pill">
                        <span>Requested</span>
                        <strong>{currency(form.loan_amount)}</strong>
                      </div>
                      <div className="profile-pill">
                        <span>Term</span>
                        <strong>{form.loan_term} mo</strong>
                      </div>
                      <div className="profile-pill">
                        <span>FICO Score</span>
                        <strong>{form.credit_score}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="salary-ratio-card glass-card">
                    <div><span className="rate-kicker">MONTHLY REPAYMENT VS SALARY</span><h5>Repayment-to-Salary Ratio</h5></div>
                    {selectedPlan && repaymentOptions ? <>
                      <strong className="salary-ratio-value">{((selectedPlan.monthly_payment / repaymentOptions.monthly_income) * 100).toFixed(1)}%</strong>
                      <p>{currency(selectedPlan.monthly_payment)} estimated monthly payment ÷ {currency(repaymentOptions.monthly_income)} gross monthly salary. Based on a {scenarioApr}% scenario APR over {form.loan_term} months.</p>
                    </> : <p>Repayment ratio is being calculated from your loan and salary details.</p>}
                    <p>Available {reserveType.toLowerCase()}: {currency(liquidReserve)}. This balance informs the cash buffer estimate; the historical risk model does not use bank balance as a prediction feature.</p>
                    <small>Illustrative affordability measure; not an approval or lending decision.</small>
                  </div>

                  {/* Historical Rate Model Card */}
                  <div className="rate-model-card glass-card">
                    <div className="rate-card-header">
                      <span className="rate-icon-badge"><TrendingUp size={16} /></span>
                      <div className="rate-header-copy">
                        <span className="rate-kicker">HISTORICAL RATE MODEL</span>
                        <h5>Estimated Historical APR</h5>
                      </div>
                      <span className={`rate-model-badge ${workflow.prediction.interest_rate_model_status}`}>
                        {workflow.prediction.interest_rate_model_status === 'beats_baseline' ? 'Beats Baseline' : 'Baseline Retained'}
                      </span>
                    </div>

                    <div className="rate-value-row">
                      {workflow.prediction.estimated_interest_rate_pct != null ? (
                        <div className="rate-val-display">
                          <strong>{workflow.prediction.estimated_interest_rate_pct.toFixed(2)}%</strong>
                          <span>indicative APR</span>
                        </div>
                      ) : (
                        <div className="rate-withheld-display">
                          <strong>Estimate Withheld</strong>
                          <span>Model fell below training-mean baseline protection</span>
                        </div>
                      )}
                    </div>
                    <p className="rate-card-disclaimer">
                      {workflow.prediction.disclaimer}
                    </p>
                  </div>
                </div>

                {/* Right Column: SHAP Factor Attribution Deck */}
                <div className="cockpit-right-col">
                  <div className="shap-panel-card glass-card">
                    <div className="shap-header">
                      <div>
                        <span className="shap-kicker">EXPLAINABILITY & TRANSPARENCY</span>
                        <h4>Key Driving Factors (SHAP)</h4>
                        <p>Game-theoretic attribution decomposing positive and negative contributions to risk.</p>
                      </div>
                      <span className="shap-certified-tag"><Sparkles size={13} /> SHAP Vector</span>
                    </div>

                    <ShapFactorDeck
                      explanation={workflow.explanation}
                      filter={shapFilter}
                      onFilterChange={setShapFilter}
                    />

                    <div className="shap-legend-row">
                      <div className="legend-item">
                        <span className="legend-box box-risk" />
                        <span>Pushes default probability upward (higher risk)</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-box box-buffer" />
                        <span>Pushes default probability downward (protective buffer)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Context Routing Action */}
              <div className={`cockpit-routing-banner ${additionalReviewTriggered ? 'route-review' : 'route-standard'}`}>
                <div className="routing-left">
                  <span className="routing-icon">
                    {additionalReviewTriggered ? <ShieldAlert size={22} /> : <Check size={22} />}
                  </span>
                  <div>
                    <strong>{additionalReviewTriggered ? 'Additional Context Pathway Recommended' : 'Standard Context Pathway'}</strong>
                    <p>
                      Default risk signal of {probPct}% {additionalReviewTriggered ? 'meets' : 'is below'} the illustrative {riskTriggerPct}% review threshold. Continue to configure scenario reserves.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="button-primary route-cta"
                  onClick={() => goTo(3)}
                >
                  Configure Additional Context <ArrowRight size={16} />
                </button>
              </div>
            </div>
          );
        })()}

        {page === 3 && workflow && (() => {
          const approxMonthly = Math.round(monthlyInstallment(form.loan_amount, scenarioApr, form.loan_term));
          const runwayMonths = liquidReserve > 0 && approxMonthly > 0 ? (liquidReserve / approxMonthly).toFixed(1) : 0;
          const prob = workflow.prediction.default_probability;
          const probPct = (prob * 100).toFixed(1);
          const isTriggered = prob * 100 >= riskTriggerPct;

          return (
            <div className="context-workspace page-enter">
              {/* Header */}
              <div className="cockpit-top-bar">
                <div className="cockpit-title-group">
                  <span className="cockpit-tag">STEP 03 · FINANCIAL LIQUIDITY & REVIEW POLICY</span>
                  <h3>Additional Context & Buffer Simulator</h3>
                  <p>Model default signal: <strong>{probPct}%</strong> · Simulate emergency debt buffers and adjust review trigger rules.</p>
                </div>
                <div className="cockpit-status-badges">
                  <span className={`status-badge-pill ${isTriggered ? 'badge-amber' : 'badge-green'}`}>
                    {isTriggered ? <ShieldAlert size={14} /> : <Check size={14} />}
                    <span>{isTriggered ? 'Additional Context Triggered' : 'Standard Routing'}</span>
                  </span>
                </div>
              </div>

              {/* 2-Column Grid */}
              <div className="context-grid">
                {/* Left Card: Liquid Reserve & Runway Simulator */}
                <div className="context-card glass-card">
                  <div className="context-card-header">
                    <span className="card-badge-gold"><Wallet size={16} /> EMERGENCY LIQUIDITY</span>
                    <h4>Liquid Reserve & Debt Runway</h4>
                    <p>Enter optional savings or fixed deposit balances to test debt coverage runway.</p>
                  </div>

                  <div className="runway-shield-box">
                    <div className="runway-icon-circle"><Wallet size={24} /></div>
                    <div className="runway-copy"><div className="runway-val-row"><strong>{currency(liquidReserve)}</strong><span className="runway-tag">{reserveType}</span></div><p>Balance details were collected at the start of intake and used here to estimate payment runway.</p></div>
                  </div>

                  {/* Runway Debt Shield Visual */}
                  <div className="runway-shield-box">
                    <div className="runway-icon-circle">
                      <ShieldCheck size={26} />
                    </div>
                    <div className="runway-copy">
                      <div className="runway-val-row">
                        <strong>{runwayMonths > 0 ? `${runwayMonths} Months` : '0 Months'}</strong>
                        <span className="runway-tag">{runwayMonths >= 6 ? 'Strong Buffer' : runwayMonths > 0 ? 'Moderate Buffer' : 'No Buffer'}</span>
                      </div>
                      <p>
                        {runwayMonths > 0
                          ? `At an indicative ~$${approxMonthly}/mo payment, your reserve covers ~${runwayMonths} months of payments if income pauses.`
                          : 'No liquid buffer provided. Monthly payment obligations rely 100% on continuous active income.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Card: Policy Routing Trigger & Stress Testing */}
                <div className="context-card glass-card">
                  <div className="context-card-header">
                    <span className="card-badge-gold"><Gauge size={16} /> ROUTING THRESHOLD</span>
                    <h4>Workflow Branching Policy</h4>
                    <p>Adjust the threshold trigger to observe how policy rules branch based on ML risk signals.</p>
                  </div>

                  {/* Threshold Slider Box */}
                  <div className="interactive-slider-box" style={{ marginTop: '12px' }}>
                    <div className="slider-header-row">
                      <div className="slider-title">
                        <span>Review Trigger Threshold</span>
                        <small>Default risk % that requires additional verification</small>
                      </div>
                      <div className="slider-val-badge" style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}>
                        <strong>{riskTriggerPct}%</strong>
                      </div>
                    </div>
                    <input
                      type="range"
                      className="slider-range-bar"
                      min={10}
                      max={90}
                      step={5}
                      value={riskTriggerPct}
                      onChange={(e) => setRiskTriggerPct(Number(e.target.value))}
                    />
                    <div className="slider-track-labels">
                      <span>10% Strict</span>
                      <span>50% Standard</span>
                      <span>90% Relaxed</span>
                    </div>
                  </div>

                  {/* Dynamic Branch Evaluation Callout */}
                  <div className={`policy-evaluation-card ${isTriggered ? 'eval-amber' : 'eval-green'}`}>
                    <div className="eval-icon">
                      {isTriggered ? <ShieldAlert size={22} /> : <Check size={22} />}
                    </div>
                    <div className="eval-details">
                      <strong>{isTriggered ? 'Review Pathway Triggered' : 'Standard Intake Pathway'}</strong>
                      <p>
                        Current model probability of <strong>{probPct}%</strong> {isTriggered ? 'exceeds' : 'is safely below'} your selected {riskTriggerPct}% threshold.
                      </p>
                    </div>
                  </div>

                  {/* Profile Verification Recap Card */}
                  <div className="safeguard-recap-box">
                    <div className="recap-header">
                      <Sparkles size={15} />
                      <span>Profile Verification Checklist</span>
                    </div>
                    <div className="recap-list">
                      <div className="recap-row">
                        <span>Applicant:</span>
                        <strong>{form.applicant_name} ({form.age} yrs)</strong>
                      </div>
                      <div className="recap-row">
                        <span>Annual Salary:</span>
                        <strong>{currency(form.income)} / yr</strong>
                      </div>
                      <div className="recap-row">
                        <span>Capital Requested:</span>
                        <strong>{currency(form.loan_amount)} ({form.loan_term} mo)</strong>
                      </div>
                      <div className="recap-row">
                        <span>Credit Score:</span>
                        <strong>{form.credit_score} FICO</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="dossier-actions">
                <button className="button-outline" type="button" onClick={() => goTo(2)}>
                  <ArrowLeft size={16} /> Back to Risk Signal
                </button>
                <button
                  className="button-primary finalize-cta"
                  type="button"
                  disabled={loading}
                  onClick={loadRepaymentOptions}
                >
                  {loading ? (
                    <><LoaderCircle className="spin" size={17} /> Simulating scenarios…</>
                  ) : (
                    <>Simulate Repayment Scenarios <ArrowRight size={16} /></>
                  )}
                </button>
              </div>
            </div>
          );
        })()}

        {page === 4 && repaymentOptions && (
          <div className="plans-workspace page-enter">
            {/* Header */}
            <div className="cockpit-top-bar">
              <div className="cockpit-title-group">
                <span className="cockpit-tag">STEP 04 · AMORTIZATION & SCENARIOS</span>
                <h3>Compare Repayment Scenarios</h3>
                <p>Arithmetic payment schedules modeled with customizable annual APR and personal budget targets.</p>
              </div>
              <div className="cockpit-status-badges">
                <span className="badge-stateless"><Activity size={14} /> Interactive Math Model</span>
              </div>
            </div>

            {/* Interactive Scenario Controls Card */}
            <div className="plan-controls-card glass-card">
              <div className="plan-controls-grid">
                {/* APR Slider */}
                <div className="scenario-slider-item">
                  <div className="slider-header-row">
                    <div className="slider-title">
                      <span>Hypothetical Annual APR</span>
                      <small>Custom interest assumption</small>
                    </div>
                    <div className="slider-val-badge" style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}>
                      <strong>{Number(scenarioApr).toFixed(2)}%</strong>
                    </div>
                  </div>
                  <input
                    type="range"
                    className="slider-range-bar"
                    min={0}
                    max={30}
                    step={0.25}
                    value={scenarioApr}
                    onChange={(e) => setScenarioApr(Number(e.target.value))}
                  />
                  <div className="slider-track-labels">
                    <span>0% Promo</span>
                    <span>10% Benchmark</span>
                    <span>20%</span>
                    <span>30%</span>
                  </div>
                </div>

                {/* Budget Target Slider */}
                <div className="scenario-slider-item">
                  <div className="slider-header-row">
                    <div className="slider-title">
                      <span>Payment Budget Target</span>
                      <small>Max % of monthly income</small>
                    </div>
                    <div className="slider-val-badge" style={{ background: '#EAF5EE', color: '#2D7D5F' }}>
                      <strong>{budgetTargetPct}% of gross monthly income</strong>
                    </div>
                  </div>
                  <input
                    type="range"
                    className="slider-range-bar"
                    min={5}
                    max={60}
                    step={1}
                    value={budgetTargetPct}
                    onChange={(e) => setBudgetTargetPct(Number(e.target.value))}
                  />
                  <div className="slider-track-labels">
                    <span>5% Light</span>
                    <span>35% Standard</span>
                    <span>60% Aggressive</span>
                  </div>
                </div>

                <div className="recalc-action-box">
                  <button
                    type="button"
                    className="button-primary"
                    style={{ width: '100%', height: '48px' }}
                    disabled={loading}
                    onClick={loadRepaymentOptions}
                  >
                    {loading ? <LoaderCircle className="spin" size={16} /> : <SlidersHorizontal size={16} />}
                    Recalculate Scenarios
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="error-box" role="alert">
                <span><X size={15} /></span>
                <div><strong>Calculation failed</strong><small>{error}</small></div>
              </div>
            )}

            {/* Repayment Plans Grid */}
            <div className="plans-cards-grid">
              {repaymentOptions.plans.map((plan) => {
                const monthlyRatio = plan.term_months ? (plan.monthly_payment / repaymentOptions.monthly_income) * 100 : null;
                const isSelected = selectedPlanId === plan.id;
                const isWithin = monthlyRatio != null && monthlyRatio <= budgetTargetPct;

                return (
                  <div
                    key={plan.id}
                    className={`plan-card-elevated ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <div className="plan-card-top">
                      <span className="plan-name-label">{plan.label}</span>
                      <div className={`plan-radio-circle ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <Check size={12} />}
                      </div>
                    </div>

                    <div className="plan-payment-figure">
                      <strong>{currency(plan.monthly_payment)}</strong>
                      <span>{plan.term_months ? '/ month' : ' one-time'}</span>
                    </div>

                    <div className="plan-breakdown-rows">
                      <div className="breakdown-row">
                        <span>Total Repayment</span>
                        <strong>{currency(plan.total_payment)}</strong>
                      </div>
                      <div className="breakdown-row">
                        <span>Estimated Interest</span>
                        <strong>{currency(plan.total_interest)}</strong>
                      </div>
                      <div className="breakdown-row">
                        <span>Gross Monthly Salary</span>
                        <strong>{currency(repaymentOptions.monthly_income)}</strong>
                      </div>
                    </div>

                    {monthlyRatio != null && (
                      <div className={`plan-target-badge ${isWithin ? 'within' : 'exceeds'}`}>
                        {isWithin ? <Check size={12} /> : <AlertTriangle size={12} />}
                        <span>{currency(plan.monthly_payment)} EMI ÷ {currency(repaymentOptions.monthly_income)} gross monthly salary = {monthlyRatio.toFixed(1)}% ({isWithin ? 'Within Target' : 'Exceeds Target'})</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="dossier-actions">
              <button className="button-outline" type="button" onClick={() => goTo(3)}>
                <ArrowLeft size={16} /> Back to Additional Context
              </button>
              <button
                className="button-primary finalize-cta"
                type="button"
                disabled={!selectedPlan || loading}
                onClick={() => { setConfirmed(false); goTo(5); }}
              >
                Review Selected Scenario <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {page === 5 && selectedPlan && repaymentOptions && (() => {
          const principal = form.loan_amount;
          const totalPayment = selectedPlan.total_payment || principal;
          const interest = Math.max(0, totalPayment - principal);
          const principalPct = Math.round((principal / totalPayment) * 100);
          const interestPct = 100 - principalPct;
          const prob = workflow?.prediction?.default_probability ?? 0;
          const probPct = (prob * 100).toFixed(1);
          const hasReserve = liquidReserve > 0;
          const coverageMonths = hasReserve && selectedPlan.monthly_payment ? (liquidReserve / selectedPlan.monthly_payment).toFixed(1) : null;

          return (
            <div className="summary-dossier-workspace page-enter">
              {/* Header */}
              <div className="dossier-hero">
                <div className={`dossier-check-badge ${confirmed ? 'confirmed' : ''}`}>
                  <Check size={28} />
                </div>
                <span className="dossier-kicker">SIMULATION SCENARIO DOSSIER</span>
                <h3>{confirmed ? 'Scenario Completed & Validated' : 'Executive Scenario Summary'}</h3>
                <p>
                  {confirmed
                    ? 'This educational simulation is complete. No credit contract was executed, and no financial data was retained.'
                    : 'Review the simulated repayment footprint, principal-interest ratio, and model risk signals.'}
                </p>
                <div className="dossier-ref-pill">
                  <FileCheck2 size={13} />
                  <span>Dossier Reference: <code>{workflow?.workflow_id.slice(0, 8) ?? 'LOCAL-DEMO'}</code></span>
                </div>
              </div>

              {/* 2-Column Summary Cards */}
              <div className="dossier-grid">
                {/* Left Card: Repayment Footprint & Capital Breakdown */}
                <div className="dossier-card glass-card">
                  <div className="dossier-card-header">
                    <span className="card-badge-gold"><Wallet size={15} /> PAYMENT SCHEDULE</span>
                    <h4>Selected Payment Plan</h4>
                  </div>

                  {/* Main Monthly Callout */}
                  <div className="dossier-monthly-highlight">
                    <div className="monthly-main">
                      <strong>{currency(selectedPlan.monthly_payment)}</strong>
                      <span>{selectedPlan.term_months ? '/ month' : ' one-time'}</span>
                    </div>
                    <span className="plan-pill-tag">{selectedPlan.label}</span>
                  </div>

                  {/* Principal vs Interest Visual Bar */}
                  <div className="capital-ratio-block">
                    <div className="capital-labels">
                      <div className="cap-label-group">
                        <span className="cap-dot dot-principal" />
                        <span>Principal: <strong>{currency(principal)}</strong> ({principalPct}%)</span>
                      </div>
                      <div className="cap-label-group">
                        <span className="cap-dot dot-interest" />
                        <span>Est. Interest: <strong>{currency(interest)}</strong> ({interestPct}%)</span>
                      </div>
                    </div>

                    <div className="capital-bar-track">
                      <div className="cap-bar-fill fill-principal" style={{ width: `${principalPct}%` }} />
                      <div className="cap-bar-fill fill-interest" style={{ width: `${interestPct}%` }} />
                    </div>

                    <div className="total-repayment-row">
                      <span>Total Repayment Commitment:</span>
                      <strong>{currency(totalPayment)}</strong>
                    </div>
                  </div>

                  {/* Key Scenario Stats */}
                  <div className="dossier-stats-grid">
                    <div className="d-stat-item">
                      <span>Assumed APR</span>
                      <strong>{Number(scenarioApr).toFixed(2)}%</strong>
                    </div>
                    <div className="d-stat-item">
                      <span>Tenure</span>
                      <strong>{selectedPlan.term_months ? `${selectedPlan.term_months} Months` : 'N/A'}</strong>
                    </div>
                    <div className="d-stat-item">
                      <span>Gross Monthly Income</span>
                      <strong>{currency(repaymentOptions.monthly_income)}</strong>
                    </div>
                    <div className="d-stat-item">
                      <span>Payment Burden</span>
                      <strong className={`payment-burden-value ${monthlyPaymentRatio == null ? '' : monthlyPaymentRatio > 0.4 ? 'text-warn' : 'text-good'}`}>
                        {monthlyPaymentRatio == null
                          ? 'No monthly EMI (one-time payment)'
                          : `${currency(selectedPlan.monthly_payment)} ÷ ${currency(repaymentOptions.monthly_income)} = ${(monthlyPaymentRatio * 100).toFixed(1)}%`}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Right Card: Model Signal & Reserve Context */}
                <div className="dossier-card glass-card">
                  <div className="dossier-card-header">
                    <span className="card-badge-gold"><BarChart3 size={15} /> RISK & LIQUIDITY</span>
                    <h4>Risk Signals & Buffer</h4>
                  </div>

                  {/* Risk Mini Gauge Box */}
                  <div className="dossier-risk-box">
                    <div className="risk-box-header">
                      <span>Classifier Default Signal</span>
                      <span className={`risk-tier-chip ${prob >= 0.5 ? 'tier-high' : prob >= 0.25 ? 'tier-mod' : 'tier-low'}`}>
                        {prob >= 0.5 ? 'High Risk Band' : prob >= 0.25 ? 'Moderate Risk' : 'Low Risk'}
                      </span>
                    </div>
                    <div className="dossier-risk-meter">
                      <div className="dossier-risk-track">
                        <div
                          className="dossier-risk-fill"
                          style={{
                            width: `${Math.min(100, Math.max(0, prob * 100))}%`,
                            background: prob >= 0.5 ? '#C0392B' : prob >= 0.25 ? '#C9A84C' : '#27AE60'
                          }}
                        />
                      </div>
                      <div className="risk-meter-labels">
                        <strong>{probPct}%</strong>
                        <small>Model output probability</small>
                      </div>
                    </div>
                  </div>

                  {/* Reserve Coverage Card */}
                  <div className="dossier-reserve-box">
                    <div className="reserve-icon-wrap">
                      <ShieldCheck size={20} />
                    </div>
                    <div className="reserve-details">
                      {hasReserve ? (
                        <>
                          <div className="reserve-title-row">
                            <strong>{currency(liquidReserve)} in {reserveType}</strong>
                            <span className="coverage-badge">{coverageMonths} mo. buffer</span>
                          </div>
                          <p>
                            Hypothetical reserve represents approximately <strong>{coverageMonths} monthly installments</strong> in this scenario.
                          </p>
                        </>
                      ) : (
                        <>
                          <strong>No Optional Reserve Provided</strong>
                          <p>No liquid buffer entered. Scenario relies entirely on projected ongoing monthly cashflow.</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Applicant Details Recap */}
                  <div className="dossier-profile-recap">
                    <div className="recap-title">
                      <span>Applicant Profile Recap</span>
                    </div>
                    <div className="recap-pills">
                      <div className="recap-pill"><span>Name:</span> <strong>{form.applicant_name}</strong></div>
                      <div className="recap-pill"><span>FICO:</span> <strong>{form.credit_score}</strong></div>
                      <div className="recap-pill"><span>Purpose:</span> <strong>{form.loan_purpose}</strong></div>
                      <div className="recap-pill"><span>Income:</span> <strong>{currency(form.income)}</strong></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Confirmation Accordion Box */}
              {!confirmed ? (
                <div
                  className={`acknowledgment-card ${acknowledged ? 'acknowledged' : ''}`}
                  onClick={() => setAcknowledged(!acknowledged)}
                >
                  <div className="ack-checkbox-wrap">
                    <div className={`ack-box ${acknowledged ? 'checked' : ''}`}>
                      {acknowledged && <Check size={16} />}
                    </div>
                  </div>
                  <div className="ack-text">
                    <strong>Acknowledge Educational Simulation Terms</strong>
                    <p>
                      I confirm that this summary is a demonstration workflow based on historical public dataset benchmarks. I understand that no lending decision, approval, contract, credit inquiry, or fund disbursement has occurred.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="finalized-banner">
                  <div className="finalized-icon"><BadgeCheck size={24} /></div>
                  <div>
                    <strong>Demonstration Scenario Finalized</strong>
                    <p>All inputs remain strictly in your browser memory and will reset when you begin another session.</p>
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="dossier-actions">
                <button className="button-outline" type="button" onClick={() => goTo(4)}>
                  <ArrowLeft size={16} /> Back to Repayment Plans
                </button>
                {confirmed ? (
                  <button className="button-primary finalize-cta" type="button" onClick={restart}>
                    Start Another Profile <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    className="button-primary finalize-cta"
                    type="button"
                    disabled={!acknowledged}
                    onClick={() => setConfirmed(true)}
                  >
                    Complete Demo Workflow <Check size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </section>}

      <section className="workspace section-wrap history-section" id="history">
        <div className="section-heading"><div><span className="section-eyebrow">SAVED IN THIS BROWSER</span><h2>Assessment history</h2><p>Choose a person’s record to download their individual risk and insight report as a PDF.</p></div></div>
        {history.length === 0 ? <div className="history-empty"><FileSearch size={22} /><p>Your completed assessments will appear here.</p><button type="button" onClick={() => goTo(1)}>Start an assessment <ArrowRight size={14} /></button></div> : <div className="history-list">{history.map((record) => {
          const prediction = record.workflow.prediction;
          const drivers = (record.workflow.explanation?.default_log_odds_contributions || []).slice().sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 3);
          return <article className="history-card" key={record.workflow.workflow_id}>
            <div className="history-card-title"><div><strong>{record.applicant_name || 'Applicant'}</strong><small>{new Date(record.created_at).toLocaleString()}</small></div><span className="history-reference">Ref {record.workflow.workflow_id.slice(0, 8)}</span><button type="button" className="button-outline history-download" onClick={() => downloadPersonInsight(record)}><Download size={15} /> Download this person’s PDF</button></div>
            <div className="history-metrics"><span><small>Default risk estimate</small><strong>{(prediction.default_probability * 100).toFixed(1)}%</strong></span><span><small>Payment / salary</small><strong>{(() => { const plan = record.repayment_options?.plans?.find((item) => item.id === `emi-${record.profile.loan_term}`); return plan && record.repayment_options.monthly_income ? `${((plan.monthly_payment / record.repayment_options.monthly_income) * 100).toFixed(1)}%` : 'Unavailable'; })()}</strong></span><span><small>Bank balance</small><strong>{currency(record.bank_balance_amount)}</strong></span><span><small>Historical rate estimate</small><strong>{prediction.estimated_interest_rate_pct != null ? `${prediction.estimated_interest_rate_pct.toFixed(2)}%` : 'Unavailable'}</strong></span></div>
            <div className="history-insights"><small>Leading model signals</small><p>{drivers.length ? drivers.map((item) => `${humanizeFeature(item.feature)} (${item.contribution >= 0 ? '+' : ''}${item.contribution.toFixed(3)})`).join(' · ') : 'No feature insights available.'}</p></div>
          </article>;
        })}</div>}
        <p className="history-privacy"><LockKeyhole size={13} /> Records are saved in this browser only and are not sent to the API as history.</p>
      </section>
    </main>
    <footer className="footer section-wrap"><button className="wordmark wordmark-button" onClick={() => goTo(0)}><span className="logo-mark"><BrandMark size={26} /></span><span className="brand-name"><strong>Apsara</strong><small>Finance</small></span></button><span>Local educational demo <i /> multi-step workflow</span><span className="footer-note"><ShieldCheck size={13} /> No credit decision, signature, or transfer is made.</span></footer>
  </div>;
}
