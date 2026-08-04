// A plain Response, not msw's HttpResponse — HttpResponse's Set-Cookie handling
// registers with MSW's own internal cross-request cookie jar (tough-cookie-
// backed, no public reset API), which then leaks into every later request's
// Cookie header within a jsdom test environment. A plain Response still lets
// app code read the cookie back via response.headers.getSetCookie() (Bun
// doesn't enforce the forbidden-header restriction spec browsers apply),
// without registering with that jar. Use this for any mocked response that
// needs a Set-Cookie header.
export function jsonWithSetCookie(
  body: unknown,
  setCookie: string,
  init: { status?: number } = {},
) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': setCookie },
  });
}
