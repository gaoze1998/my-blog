// pages/_app.js
import Link from 'next/link';
import '../styles/globals.css';
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>高泽的博客</title>
      </Head>
      <header className="bg-gray-800 text-white p-4">
        <nav className="max-w-2xl mx-auto">
          <Link href="/" legacyBehavior>
            <a className="text-xl font-bold">博客首页</a>
          </Link>
        </nav>
      </header>
      <Component {...pageProps} />
      <footer className="bg-gray-800 text-white p-4 text-center">
        <p>© 2024 Ze Gao - 版权所有</p>
      </footer>
    </>
  );
}

export default MyApp;