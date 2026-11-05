import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileSignature,
  Gauge,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const formatCurrency = (amount, digits = 0) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);

const mockKycResponse = {
  panStatus: 'verified',
  bureau: 'Northstar Credit Bureau',
  creditScore: 680,
  probabilityOfDefault: 12.4,
};

const steps = [
  ['01', 'Application'],
  ['02', 'AI underwriting'],
  ['03', 'Risk mitigation'],
  ['04', 'Your offer'],
];

function Panel({ children, className = '' }) {
  return <section className={`rounded-2xl border border-slate-800 bg-slate-900/75 shadow-xl shadow-black/10 backdrop-blur ${className}`}>{children}</section>;
}

function FieldLabel({ children }) {
  return <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{children}</label>;
}

function SliderField({ label, value, min, max, step, prefix = '', suffix = '', onChange, helper }) {
  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <FieldLabel>{label}</FieldLabel>
          {helper && <p className="text-xs text-slate-500">{helper}</p>}
        </div>
        <div className="rounded-lg border border-teal-400/20 bg-teal-400/10 px-3 py-1.5 font-mono text-sm font-bold text-teal-300">
          {prefix}{value.toLocaleString()}{suffix}
        </div>
      </div>
      <input className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700" type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} />
      <div className="mt-2 flex justify-between text-[11px] text-slate-500"><span>{prefix}{min.toLocaleString()}{suffix}</span><span>{prefix}{max.toLocaleString()}{suffix}</span></div>
    </div>
  );
}

