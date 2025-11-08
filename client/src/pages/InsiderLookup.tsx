import { FormEvent, useMemo, useState } from "react";

const TICKER_REGEX = /^[A-Z]{1,5}(\.[A-Z0-9]{1,4})?$/;

type InsiderResponse = {
  ticker: string;
  cik: string;
  summary: {
    totalBuyShares: number;
    totalSellShares: number;
    netShares: number;
  };
  transactions: Array<{
    date: string | null;
    insider: string;
    formType: string;
    transactionCode?: string;
    type: "buy" | "sell" | "other";
    shares: number;
    price?: number | null;
    securityTitle?: string;
    source: string;
    note?: string;
  }>;
};

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatShares(value: number) {
  return numberFormatter.format(value);
}

function formatCurrency(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return currencyFormatter.format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}

export function InsiderLookup() {
  const [ticker, setTicker] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsiderResponse | null>(null);

  const summaryLabel = useMemo(() => {
    if (!result) {
      return "";
    }
    const { netShares, totalBuyShares, totalSellShares } = result.summary;
    const direction = netShares > 0 ? "net buying" : netShares < 0 ? "net selling" : "neutral activity";
    return `Net insider activity: ${formatShares(netShares)} shares (${direction}; buys ${formatShares(
      totalBuyShares
    )}, sells ${formatShares(totalSellShares)})`;
  }, [result]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    const trimmed = ticker.trim().toUpperCase();
    if (!trimmed || !TICKER_REGEX.test(trimmed)) {
      setError("Please enter a valid U.S. ticker (e.g. AAPL, BRK.B).");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/insiders?ticker=${encodeURIComponent(trimmed)}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Lookup failed with status ${response.status}.`);
      }
      const payload = (await response.json()) as InsiderResponse;
      setResult(payload);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unexpected error while loading data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Insider Transactions Lookup</h1>
        <p>Enter a U.S. stock ticker to view the latest Form 3/4/5 insider activity from the SEC.</p>
      </header>

      <form className="lookup-form" onSubmit={handleSubmit}>
        <label htmlFor="ticker">Ticker</label>
        <div className="input-row">
          <input
            id="ticker"
            name="ticker"
            value={ticker}
            onChange={(event) => setTicker(event.target.value.toUpperCase())}
            placeholder="AAPL"
            maxLength={9}
            aria-describedby="ticker-help"
            autoComplete="off"
          />
          <button type="submit" disabled={loading}>
            {loading ? "Loading..." : "Lookup"}
          </button>
        </div>
        <small id="ticker-help">Allowed format: 1-5 letters with optional .class (e.g. BRK.B).</small>
      </form>

      {error && <div className="alert error">{error}</div>}

      {result && (
        <section className="results">
          <div className="summary">
            <h2>
              {result.ticker} · CIK {result.cik}
            </h2>
            <p>{summaryLabel}</p>
          </div>

          {result.transactions.length === 0 ? (
            <div className="alert neutral">No recent insider transactions were found.</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Insider</th>
                    <th>Form</th>
                    <th>Type</th>
                    <th>Shares</th>
                    <th>Price</th>
                    <th>Security</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {result.transactions.map((tx, index) => (
                    <tr key={`${tx.source}-${index}`}>
                      <td>{formatDate(tx.date)}</td>
                      <td>{tx.insider}</td>
                      <td>{tx.formType}</td>
                      <td className={`tx-type ${tx.type}`}>{tx.type}</td>
                      <td>{formatShares(tx.shares)}</td>
                      <td>{formatCurrency(tx.price)}</td>
                      <td>{tx.securityTitle ?? "—"}</td>
                      <td>
                        <a href={tx.source} target="_blank" rel="noreferrer">
                          Filing
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
