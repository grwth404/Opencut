import { Feed } from 'feed';
import { getPosts } from '@/lib/blog-query';
import { SITE_INFO } from '../metadata';

export async function GET() {
  const { posts } = await getPosts();
  
  const feed = new Feed({
    title: 'OpenCut Blog',
    description: SITE_INFO.description,
    id: `${SITE_INFO.url}`,
    link: `${SITE_INFO.url}/blog/`,
    language: 'en',
    image: `${SITE_INFO.openGraphImage}`,
    favicon: `${SITE_INFO.favicon}`,
    copyright: `All rights reserved ${new Date().getFullYear()}, ${
      SITE_INFO.title
    }`,
  });

  posts.forEach((article) => {
    feed.addItem({
      title: article.title,
      id: `${SITE_INFO.url}/blog/${article.slug}`,
      link: `${SITE_INFO.url}/blog/${article.slug}`,
      description: article.description,
      author: article.authors.map((author) => ({
        name: author.name ?? 'OpenCut',
      })),
      date: new Date(article.publishedAt),
      image: article.coverImage,
    });
  });

  return new Response(feed.rss2(), {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}