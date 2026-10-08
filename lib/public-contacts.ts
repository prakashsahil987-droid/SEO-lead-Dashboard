import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {ContactPoint, PublicContacts, SocialProfile} from './types';

const MAX_HTML_BYTES = 1_500_000;
const MAX_CONTACT_PAGES = 4;
const MAX_REDIRECTS = 3;
const SOCIAL_HOSTS: Record<string, string> = {
  'facebook.com': 'Facebook',
  'instagram.com': 'Instagram',
  'linkedin.com': 'LinkedIn',
  'x.com': 'X',
  'twitter.com': 'X',
  'tiktok.com': 'TikTok',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'pinterest.com': 'Pinterest',
  'threads.net': 'Threads',
  'snapchat.com': 'Snapchat',
  'whatsapp.com': 'WhatsApp',
  't.me': 'Telegram',
};

function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
      || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19))
      || (a === 198 && b === 51) || (a === 203 && b === 0)
      || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (version === 6) {
    const host = address.toLowerCase();
    if (host.startsWith('::ffff:')) return isPrivateAddress(host.slice(7));
    return host === '::' || host === '::1' || host.startsWith('fc') || host.startsWith('fd')
      || host.startsWith('fe8') || host.startsWith('fe9') || host.startsWith('fea')
      || host.startsWith('feb') || host.startsWith('ff');
  }
  return true;
}

async function validatePublicUrl(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('The business website is not a valid URL');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Only public HTTP(S) websites can be checked');
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new Error('Private or local website addresses cannot be checked');
  }
  const literal = isIP(hostname);
  if (literal && isPrivateAddress(hostname)) throw new Error('Private or local website addresses cannot be checked');
  if (!literal) {
    let addresses: {address: string; family: number}[];
    try {
      addresses = await lookup(hostname, {all: true, verbatim: true});
    } catch {
      throw new Error('Could not resolve the business website');
    }
    if (!addresses.length || addresses.some(({address}) => isPrivateAddress(address))) {
      throw new Error('Private or local website addresses cannot be checked');
    }
  }
  url.hash = '';
  return url;
}

