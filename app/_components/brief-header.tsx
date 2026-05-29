export function BriefHeader() {
  const today = new Date().toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">The Daily Brief</h1>
        <span className="text-sm text-gray-500">{today}</span>
      </div>
    </header>
  );
}
