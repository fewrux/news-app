import Link from "next/link";
import { BriefHeader } from "@/app/_components/brief-header";

export default function ArticleNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <BriefHeader />

      <main className="max-w-5xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold">Article not found</h1>
        <p className="text-gray-500">
          That story is not in today&apos;s Brief.
        </p>
        <Link
          href="/"
          className="inline-flex text-sm font-medium text-blue-700 hover:text-blue-900"
        >
          Back to the Brief
        </Link>
      </main>
    </div>
  );
}