async function readLimitedBody(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > MAX_HTML_BYTES) throw new Error('The website page is too large to check');
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error('The website page is too large to check');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function fetchHtml(input: string): Promise<{url: URL; html: string}> {
  let url = await validatePublicUrl(input);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'SEO-Lead-Intelligence/0.1 (public business contact discovery)',
      },
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || redirects === MAX_REDIRECTS) throw new Error('The website redirected too many times');
      url = await validatePublicUrl(new URL(location, url).href);
      continue;
    }
    if (!response.ok) throw new Error(`Website returned HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      throw new Error('Website did not return an HTML document');
    }
    return {url, html: await readLimitedBody(response)};
  }
  throw new Error('The website redirected too many times');
}

function decodeEntities(value: string): string {
  return value.replace(/&(?:amp|quot|apos|lt|gt);|&#(?:x([0-9a-f]+)|(\d+));/gi, (entity, hex: string, decimal: string) => {
    if (entity === '&amp;') return '&';
    if (entity === '&quot;') return '"';
    if (entity === '&apos;') return "'";
    if (entity === '&lt;') return '<';
    if (entity === '&gt;') return '>';
    const codePoint = parseInt(hex || decimal, hex ? 16 : 10);
    return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : entity;
  });
}

function plainText(html: string): string {
  return decodeEntities(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ');
}

function attribute(tag: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? decodeEntities(match[1] || match[2] || match[3] || '') : null;
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const found = new Set<string>();
  return items.filter(item => {
    const value = key(item).toLowerCase();
    if (found.has(value)) return false;
    found.add(value);
    return true;
  });
}

function extractContacts(html: string, source: string): {emails: ContactPoint[]; phones: ContactPoint[]; socials: SocialProfile[]} {
  const emails: ContactPoint[] = [];
  const phones: ContactPoint[] = [];
  const socials: SocialProfile[] = [];
  const addEmails = (value: string) => {
    for (const match of value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []) {
      emails.push({value: match.replace(/[.,;:]+$/, ''), source});
    }
  };
  const addPhone = (value: string) => {
    const normalized = value.replace(/^tel:/i, '').split(/[;,]/)[0].trim();
    const digits = normalized.replace(/\D/g, '');
    if (digits.length >= 7 && digits.length <= 15) phones.push({value: normalized, source});
  };
  const anchors = [...html.matchAll(/<a\b[^>]*>/gi)].map(match => match[0]);
  for (const tag of anchors) {
    const href = attribute(tag, 'href');
    if (!href) continue;
    if (/^mailto:/i.test(href)) {
      const address = href.slice(7).split('?')[0];
      try {
        addEmails(decodeURIComponent(address));
      } catch {
        addEmails(address);
      }
    }
    if (/^tel:/i.test(href)) addPhone(href.slice(4));
    if (!/^https?:\/\//i.test(href) && !href.startsWith('//')) continue;
    try {
      const profile = new URL(href.startsWith('//') ? `https:${href}` : href);
      const host = profile.hostname.toLowerCase().replace(/^www\./, '');
      const platform = Object.entries(SOCIAL_HOSTS).find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1];
      if (platform && profile.pathname !== '/' && !/\/(share|intent|login|privacy|terms)(\/|$)/i.test(profile.pathname)) {
        profile.search = '';
        profile.hash = '';
        socials.push({platform, url: profile.href.replace(/\/$/, ''), source});
      }
    } catch {
      continue;
    }
  }

  const text = plainText(html);
  addEmails(text);
  for (const match of text.match(/(?:\+?\d[\d().\s-]{5,}\d)/g) || []) addPhone(match);

  return {
    emails: uniqueBy(emails, item => item.value).slice(0, 20),
    phones: uniqueBy(phones, item => item.value.replace(/\D/g, '')).slice(0, 20),
    socials: uniqueBy(socials, item => `${item.platform}:${item.url}`).slice(0, 30),
  };
}

function contactPageScore(label: string, href: string): number {
  const value = `${label} ${href}`.toLowerCase();
  if (/contact|get-in-touch|reach-us/.test(value)) return 3;
  if (/about|team|staff|location|connect/.test(value)) return 2;
  return 0;
}

function contactPageUrls(html: string, base: URL): URL[] {
  const candidates = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a\s*>/gi)]
    .map(match => {
      const openTag = match[0].match(/^<a\b[^>]*>/i)?.[0] || '';
      const href = attribute(openTag, 'href');
      if (!href || /^(?:mailto:|tel:|javascript:|#)/i.test(href)) return null;
      try {
        const url = new URL(href, base);
        if (url.origin !== base.origin || !/^https?:$/.test(url.protocol)) return null;
        url.hash = '';
        const score = contactPageScore(plainText(match[0].slice(openTag.length)), `${url.pathname} ${url.search}`);
        return score ? {url, score} : null;
      } catch {
        return null;
      }
    })
    .filter((item): item is {url: URL; score: number} => item !== null)
    .sort((a, b) => b.score - a.score);
  return uniqueBy(candidates, item => item.url.href).slice(0, MAX_CONTACT_PAGES).map(item => item.url);
}

export async function findPublicContacts(website: string): Promise<PublicContacts> {
  const homepage = await fetchHtml(website);
  const contactUrls = contactPageUrls(homepage.html, homepage.url);
  const contactPages = await Promise.all(contactUrls.map(async url => {
    try {
      return {page: await fetchHtml(url.href), warning: null};
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Page could not be checked';
      return {page: null, warning: `${url.pathname}: ${message}`};
    }
  }));
  const pages = [homepage, ...contactPages.flatMap(result => result.page ? [result.page] : [])];
  const extracted = pages.map(page => extractContacts(page.html, page.url.href));
  return {
    emails: uniqueBy(extracted.flatMap(page => page.emails), item => item.value).slice(0, 20),
    phones: uniqueBy(extracted.flatMap(page => page.phones), item => item.value.replace(/\D/g, '')).slice(0, 20),
    socials: uniqueBy(extracted.flatMap(page => page.socials), item => `${item.platform}:${item.url}`).slice(0, 30),
    warnings: contactPages.flatMap(result => result.warning ? [result.warning] : []),
    checkedAt: new Date().toISOString(),
  };
}
