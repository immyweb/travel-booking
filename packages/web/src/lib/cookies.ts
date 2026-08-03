import { cookies } from 'next/headers';

type ParsedSetCookie = {
  name: string;
  value: string;
  options: {
    path?: string;
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
  };
};

function parseSetCookie(raw: string): ParsedSetCookie {
  const [pair, ...attributes] = raw.split(';').map((part) => part.trim());
  const separatorIndex = pair!.indexOf('=');
  const name = pair!.slice(0, separatorIndex);
  const value = pair!.slice(separatorIndex + 1);

  const options: ParsedSetCookie['options'] = {};
  for (const attribute of attributes) {
    const [rawKey, rawValue] = attribute.split('=');
    switch (rawKey!.toLowerCase()) {
      case 'path':
        options.path = rawValue;
        break;
      case 'max-age':
        options.maxAge = Number(rawValue);
        break;
      case 'httponly':
        options.httpOnly = true;
        break;
      case 'secure':
        options.secure = true;
        break;
      case 'samesite':
        options.sameSite = rawValue!.toLowerCase() as 'lax' | 'strict' | 'none';
        break;
    }
  }

  return { name, value, options };
}

// Better Auth's session cookie(s) (there can be more than one — sign-out
// clears three at once) arrive as raw Set-Cookie headers on the fetch
// Response, which cookies().set() can't take directly; each is parsed and
// re-set individually onto Next's own outgoing response.
export async function forwardSetCookies(response: Response): Promise<void> {
  const store = await cookies();
  for (const raw of response.headers.getSetCookie()) {
    const { name, value, options } = parseSetCookie(raw);
    store.set(name, value, options);
  }
}

export async function currentCookieHeader(): Promise<string> {
  const store = await cookies();
  return store
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
}
