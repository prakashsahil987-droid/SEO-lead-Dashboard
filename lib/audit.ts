import {z} from 'zod';
import {isIP} from 'node:net';

export type AuditFinding = {
  label: string;
  status: 'pass' | 'warning' | 'fail';
  detail: string;
};

export type WebsiteAudit = {
  url: string;
  fetchedAt: string;
  score: number;
  findings: AuditFinding[];
};

const urlSchema = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === 'http:' || url.protocol === 'https:';
}, 'Only HTTP(S) websites can be audited');

function textFromHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function firstMatch(html: string, expression: RegExp): string | null {
  return html.match(expression)?.[1]?.trim() || null;
}

function hasTag(html: string, expression: RegExp): boolean {
  return expression.test(html);
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  if (isIP(host) !== 4) return host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:');
  const octets = host.split('.').map(Number);
  return octets[0] === 10
    || octets[0] === 127
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168)
    || (octets[0] === 169 && octets[1] === 254);
}

function auditHtml(url: string, html: string): WebsiteAudit {
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = firstMatch(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i,
  );
  const h1Count = (html.match(/<h1(?:\s[^>]*)?>/gi) || []).length;
  const canonical = hasTag(html, /<link[^>]+rel=["'][^"']*canonical[^"']*["'][^>]*>/i);
  const noindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);
  const bodyText = textFromHtml(firstMatch(html, /<body[^>]*>([\s\S]*?)<\/body>/i) || html);
  const hasBlogSignal = /\/(blog|news|articles?)\b/i.test(html);
  const findings: AuditFinding[] = [
    title
      ? {label: 'Page title', status: title.length >= 20 && title.length <= 65 ? 'pass' : 'warning', detail: `${title.length} characters found.`}
      : {label: 'Page title', status: 'fail', detail: 'No HTML title was found.'},
    description
      ? {label: 'Meta description', status: description.length >= 70 && description.length <= 160 ? 'pass' : 'warning', detail: `${description.length} characters found.`}
      : {label: 'Meta description', status: 'fail', detail: 'No meta description was found.'},
    h1Count === 1
      ? {label: 'Primary heading', status: 'pass', detail: 'Exactly one H1 was found.'}
      : {label: 'Primary heading', status: 'warning', detail: `${h1Count} H1 headings were found.`},
    canonical
      ? {label: 'Canonical URL', status: 'pass', detail: 'A canonical link was found.'}
      : {label: 'Canonical URL', status: 'warning', detail: 'No canonical link was found.'},
    noindex
      ? {label: 'Indexability', status: 'fail', detail: 'The page contains a noindex directive.'}
      : {label: 'Indexability', status: 'pass', detail: 'No page-level noindex directive was found.'},
    bodyText.length >= 300
      ? {label: 'Content depth', status: 'pass', detail: `${bodyText.length} visible characters found.`}
      : {label: 'Content depth', status: 'warning', detail: 'The page has limited visible text.'},
    hasBlogSignal
      ? {label: 'Content section', status: 'pass', detail: 'A blog, news, or article section was detected.'}
      : {label: 'Content section', status: 'warning', detail: 'No blog or content section was detected in the HTML.'},
  ];
  const points = findings.reduce((total, finding) => total + (finding.status === 'pass' ? 15 : finding.status === 'warning' ? 8 : 0), 0);
  return {url, fetchedAt: new Date().toISOString(), score: Math.round((points / (findings.length * 15)) * 100), findings};
}

export async function auditWebsite(input: string): Promise<WebsiteAudit> {
  const url = urlSchema.parse(input);
  if (isPrivateHost(new URL(url).hostname)) throw new Error('Private or local website addresses cannot be audited');
  const response = await fetch(url, {
    headers: {'User-Agent': 'SEO-Lead-Intelligence/0.1 (+personal audit tool)'},
    redirect: 'follow',
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Website returned HTTP ${response.status}`);
  if (isPrivateHost(new URL(response.url).hostname)) throw new Error('Redirected to a private or local website address');
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) throw new Error('Website did not return an HTML document');
  const html = (await response.text()).slice(0, 1_500_000);
  return auditHtml(url, html);
}
