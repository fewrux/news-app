import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleViewTracker } from "@/app/_components/article-view-tracker";
import { BriefHeader } from "@/app/_components/brief-header";
import { articles, getArticleById } from "@/lib/articles";
import { categoryColors } from "@/lib/categories";

type PageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return articles.map((article) => ({ id: String(article.id) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const article = getArticleById(Number(id));

  if (!article) {
    return { title: "Article not found · The Daily Brief" };
  }

  return {
    title: `${article.title} · The Daily Brief`,
    description: article.summary,
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { id } = await params;
  const article = getArticleById(Number(id));

  if (!article) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <ArticleViewTracker articleId={article.id} category={article.category} />
      <BriefHeader />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Link
          href="/"
          className="inline-flex text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          ← Back to the Brief
        </Link>

        <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <span
            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColors[article.category]}`}
          >
            {article.category}
          </span>
          <h1 className="text-3xl font-bold leading-snug">{article.title}</h1>
          <p className="text-gray-600 leading-relaxed text-lg">{article.summary}</p>
          <div className="flex items-center gap-3 text-xs text-gray-400 pt-1">
            <span>{article.author}</span>
            <span>·</span>
            <span>{article.date}</span>
            <span>·</span>
            <span>{article.readTime}</span>
          </div>
        </article>
      </main>

      <footer className="text-center text-xs text-gray-400 py-8">
        © 2026 The Daily Brief · All stories are fictional and for testing purposes only.
      </footer>
    </div>
  );
}
