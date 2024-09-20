// pages/index.js
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Link from 'next/link';

export default function Home({ posts }) {
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">我的博客</h1>
      <ul className="space-y-4">
        {posts.map((post) => (
          <li key={post.slug} className="border p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
            <Link href={`/posts/${post.slug}`} legacyBehavior>
              <a className="text-2xl font-semibold text-blue-600">{post.title}</a>
            </Link>
            <p className="text-gray-500">{post.date}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function getStaticProps() {
  const files = fs.readdirSync(path.join('posts'));

  const posts = files.map((filename) => {
    const markdownWithMeta = fs.readFileSync(
      path.join('posts', filename),
      'utf-8'
    );
    const { data } = matter(markdownWithMeta);

    return {
      title: data.title,
      date: data.date,
      slug: filename.replace('.md', ''),
    };
  });

  return {
    props: {
      posts,
    },
  };
}