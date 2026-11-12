import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | Gliteco AI',
  description: 'Terms and conditions for using Gliteco AI web studio and Pro subscriptions.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-6 text-sm text-zinc-300 leading-relaxed">
        <Link href="/" className="text-xs text-indigo-400 hover:text-indigo-300">← Back to Gliteco Studio</Link>
        <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
        <p className="text-xs text-zinc-500">Last updated: November 2026</p>
        <h2 className="text-lg font-semibold text-white">1. Acceptance of Terms</h2>
        <p>By accessing or using Gliteco AI, you agree to use the platform responsibly and in compliance with applicable laws.</p>
        <h2 className="text-lg font-semibold text-white">2. AI-Generated Content</h2>
        <p>Gliteco provides AI-generated code, text, presentations, and visuals. You retain ownership of your prompts and exported projects, and you are responsible for reviewing generated code before production deployment.</p>
        <h2 className="text-lg font-semibold text-white">3. Free Tier & Gliteco AI Pro</h2>
        <p>The free tier is supported by display advertising. Gliteco AI Pro subscriptions (weekly or monthly) remove ads and unlock expanded export limits and may be canceled anytime before the next billing cycle.</p>
      </div>
    </div>
  );
}
