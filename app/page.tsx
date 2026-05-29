import Link from "next/link";
import { articles } from "@/lib/articles";
import { categoryColors } from "@/lib/categories";
import { BriefHeader } from "@/app/_components/brief-header";

export default function Home() {
  const [featured, ...rest] = articles;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <BriefHeader />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
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
            <h2 className="text-2xl font-bold leading-snug">
              <Link href={`/article/${featured.id}`} className="hover:text-gray-700">
                {featured.title}
              </Link>
            </h2>
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
              <h3 className="text-lg font-semibold leading-snug">
                <Link href={`/article/${article.id}`} className="hover:text-gray-700">
                  {article.title}
                </Link>
              </h3>
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
