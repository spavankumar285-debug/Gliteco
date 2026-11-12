import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Gliteco AI',
  description: 'Privacy Policy, cookie disclosure, and Google AdSense information for Gliteco AI.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-6 text-sm text-zinc-300 leading-relaxed">
        <Link href="/" className="text-xs text-indigo-400 hover:text-indigo-300">← Back to Gliteco Studio</Link>
        <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
        <p className="text-xs text-zinc-500">Last updated: November 2026</p>
        <p>At Gliteco AI, your privacy is important to us. This Privacy Policy explains what information is collected and used when you visit and use our web application.</p>
        <h2 className="text-lg font-semibold text-white">1. Information We Collect</h2>
        <p>We may store basic profile preferences (such as display name, email address, and local chat history) to personalize your workspace. Prompts submitted to AI models are processed securely to generate your requested outputs.</p>
        <h2 className="text-lg font-semibold text-white">2. Cookies & Google AdSense</H2>
        <p>Gliteco uses cookies and local storage to keep your session active. Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites. Users may opt out of personalized advertising by visiting Google Ads Settings.</p>
        <h2 className="text-lg font-semibold text-white">3. Affiliate & Third-Party Links</h2>
        <p>Some external hosting or tool links on Gliteco may be affiliate links. Clicking these links may earn us a small commission at no extra cost to you.</p>
        <h2 className="text-lg font-semibold text-white">4. Contact Us</h2>
        <p>If you have questions about this Privacy Policy, contact the Gliteco support team via the studio header.</p>
      </div>
    </div>
  );
}
