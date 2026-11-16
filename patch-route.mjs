import fs from 'node:fs';
const file = 'src/app/api/media/route.ts';
let s = fs.readFileSync(file, 'utf8');
if (s.includes('SERVICE_BUSY')) { console.log('Already updated. Nothing to do.'); process.exit(0); }
const crlf = s.includes('\r\n');
s = s.replace(/\r\n/g, '\n');
const edits = [
 [
  "        { suffix: 'wide cinematic finale shot', caption: 'Scene 4 - Cinematic Finale' },\n",
  ""
 ],
 [
  "// --------------------------------------------------\n// API ENDPOINT\n// --------------------------------------------------\n",
  "// --------------------------------------------------\n// SERVER-SIDE SAFETY LIMITS (protects your Cloudflare quota)\n// Kept in memory: works on a single running server and resets when it\n// restarts. For real enforcement later, store this in a database.\n// --------------------------------------------------\n\nconst IP_DAILY_POINTS = 12;      // per IP per day (page limit is 6 per browser)\nconst GLOBAL_DAILY_POINTS = 150; // whole app per day, a hard stop for your costs\n\nconst usage = new Map<string, number>();\nlet globalDay = '';\nlet globalPoints = 0;\n\nfunction checkAndCount(ip: string, cost: number): string | null {\n  const day = new Date().toISOString().slice(0, 10);\n\n  if (day !== globalDay) {\n    globalDay = day;\n    globalPoints = 0;\n    usage.clear();\n  }\n\n  if (globalPoints + cost > GLOBAL_DAILY_POINTS) {\n    return 'We have reached today\\'s free limit. Please come back tomorrow.';\n  }\n\n  const used = usage.get(ip) || 0;\n  if (used + cost > IP_DAILY_POINTS) {\n    return 'You have used all your free tries for today. Please come back tomorrow.';\n  }\n\n  usage.set(ip, used + cost);\n  globalPoints += cost;\n  return null;\n}\n\n// --------------------------------------------------\n// API ENDPOINT\n// --------------------------------------------------\n"
 ],
 [
  "    // Understand the request ONCE (not once per video frame).\n",
  "    const forwarded = req.headers.get('x-forwarded-for') || '';\n    const ip = forwarded.split(',')[0].trim() || 'local';\n    const limitMessage = checkAndCount(ip, type === 'video' ? 3 : 1);\n\n    if (limitMessage) {\n      return errorResponse(limitMessage, 429, 'DAILY_LIMIT');\n    }\n\n    // Understand the request ONCE (not once per video frame).\n"
 ],
 [
  "    return errorResponse(\n      timeout\n        ? 'AI generation timed out. Please try again.'\n        : safeErrorMessage(error),\n      timeout ? 504 : 502,\n      timeout ? 'GENERATION_TIMEOUT' : 'MEDIA_GENERATION_FAILED'\n    );",
  "    const message = safeErrorMessage(error);\n    const quotaHit = message.includes('4006') || message.includes('429');\n\n    return errorResponse(\n      timeout\n        ? 'This is taking too long. Please try again in a minute.'\n        : quotaHit\n        ? 'Our AI is very busy right now. Please try again a little later.'\n        : 'Something went wrong. Please try again.',\n      timeout ? 504 : quotaHit ? 429 : 502,\n      timeout\n        ? 'GENERATION_TIMEOUT'\n        : quotaHit\n        ? 'SERVICE_BUSY'\n        : 'MEDIA_GENERATION_FAILED'\n    );"
 ]
];
for (const [i, [find, rep]] of edits.entries()) {
  const n = s.split(find).length - 1;
  if (n !== 1) { console.error('STOPPED. Edit ' + (i + 1) + ' found ' + n + ' times, expected 1. Nothing was changed.'); process.exit(1); }
  s = s.replace(find, () => rep);
}
fs.copyFileSync(file, file + '.backup');
fs.writeFileSync(file, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8');
console.log('route.ts updated. Backup saved as route.ts.backup');
