export type Article = {
  id: number;
  category: string;
  title: string;
  summary: string;
  author: string;
  date: string;
  readTime: string;
};

export const articles: Article[] = [
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

export function getArticleById(id: number): Article | undefined {
  return articles.find((article) => article.id === id);
}
