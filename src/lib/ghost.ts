// Ghost Content API client

const GHOST_URL = import.meta.env.GHOST_URL;
const GHOST_KEY = import.meta.env.GHOST_CONTENT_API_KEY;

export interface GhostPost {
  id: string;
  uuid: string;
  title: string;
  slug: string;
  html: string;
  excerpt: string;
  feature_image: string | null;
  featured: boolean;
  visibility: 'public' | 'members' | 'paid';
  created_at: string;
  updated_at: string;
  published_at: string;
  custom_excerpt: string | null;
  reading_time: number;
  primary_author?: GhostAuthor;
  authors?: GhostAuthor[];
  primary_tag?: GhostTag;
  tags?: GhostTag[];
}

export interface GhostAuthor {
  id: string;
  name: string;
  slug: string;
  profile_image: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
}

export interface GhostTag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  feature_image: string | null;
}

export interface GhostPagination {
  page: number;
  limit: number;
  pages: number;
  total: number;
  next: number | null;
  prev: number | null;
}

interface GhostResponse<T> {
  posts?: T[];
  tags?: T[];
  authors?: T[];
  meta: {
    pagination: GhostPagination;
  };
}

async function ghostFetch<T>(
  resource: string,
  params: Record<string, string> = {}
): Promise<GhostResponse<T>> {
  const url = new URL(`${GHOST_URL}/ghost/api/content/${resource}/`);
  url.searchParams.set('key', GHOST_KEY);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString());

  if (!res.ok) {
    throw new Error(`Ghost API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function getPosts(options: {
  limit?: number;
  page?: number;
  filter?: string;
  include?: string;
} = {}): Promise<{ posts: GhostPost[]; pagination: GhostPagination }> {
  const params: Record<string, string> = {
    limit: String(options.limit || 15),
    page: String(options.page || 1),
    include: options.include || 'authors,tags',
  };

  if (options.filter) {
    params.filter = options.filter;
  }

  const response = await ghostFetch<GhostPost>('posts', params);

  return {
    posts: response.posts || [],
    pagination: response.meta.pagination,
  };
}

export async function getFeaturedPost(): Promise<GhostPost | null> {
  const { posts } = await getPosts({
    limit: 1,
    filter: 'featured:true',
    include: 'authors,tags',
  });

  return posts[0] || null;
}

export async function getPostBySlug(slug: string): Promise<GhostPost | null> {
  const params: Record<string, string> = {
    include: 'authors,tags',
  };

  try {
    const url = new URL(`${GHOST_URL}/ghost/api/content/posts/slug/${slug}/`);
    url.searchParams.set('key', GHOST_KEY);
    url.searchParams.set('include', 'authors,tags');

    const res = await fetch(url.toString());

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.posts?.[0] || null;
  } catch {
    return null;
  }
}

export async function getAllPosts(): Promise<GhostPost[]> {
  const allPosts: GhostPost[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { posts, pagination } = await getPosts({ page, limit: 100 });
    allPosts.push(...posts);
    hasMore = pagination.next !== null;
    page++;
  }

  return allPosts;
}

export async function getTags(): Promise<GhostTag[]> {
  const response = await ghostFetch<GhostTag>('tags', {
    limit: 'all',
  });

  return response.tags || [];
}

export async function getTagBySlug(slug: string): Promise<GhostTag | null> {
  try {
    const url = new URL(`${GHOST_URL}/ghost/api/content/tags/slug/${slug}/`);
    url.searchParams.set('key', GHOST_KEY);

    const res = await fetch(url.toString());

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.tags?.[0] || null;
  } catch {
    return null;
  }
}

export async function getPostsByTag(
  tagSlug: string,
  options: { limit?: number; page?: number } = {}
): Promise<{ posts: GhostPost[]; pagination: GhostPagination }> {
  return getPosts({
    ...options,
    filter: `tag:${tagSlug}`,
  });
}

export async function getAuthors(): Promise<GhostAuthor[]> {
  const response = await ghostFetch<GhostAuthor>('authors', {
    limit: 'all',
  });

  return response.authors || [];
}

export async function getAuthorBySlug(slug: string): Promise<GhostAuthor | null> {
  try {
    const url = new URL(`${GHOST_URL}/ghost/api/content/authors/slug/${slug}/`);
    url.searchParams.set('key', GHOST_KEY);

    const res = await fetch(url.toString());

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.authors?.[0] || null;
  } catch {
    return null;
  }
}

export async function getPostsByAuthor(
  authorSlug: string,
  options: { limit?: number; page?: number } = {}
): Promise<{ posts: GhostPost[]; pagination: GhostPagination }> {
  return getPosts({
    ...options,
    filter: `author:${authorSlug}`,
  });
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
