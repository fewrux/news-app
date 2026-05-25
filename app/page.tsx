const articles = [
  {
    id: 1,
    category: "Technology",
    title: "AI Assistants Now Handle 40% of Customer Support Queries Globally",
    summary:
      "A new industry report shows that AI-powered chat tools have taken over nearly half of routine support interactions, cutting average resolution times by 60%.",
    author: "María González",
    date: "May 23, 2026",
    readTime: "3 min read",
  },
  {
    id: 2,
    category: "Science",
    title: "Scientists Discover New Deep-Sea Species Off the Coast of Chile",
    summary:
      "Researchers aboard the RV Atlantis documented over a dozen previously unknown organisms during a 30-day expedition to the South Pacific's unexplored trenches.",
    author: "James Okafor",
    date: "May 23, 2026",
    readTime: "4 min read",
  },
  {
    id: 3,
    category: "Business",
    title: "Global EV Sales Cross 20 Million Units for the First Time",
    summary:
      "Electric vehicle adoption accelerated sharply in Q1 2026, driven by falling battery costs and expanded charging infrastructure across Southeast Asia and Europe.",
    author: "Priya Nair",
    date: "May 22, 2026",
    readTime: "5 min read",
  },
  {
    id: 4,
    category: "Health",
    title: "WHO Recommends New Sleep Guidelines for Adults Over 50",
    summary:
      "Updated guidance from the World Health Organization suggests that adults over 50 benefit most from 7–9 hours of uninterrupted sleep and reduced blue-light exposure after 8 PM.",
    author: "Carlos Mendes",
    date: "May 22, 2026",
    readTime: "3 min read",
  },
  {
    id: 5,
    category: "World",
    title: "UN Climate Summit Ends with Historic Carbon Pricing Agreement",
    summary:
      "After two weeks of negotiations in Geneva, 87 nations signed a landmark accord establishing a minimum global carbon price of $50 per metric ton by 2030.",
    author: "Aisha Farooq",
    date: "May 21, 2026",
    readTime: "6 min read",
  },
];

const categoryColors: Record<string, string> = {
  Technology: "bg-blue-100 text-blue-700",
  Science: "bg-teal-100 text-teal-700",
  Business: "bg-amber-100 text-amber-700",
  Health: "bg-green-100 text-green-700",
  World: "bg-purple-100 text-purple-700",
};

export default function Home() {
  const [featured, ...rest] = articles;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">The Daily Brief</h1>
          <span className="text-sm text-gray-500">May 23, 2026</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* Featured story */}
        <section>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColors[featured.category]}`}
              >
                {featured.category}
              </span>
              <span className="text-xs text-gray-400">Featured</span>
            </div>
            <h2 className="text-2xl font-bold leading-snug">{featured.title}</h2>
            <p className="text-gray-600 leading-relaxed">{featured.summary}</p>
            <div className="flex items-center gap-3 text-xs text-gray-400 pt-1">
              <span>{featured.author}</span>
              <span>·</span>
              <span>{featured.date}</span>
              <span>·</span>
              <span>{featured.readTime}</span>
            </div>
          </div>
        </section>

        {/* Article list */}
        <section className="space-y-4">
          {rest.map((article) => (
            <div
              key={article.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-2 hover:shadow-md transition-shadow"
            >
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColors[article.category]}`}
              >
                {article.category}
              </span>
              <h3 className="text-lg font-semibold leading-snug">{article.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{article.summary}</p>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{article.author}</span>
                <span>·</span>
                <span>{article.date}</span>
                <span>·</span>
                <span>{article.readTime}</span>
              </div>
            </div>
          ))}
        </section>
      </main>

      <footer className="text-center text-xs text-gray-400 py-8">
        © 2026 The Daily Brief · All stories are fictional and for testing purposes only.
      </footer>
    </div>
  );
}
