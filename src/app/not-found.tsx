import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main" className="wrap article">
      <p className="article-meta">404</p>
      <h1>This page doesn&apos;t exist.</h1>
      <p className="intro" style={{ marginTop: 12 }}>
        The link may be old, or the post was unpublished.
      </p>
      <p style={{ marginTop: 24 }}>
        <Link className="btn primary" href="/">
          Go to the homepage
        </Link>
      </p>
    </main>
  );
}
