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

export function ContactCards({ email, phoneEncoded, linkedin, github, resumeUrl }: Props) {
  const [phone, setPhone] = useState<string | null>(null);
  const handle = (u: string, prefix: RegExp) => u.replace(prefix, '').replace(/\/$/, '');

  return (
    <ul className="contact-cards">
      {email && (
        <li className="ccard">
          <h3>Email</h3>
          <p className="cvalue" data-testid="email">
            {email}
          </p>
          <div className="cactions">
            <a className="btn primary small" href={`mailto:${email}`}>
              Send email
            </a>
            <CopyButton text={email} />
          </div>
        </li>
      )}
      {phoneEncoded && (
        <li className="ccard" data-testid="phone-card">
          <h3>Call</h3>
          <p className="cvalue">
            {phone ?? (
              <button className="reveal" type="button" onClick={() => setPhone(atob(phoneEncoded))}>
                Show number
              </button>
            )}
          </p>
          {phone && (
            <div className="cactions">
              <a className="btn primary small" href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
                Call now
              </a>
              <CopyButton text={phone} />
            </div>
          )}
        </li>
      )}
      {linkedin && (
        <li className="ccard">
          <h3>LinkedIn</h3>
          <p className="cvalue">{handle(linkedin, /^https?:\/\/(www\.)?linkedin\.com\//)}</p>
          <div className="cactions">
            <a className="btn primary small" href={linkedin} target="_blank" rel="noopener noreferrer">
              Open profile
            </a>
          </div>
        </li>
      )}
      {github && (
        <li className="ccard">
          <h3>GitHub</h3>
          <p className="cvalue">@{handle(github, /^https?:\/\/(www\.)?github\.com\//)}</p>
          <div className="cactions">
            <a className="btn primary small" href={github} target="_blank" rel="noopener noreferrer">
              Open GitHub
            </a>
          </div>
        </li>
      )}
      {resumeUrl && (
        <li className="ccard">
          <h3>Resume</h3>
          <p className="cvalue">Full work history, PDF</p>
          <div className="cactions">
            <a className="btn primary small" href={resumeUrl} download>
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
