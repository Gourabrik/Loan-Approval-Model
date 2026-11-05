import { useEffect, useState } from 'react';

const sampleApplication = {
  name: 'Demo Applicant',
  pan: 'ABCDE1234F',
  role: 'Software Engineer',
  age: 32,
  salary: 8000,
  amount: 35000,
  tenure: 48,
  existingEmi: 500,
  mitigation: 'none',
  coApplicantSalary: 0,
};

async function getError(response) {
  try {
    const body = await response.json();
    return typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail ?? body);
  } catch {
    return `Request failed (${response.status})`;
  }
}

export default function App() {
  const [api, setApi] = useState('checking');
  const [check, setCheck] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const checkHealth = async () => {
    setApi('checking');
    try {
      const response = await fetch('/health');
      if (!response.ok) throw new Error(`Health check failed (${response.status})`);
      setApi('online');
      setError('');
    } catch {
      setApi('offline');
      setError('Could not reach the API. Start the FastAPI server on port 8000.');
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const runCheck = async () => {
    setCheck('running');
    setResult(null);
    setError('');
    try {
      const response = await fetch('/api/v1/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleApplication),
      });
      if (!response.ok) throw new Error(await getError(response));
      setResult(await response.json());
      setCheck('passed');
      setApi('online');
    } catch (cause) {
      setCheck('failed');
      setError(cause.message || 'The sample prediction failed.');
      setApi('offline');
    }
  };

  return (
    <main className="page">
      <section className="panel">
        <div className="brand"><span className="brand-mark">N</span><span>Nexora</span></div>
        <p className="eyebrow">Local project status</p>
        <h1>Is everything working?</h1>
        <p className="intro">Check the frontend, API, prediction service, and database with one sample request.</p>

        <div className="status-row">
          <span className={`dot ${api}`} />
          <span>API</span>
          <strong className={`status-text ${api}`}>{api === 'checking' ? 'Checking…' : api === 'online' ? 'Online' : 'Offline'}</strong>
        </div>

        <button className="check-button" onClick={runCheck} disabled={check === 'running'}>
          {check === 'running' ? 'Running sample check…' : 'Run full project check'}
        </button>

        {check === 'passed' && result && (
          <div className="result success" role="status">
            <strong>Everything is working.</strong>
            <span>Prediction completed and saved. Decision: {result.decision} · Score: {result.credit_score} · Record: #{result.application_id}</span>
          </div>
        )}

        {(check === 'failed' || api === 'offline') && error && (
          <div className="result failure" role="alert">
            <strong>Check failed</strong>
            <span>{error}</span>
            {api === 'offline' && <code>uvicorn app.main:app --app-dir backend --reload --port 8000</code>}
          </div>
        )}

        <button className="refresh-button" onClick={checkHealth}>Refresh API status</button>
        <p className="footnote">Uses synthetic demo data. No real lending decision is made.</p>
      </section>
    </main>
  );
}
