/**
 * Blocks paths that must never be public.
 *
 * Cloudflare Pages keeps files uploaded by earlier deployments in a
 * project-level asset store, so removing a file from the build does NOT
 * unpublish it — a deployment containing only index.html still served
 * package.json. Until the project is recreated, this middleware is what
 * actually keeps repo internals off the public site.
 */
const BLOCKED = [
  /^\/package(-lock)?\.json$/i,
  /^\/README\.md$/i,
  /^\/DESIGN\.md$/i,
  /^\/garden\.jpg$/i,
  /^\/img\.jpg$/i,
  /^\/\.gitignore$/i,
  /^\/tests\//i,
  /^\/tools\//i,
  /^\/\.github\//i,
  /^\/\.dns-backup\//i,
  /^\/node_modules\//i,
  /^\/\.wrangler\//i,
];

export async function onRequest(context) {
  const path = new URL(context.request.url).pathname;
  if (BLOCKED.some(re => re.test(path))) {
    return new Response('Not found', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
  return context.next();
}
