'use client';

import { useEffect, useRef, useState } from 'react';
import type { Content } from '@/lib/schema';

// Replays the release checks once when the panel scrolls into view. The server renders the
// finished state, so the panel reads correctly without JavaScript and in screenshots.
export function SignoffRun({ signoff }: { signoff: Content['signoff'] }) {
  const total = signoff.checks.length;
  const [passed, setPassed] = useState(total);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || total === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    setPassed(0);
    const timers: number[] = [];
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect();
        for (let i = 0; i < total; i++) timers.push(window.setTimeout(() => setPassed(i + 1), 350 + i * 380));
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [total]);

  const running = passed < total;
  return (
    <div ref={ref} className={`term${running ? ' is-running' : ''}`} data-testid="signoff">
      <div className="term-bar">
        <span className="term-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="term-file">{signoff.fileName}</span>
        <span className="term-status" data-status>
          {running ? 'Running' : 'Passed'}
        </span>
      </div>
      <div className="term-body">
        <p className="term-cmd">
          <span className="prompt" aria-hidden="true">
            $
          </span>
          {signoff.command}
        </p>
        <p className="term-dim">Running {total} checks</p>
        <ul className="term-lines">
          {signoff.checks.map((c, i) => (
            <li key={i} className={`term-line${i < passed ? ' is-pass' : ''}`}>
              <span className="mark" aria-hidden="true" />
              <span className="gate">{c.gate}</span>
              <span className="detail">{c.detail}</span>
            </li>
          ))}
        </ul>
        <p className="term-summary">
          <span className="count" data-count>
            {passed}/{total}
          </span>
          <span className="term-result">{signoff.resultText}</span>
        </p>
      </div>
    </div>
  );
}
