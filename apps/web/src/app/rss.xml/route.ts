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

  for (const post of posts) {
    feed.addItem({
        title: post.title,
        id: `${SITE_INFO.url}/blog/${post.slug}`,
        link: `${SITE_INFO.url}/blog/${post.slug}`,
        description: post.description,
        author: post.authors.map((author) => ({
        name: post.name ?? 'OpenCut',
      })),
      date: new Date(post.publishedAt),
      image: post.coverImage,
    });
  });

  return new Response(feed.rss2(), {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}