'use client';

import { useState } from 'react';

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [state, setState] = useState(label);
  return (
    <button
      className="btn small"
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState('Copied');
        } catch {
          setState('Select and copy');
        }
        setTimeout(() => setState(label), 1800);
      }}
    >
      {state}
    </button>
  );
}

type Props = {
  email: string;
  phoneEncoded: string; // base64, so scrapers can't read the number from the HTML
  linkedin: string;
  github: string;
  resumeUrl: string;
};

// Simple line icons, drawn inline so they take the text colour and need no image requests.
const ICONS = {
  email: 'M3 6.5h18v11H3zM3.5 7l8.5 6.5L20.5 7',
  phone: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
  linkedin: 'M4 4h16v16H4zM8 10.5V16M8 7.8v.2M12 16v-3.2a2 2 0 0 1 4 0V16M12 10.5V16',
  github: 'M9 8l-4 4 4 4M15 8l4 4-4 4M13.5 6l-3 12',
  resume: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5',
} as const;

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <span className="cicon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d={ICONS[name]} />
      </svg>
    </span>
  );
}

export function ContactCards({ email, phoneEncoded, linkedin, github, resumeUrl }: Props) {
  const [phone, setPhone] = useState<string | null>(null);
  const handle = (u: string, prefix: RegExp) => u.replace(prefix, '').replace(/\/$/, '');

  return (
    <ul className="contact-cards">
      {email && (
        <li className="ccard">
          <Icon name="email" />
          <div className="ctext">
            <h3>Email</h3>
            <p className="cvalue" data-testid="email">
              {email}
            </p>
          </div>
          <div className="cactions">
            <a className="btn small" href={`mailto:${email}`}>
              Send email
            </a>
            <CopyButton text={email} />
          </div>
        </li>
      )}
      {phoneEncoded && (
        <li className="ccard" data-testid="phone-card">
          <Icon name="phone" />
          <div className="ctext">
            <h3>Phone</h3>
            <p className="cvalue">{phone ?? 'Hidden until you ask'}</p>
          </div>
          <div className="cactions">
            {phone ? (
              <>
                <a className="btn small" href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
                  Call now
                </a>
                <CopyButton text={phone} />
              </>
            ) : (
              <button className="btn small" type="button" onClick={() => setPhone(atob(phoneEncoded))}>
                Show number
              </button>
            )}
          </div>
        </li>
      )}
      {linkedin && (
        <li className="ccard">
          <Icon name="linkedin" />
          <div className="ctext">
            <h3>LinkedIn</h3>
            <p className="cvalue">{handle(linkedin, /^https?:\/\/(www\.)?linkedin\.com\//)}</p>
          </div>
          <div className="cactions">
            <a className="btn small" href={linkedin} target="_blank" rel="noopener noreferrer">
              Open profile
            </a>
          </div>
        </li>
      )}
      {github && (
        <li className="ccard">
          <Icon name="github" />
          <div className="ctext">
            <h3>GitHub</h3>
            <p className="cvalue">@{handle(github, /^https?:\/\/(www\.)?github\.com\//)}</p>
          </div>
          <div className="cactions">
            <a className="btn small" href={github} target="_blank" rel="noopener noreferrer">
              Open GitHub
            </a>
          </div>
        </li>
      )}
      {resumeUrl && (
        <li className="ccard">
          <Icon name="resume" />
          <div className="ctext">
            <h3>Resume</h3>
            <p className="cvalue">Full work history, PDF</p>
          </div>
          <div className="cactions">
            <a className="btn small" href={resumeUrl} download>
              Download PDF
            </a>
            <a className="btn small" href={resumeUrl} target="_blank" rel="noopener noreferrer">
              View online
            </a>
          </div>
        </li>
      )}
    </ul>
  );
}