function RiskGauge({ pd }) {
  const dash = 251;
  const percent = Math.min(pd / 30, 1);
  const offset = dash - dash * percent;
  const tone = pd <= 8 ? 'text-emerald-400' : pd <= 16 ? 'text-amber-400' : 'text-rose-400';
  const status = pd <= 8 ? 'Low risk' : pd <= 16 ? 'Monitor risk' : 'High risk';
  return (
    <div className="relative mx-auto h-56 w-56">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="url(#riskGradient)" strokeWidth="10" strokeLinecap="round" strokeDasharray={dash} strokeDashoffset={offset} className="transition-all duration-700" />
        <defs><linearGradient id="riskGradient"><stop stopColor="#2dd4bf" /><stop offset="0.52" stopColor="#fbbf24" /><stop offset="1" stopColor="#fb7185" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-mono text-4xl font-bold ${tone}`}>{pd}%</span>
        <span className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">probability of default</span>
        <span className={`mt-3 text-sm font-semibold ${tone}`}>{status}</span>
      </div>
    </div>
  );
}

function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(false);
  const [form, setForm] = useState({ name: '', pan: '', role: 'Product manager', salary: 8000, loanAmount: 35000, tenure: 48 });
  const [credit, setCredit] = useState(null);
  const [mitigation, setMitigation] = useState('assets');
  const [coApplicantSalary, setCoApplicantSalary] = useState('5000');
  const [offerTenure, setOfferTenure] = useState(48);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(false), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  const monthlyRate = 0.095 / 12;
  const emi = useMemo(() => {
    const n = offerTenure;
    const r = monthlyRate;
    return form.loanAmount * r * ((1 + r) ** n) / (((1 + r) ** n) - 1);
  }, [form.loanAmount, offerTenure]);

  const amortization = useMemo(() => {
    let balance = form.loanAmount;
    const nextMonths = [];
    const start = new Date();
    for (let installment = 1; installment <= 5; installment += 1) {
      const interest = balance * monthlyRate;
      const principal = emi - interest;
      const date = new Date(start.getFullYear(), start.getMonth() + installment, 5);
      nextMonths.push({ installment, date: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), principal, interest, total: emi });
      balance -= principal;
    }
    return nextMonths;
  }, [emi, form.loanAmount]);

  const submitApplication = () => {
    setLoading(true);
    setTimeout(() => {
      setCredit(mockKycResponse);
      setLoading(false);
      setCurrentStep(2);
    }, 2000);
  };

  const recalculateRisk = () => {
    setLoading(true);
    setTimeout(() => {
      setCredit((previous) => ({
        ...previous,
        creditScore: mitigation === 'assets' ? 716 : 708,
        probabilityOfDefault: mitigation === 'assets' ? 7.8 : 8.6,
      }));
      setLoading(false);
      setCurrentStep(4);
    }, 1200);
  };

  const chartData = [
    { factor: 'High debt-to-income', contribution: 0.14, fill: '#fb7185' },
    { factor: 'Good credit history', contribution: -0.08, fill: '#34d399' },
    { factor: 'Income stability', contribution: -0.05, fill: '#2dd4bf' },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-gray-950 text-slate-100 selection:bg-teal-400/30">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(45,212,191,0.10),transparent_28%),radial-gradient(circle_at_85%_0%,rgba(168,85,247,0.10),transparent_28%)]" />
      <div className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
        <header className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-teal-300 to-violet-500 shadow-glow"><Sparkles className="h-5 w-5 text-slate-950" /></div>
            <div><h1 className="text-xl font-bold tracking-tight text-white">Prism<span className="text-teal-300">Credit</span></h1><p className="text-xs text-slate-500">AI risk-based loan pricing engine</p></div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400"><LockKeyhole className="h-3.5 w-3.5 text-teal-300" /> Mock environment · No data leaves your browser</div>
        </header>

        <nav className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {steps.map(([number, label]) => {
            const active = Number(number) === currentStep;
            const finished = Number(number) < currentStep;
            return <div key={number} className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${active ? 'border-teal-400/40 bg-teal-400/10' : 'border-slate-800 bg-slate-900/50'}`}><span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ${finished ? 'bg-teal-400 text-slate-950' : active ? 'bg-violet-400 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>{finished ? <Check className="h-3.5 w-3.5" /> : number}</span><span className={`text-xs font-semibold ${active ? 'text-teal-200' : 'text-slate-500'}`}>{label}</span></div>;
          })}
        </nav>

        {currentStep === 1 && <section className="animate-fade-up grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <Panel className="p-6 sm:p-8">
            <div className="mb-8"><span className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">New application</span><h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Tell us about the applicant.</h2><p className="mt-2 text-sm text-slate-400">We’ll verify identity and ask our underwriting model for a decision.</p></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><FieldLabel>Applicant name</FieldLabel><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Alex Morgan" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-teal-400" /></div>
              <div><FieldLabel>PAN number</FieldLabel><input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" maxLength="10" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm uppercase outline-none transition placeholder:font-sans placeholder:text-slate-600 focus:border-teal-400" /></div>
              <div className="sm:col-span-2"><FieldLabel>Job role</FieldLabel><div className="relative"><BriefcaseBusiness className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-500" /><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-sm outline-none focus:border-teal-400"><option>Product manager</option><option>Software engineer</option><option>Financial analyst</option><option>Healthcare professional</option><option>Small business owner</option></select></div></div>
            </div>
            <div className="mt-8 space-y-7 border-t border-slate-800 pt-7">
              <SliderField label="Monthly salary" value={form.salary} min={1000} max={20000} step={500} prefix="$" onChange={(salary) => setForm({ ...form, salary })} />
              <SliderField label="Desired loan amount" value={form.loanAmount} min={1000} max={100000} step={1000} prefix="$" onChange={(loanAmount) => setForm({ ...form, loanAmount })} />
              <SliderField label="Desired tenure" value={form.tenure} min={12} max={72} step={6} suffix=" months" onChange={(tenure) => { setForm({ ...form, tenure }); setOfferTenure(tenure); }} />
            </div>
            <button onClick={submitApplication} disabled={loading} className="mt-9 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-300 to-cyan-400 px-5 py-4 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"><ShieldCheck className="h-5 w-5" /> Submit & Verify KYC <ArrowRight className="h-4 w-4" /></button>
          </Panel>
          <aside className="space-y-5">
            <Panel className="overflow-hidden"><div className="border-b border-slate-800 bg-gradient-to-br from-violet-500/20 to-slate-900 p-6"><Gauge className="h-7 w-7 text-violet-300" /><h3 className="mt-6 text-lg font-bold text-white">Fair, explainable decisions.</h3><p className="mt-2 text-sm leading-6 text-slate-400">Your offer is calculated from verifiable signals—not a black box.</p></div><div className="space-y-4 p-6">{['Secure PAN validation', 'Credit bureau simulation', 'Transparent pricing logic'].map((item) => <div className="flex items-center gap-3 text-sm text-slate-300" key={item}><span className="grid h-6 w-6 place-items-center rounded-full bg-teal-400/10"><Check className="h-3.5 w-3.5 text-teal-300" /></span>{item}</div>)}</div></Panel>
            <div className="rounded-2xl border border-violet-400/15 bg-violet-400/5 p-5 text-sm text-violet-100"><span className="font-semibold">Prototype note:</span> all identity, credit, and income signals are locally mocked.</div>
          </aside>
        </section>}

        {currentStep === 2 && credit && <section className="animate-fade-up space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><span className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">AI underwriting</span><h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Risk profile, explained.</h2><p className="mt-2 text-sm text-slate-400">Identity verified with {credit.bureau}. Here’s the model’s current view.</p></div><div className="flex items-center gap-2 self-start rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300"><BadgeCheck className="h-4 w-4" /> PAN verified</div></div>
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <Panel className="p-6 sm:p-8"><div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold text-slate-200">AI risk gauge</span><Gauge className="h-5 w-5 text-slate-500" /></div><RiskGauge pd={credit.probabilityOfDefault} /><div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-5"><div className="rounded-xl bg-slate-950 p-4"><span className="text-xs text-slate-500">Credit score</span><p className="mt-1 text-2xl font-bold text-white">{credit.creditScore}</p><p className="text-xs text-amber-300">Fair band</p></div><div className="rounded-xl bg-slate-950 p-4"><span className="text-xs text-slate-500">Requested</span><p className="mt-1 text-2xl font-bold text-white">{formatCurrency(form.loanAmount)}</p><p className="text-xs text-teal-300">{form.tenure} months</p></div></div></Panel>
            <Panel className="p-6 sm:p-8"><div className="mb-6"><span className="text-sm font-semibold text-slate-200">SHAP Feature Contribution</span><p className="mt-1 text-sm text-slate-500">How each signal moved the model’s default-risk estimate.</p></div><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 15, left: 12, bottom: 5 }}><XAxis type="number" domain={[-0.12, 0.18]} tickFormatter={(value) => `${value > 0 ? '+' : ''}${value.toFixed(2)}`} stroke="#64748b" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis dataKey="factor" type="category" width={130} stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: 'rgba(148,163,184,.06)' }} formatter={(value) => [`${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2)} risk`, 'Contribution']} contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }} /><Bar dataKey="contribution" radius={[5, 5, 5, 5]}>{chartData.map((entry) => <Cell key={entry.factor} fill={entry.fill} />)}</Bar></BarChart></ResponsiveContainer></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-rose-400/15 bg-rose-400/5 p-3 text-xs text-rose-200"><strong>+0.14 risk</strong><br />High debt-to-income</div><div className="rounded-lg border border-emerald-400/15 bg-emerald-400/5 p-3 text-xs text-emerald-200"><strong>−0.08 risk</strong><br />Good credit history</div></div></Panel>
          </div>
          {credit.creditScore > 700 ? <button onClick={() => setCurrentStep(4)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-4 text-sm font-bold text-slate-950"><Check className="h-5 w-5" /> Approve & generate offer</button> : credit.creditScore >= 600 ? <button onClick={() => setCurrentStep(3)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-400 to-fuchsia-400 px-5 py-4 text-sm font-bold text-slate-950"><Sparkles className="h-5 w-5" /> Mitigate Risk <ChevronRight className="h-4 w-4" /></button> : <div className="flex items-center gap-3 rounded-xl border border-rose-400/25 bg-rose-400/10 p-5 text-rose-100"><XCircle className="h-6 w-6 shrink-0 text-rose-400" /><div><p className="font-semibold">Hard reject</p><p className="text-sm text-rose-200/75">This profile does not meet the minimum score threshold.</p></div></div>}
        </section>}

        {currentStep === 3 && <section className="animate-fade-up mx-auto max-w-3xl"><Panel className="p-6 sm:p-9"><div className="text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-400/10"><WalletCards className="h-6 w-6 text-violet-300" /></div><span className="mt-5 block text-xs font-bold uppercase tracking-[0.18em] text-violet-300">Fallback loop</span><h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Applicant profile is borderline.</h2><p className="mt-3 text-slate-400">Choose a mitigation strategy to improve the decision signal.</p></div><div className="mt-9 grid gap-4 md:grid-cols-2"><button onClick={() => setMitigation('assets')} className={`rounded-2xl border p-5 text-left transition ${mitigation === 'assets' ? 'border-teal-400 bg-teal-400/10 shadow-glow' : 'border-slate-700 bg-slate-950 hover:border-slate-500'}`}><div className="flex items-start justify-between"><Banknote className="h-6 w-6 text-teal-300" /><span className={`grid h-5 w-5 place-items-center rounded-full border ${mitigation === 'assets' ? 'border-teal-300 bg-teal-300' : 'border-slate-600'}`}>{mitigation === 'assets' && <Check className="h-3.5 w-3.5 text-slate-950" />}</span></div><h3 className="mt-5 font-bold text-white">Verify liquid assets</h3><p className="mt-2 text-sm leading-6 text-slate-400">Confirm sufficient reserves with a mock bank-balance check.</p>{mitigation === 'assets' && <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-400/10 p-3 text-xs font-medium text-emerald-300"><BadgeCheck className="h-4 w-4" /> Bank balance verified: $18,400</div>}</button><button onClick={() => setMitigation('coApplicant')} className={`rounded-2xl border p-5 text-left transition ${mitigation === 'coApplicant' ? 'border-violet-400 bg-violet-400/10 shadow-purple' : 'border-slate-700 bg-slate-950 hover:border-slate-500'}`}><div className="flex items-start justify-between"><UserRoundCheck className="h-6 w-6 text-violet-300" /><span className={`grid h-5 w-5 place-items-center rounded-full border ${mitigation === 'coApplicant' ? 'border-violet-300 bg-violet-300' : 'border-slate-600'}`}>{mitigation === 'coApplicant' && <Check className="h-3.5 w-3.5 text-slate-950" />}</span></div><h3 className="mt-5 font-bold text-white">Add co-applicant</h3><p className="mt-2 text-sm leading-6 text-slate-400">Add household earnings to strengthen repayment capacity.</p>{mitigation === 'coApplicant' && <div className="mt-4"><FieldLabel>Co-applicant monthly salary</FieldLabel><input type="number" value={coApplicantSalary} onClick={(e) => e.stopPropagation()} onChange={(e) => setCoApplicantSalary(e.target.value)} className="w-full rounded-lg border border-violet-400/30 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-300" /></div>}</button></div><button onClick={recalculateRisk} disabled={loading} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-300 to-cyan-400 px-5 py-4 text-sm font-bold text-slate-950 disabled:opacity-70"><Sparkles className="h-5 w-5" /> Recalculate Risk</button></Panel></section>}

        {currentStep === 4 && <section className="animate-fade-up space-y-6"><div className="text-center"><span className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Pricing phase</span><h2 className="mt-2 text-3xl font-bold tracking-tight text-white">A personalized offer is ready.</h2><p className="mt-2 text-sm text-slate-400">Adjust the term to find the payment that fits.</p></div><div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"><Panel className="relative overflow-hidden p-7 sm:p-8"><div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal-400/10 blur-3xl" /><div className="relative"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-300">Approved loan amount</span><CircleDollarSign className="h-6 w-6 text-teal-300" /></div><p className="mt-6 text-5xl font-bold tracking-tight text-white">{formatCurrency(form.loanAmount)}</p><div className="mt-6 flex items-center gap-2 text-sm text-emerald-300"><BadgeCheck className="h-5 w-5" /> Approved following AI risk review</div><div className="mt-9 grid grid-cols-2 gap-3 border-t border-slate-800 pt-6"><div><span className="text-xs text-slate-500">Fixed APR</span><p className="mt-1 text-xl font-bold">9.50%</p></div><div><span className="text-xs text-slate-500">Monthly EMI</span><p className="mt-1 text-xl font-bold text-teal-300">{formatCurrency(emi)}</p></div></div></div></Panel><Panel className="p-7 sm:p-8"><div className="flex items-center justify-between"><div><span className="text-sm font-semibold text-slate-200">Adjust tenure</span><p className="mt-1 text-sm text-slate-500">Longer terms lower the monthly payment.</p></div><span className="rounded-lg bg-violet-400/10 px-3 py-2 font-mono text-sm font-bold text-violet-300">{offerTenure} mo</span></div><input className="mt-12 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700" type="range" min="12" max="72" step="6" value={offerTenure} onChange={(e) => setOfferTenure(Number(e.target.value))} /><div className="mt-2 flex justify-between text-xs text-slate-500"><span>12 mo</span><span>72 mo</span></div><div className="mt-8 rounded-xl border border-teal-400/15 bg-teal-400/5 p-5"><span className="text-xs font-semibold uppercase tracking-wider text-teal-300">Estimated monthly EMI</span><p className="mt-2 text-4xl font-bold text-white">{formatCurrency(emi, 2)}</p><p className="mt-2 text-xs text-slate-400">Principal and interest. No prepayment penalty in this prototype.</p></div></Panel></div><Panel className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-800 px-6 py-5"><div><h3 className="font-bold text-white">Payment schedule</h3><p className="mt-1 text-xs text-slate-500">First five projected installments</p></div><ClipboardCheck className="h-5 w-5 text-slate-500" /></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-6 py-4 font-semibold">Installment</th><th className="px-6 py-4 font-semibold">Date</th><th className="px-6 py-4 text-right font-semibold">Principal</th><th className="px-6 py-4 text-right font-semibold">Interest</th><th className="px-6 py-4 text-right font-semibold">Total due</th></tr></thead><tbody className="divide-y divide-slate-800">{amortization.map((row) => <tr key={row.installment} className="text-slate-300"><td className="px-6 py-4 font-mono text-teal-300">{String(row.installment).padStart(2, '0')}</td><td className="px-6 py-4">{row.date}</td><td className="px-6 py-4 text-right">{formatCurrency(row.principal, 2)}</td><td className="px-6 py-4 text-right text-slate-400">{formatCurrency(row.interest, 2)}</td><td className="px-6 py-4 text-right font-semibold text-white">{formatCurrency(row.total, 2)}</td></tr>)}</tbody></table></div></Panel><button onClick={() => setToast(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 px-5 py-4 text-sm font-bold text-slate-950 transition hover:brightness-110"><FileSignature className="h-5 w-5" /> e-Sign & Disburse Funds</button></section>}
      </div>
      {loading && <div className="fixed inset-0 z-50 grid place-items-center bg-gray-950/85 p-5 backdrop-blur-sm"><div className="w-full max-w-sm rounded-2xl border border-teal-400/20 bg-slate-900 p-7 text-center shadow-2xl"><LoaderCircle className="mx-auto h-10 w-10 animate-spin text-teal-300" /><h3 className="mt-5 text-lg font-bold text-white">{currentStep === 1 ? 'Verifying PAN & fetching credit bureau data...' : 'Recalculating model risk...'}</h3><p className="mt-2 text-sm text-slate-400">Our simulated decision engine is processing secure signals.</p></div></div>}
      {toast && <div className="fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-emerald-300/25 bg-emerald-400 px-5 py-4 text-slate-950 shadow-2xl"><div className="grid h-9 w-9 place-items-center rounded-full bg-white/40"><Check className="h-5 w-5" /></div><div><p className="font-bold">Funds queued for disbursement!</p><p className="text-xs font-medium opacity-80">e-Signature accepted in this prototype.</p></div></div>}
    </main>
  );
}

export default App;
