import 'server-only';

import { strapiFetch, strapiFetchOrNull, strapiQuery } from '@/lib/strapi';
import type { BlogPost, Course, StrapiListResponse, StrapiSingleResponse } from '@/lib/types';

/**
 * Reads for the public surface.
 *
 * Every call here passes `auth: false` on purpose. Without a token Strapi answers as the
 * Public role, which can only see published courses and published blog posts. Two
 * consequences follow:
 *
 *   1. A signed-in content manager browsing the catalog sees exactly what a visitor sees.
 *      Their unpublished drafts live in the authoring area, not mixed into the storefront.
 *   2. The responses are identical for everyone, so they can be cached and revalidated
 *      instead of being rebuilt per request.
 */

const PUBLIC_REVALIDATE_SECONDS = 60;

export async function getPublishedCourses(): Promise<Course[]> {
  // No `populate` for the instructor or lesson counts: the controller attaches both
  // server-side, because the content API strips relations the Public role cannot read.
  const query = strapiQuery({
    sort: ['createdAt:desc'],
    pagination: { pageSize: 60 },
  });

  const response = await strapiFetch<StrapiListResponse<Course>>(`/courses${query}`, {
    auth: false,
    revalidate: PUBLIC_REVALIDATE_SECONDS,
    tags: ['courses'],
  });

  return response.data ?? [];
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  // A dedicated route rather than a filtered list query, so the detail page is one request
  // and the response carries the syllabus the list endpoint deliberately omits.
  const response = await strapiFetchOrNull<StrapiSingleResponse<Course>>(
    `/courses/slug/${encodeURIComponent(slug)}`,
    {
      auth: false,
      revalidate: PUBLIC_REVALIDATE_SECONDS,
      tags: ['courses', `course:${slug}`],
    }
  );

  return response?.data ?? null;
}

export async function getPublishedPosts(): Promise<BlogPost[]> {
  const query = strapiQuery({
    populate: { author: { fields: ['id', 'username'] } },
    sort: ['publishedAt:desc'],
    pagination: { pageSize: 40 },
  });

  const response = await strapiFetch<StrapiListResponse<BlogPost>>(`/blog-posts${query}`, {
    auth: false,
    revalidate: PUBLIC_REVALIDATE_SECONDS,
    tags: ['blog'],
  });

  return response.data ?? [];
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const query = strapiQuery({
    filters: { slug: { $eq: slug } },
    populate: { author: { fields: ['id', 'username'] } },
  });

  const response = await strapiFetch<StrapiListResponse<BlogPost>>(`/blog-posts${query}`, {
    auth: false,
    revalidate: PUBLIC_REVALIDATE_SECONDS,
    tags: ['blog', `post:${slug}`],
  });

  return response.data?.[0] ?? null;
}

/** Counts for the landing page. Cheap because the catalog is already being fetched. */
export function summariseCatalog(courses: Course[]) {
  const lessonCount = courses.reduce((total, course) => total + (course.lessonCount ?? 0), 0);

  return {
    courseCount: courses.length,
    lessonCount,
    instructorCount: new Set(courses.map((course) => course.instructor?.id).filter(Boolean)).size,
  };
}
