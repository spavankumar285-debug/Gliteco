import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Gliteco AI Studio',
  description: 'Privacy policy, data handling, and advertising cookie disclosures for Gliteco AI Studio.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="text-xs text-indigo-400 hover:underline">&larr; Back to Gliteco AI Studio</Link>
        <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
        <p className="text-xs text-zinc-400">Last updated: 2026</p>

        <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-white">1. Information We Collect</h2>
          <p>We may store basic profile preferences (such as your theme setting or chat history) locally in your browser to improve your experience on Gliteco.</p>

          <h2 className="text-lg font-semibold text-white">2. Cookies &amp; Advertising (Google AdSense)</h2>
          <p>Gliteco uses cookies and local storage to keep the platform free for users. Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites. Users may opt out of personalized advertising by visiting Google Ads Settings.</p>

          <h2 className="text-lg font-semibold text-white">3. Third-Party Services &amp; AI Processing</h2>
          <p>Some external hosting or tool links on Gliteco may process prompts through secure AI API providers to generate responses, code, or images. We do not sell your personal data to third parties.</p>

          <h2 className="text-lg font-semibold text-white">4. Contact Us,</h2>
          <p>For privacy questions or support, reach out to the Gliteco team through our About page.</p>
        </section>
      </div>
    </main>
  );
}
