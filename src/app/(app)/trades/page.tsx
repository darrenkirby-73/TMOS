export default function TradesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trades</h1>
        <p className="mt-1 text-sm text-muted">
          Manually entered trades with R-multiples suggested from entry, stop,
          and exit — always editable, never overwritten.
        </p>
      </div>
      <div className="card p-10 text-center text-sm text-muted">
        Trade entry and the trade log are coming in the next build-out. The{" "}
        <code>trades</code> and <code>tags</code> tables are already in place.
      </div>
    </div>
  );
}
