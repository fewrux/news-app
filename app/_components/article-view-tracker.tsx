"use client";

import { useEffect } from "react";
import { getPostHog } from "@/lib/posthog/client";

type ArticleViewTrackerProps = {
  articleId: number;
  category: string;
};

export function ArticleViewTracker({ articleId, category }: ArticleViewTrackerProps) {
  useEffect(() => {
    getPostHog()?.capture("article_viewed", {
      article_id: articleId,
      category,
    });
  }, [articleId, category]);

  return null;
}
