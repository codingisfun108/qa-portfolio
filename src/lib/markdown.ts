import { Marked, type Tokens } from 'marked';

// Blog posts are written in Markdown in the admin panel. Raw HTML is shown as text and only
// http(s), mailto and same-site links are kept, so a post can never inject scripts.

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const safeHref = (href: string) => (/^(https?:|mailto:|\/|#)/i.test(href.trim()) ? href.trim() : '');

const marked = new Marked({ gfm: true });
marked.use({
  renderer: {
    html(token: Tokens.HTML | Tokens.Tag) {
      return escape(token.text);
    },
    link(token: Tokens.Link) {
      const text = this.parser.parseInline(token.tokens);
      const href = safeHref(token.href);
      if (!href) return text;
      const external = /^https?:/i.test(href);
      return `<a href="${escape(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}</a>`;
    },
    image(token: Tokens.Image) {
      const href = safeHref(token.href);
      return href ? `<img src="${escape(href)}" alt="${escape(token.text)}" loading="lazy" />` : '';
    },
  },
});

export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string;
}
