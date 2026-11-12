import Link from 'next/link';

export const metadata = {
  title: 'About Gliteco AI | Dual-Mode AI Studio',
  description: 'Learn about Gliteco AI, the all-in-one AI workspace for chat, app generation, presentations, and design.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="text-xs text-indigo-400 hover:text-indigo-300">← Back to Gliteco Studio</Link>
        <h1 className="text-3xl font-bold text-white">About Gliteco AI</h1>
        <p className="text-zinc-300 leading-relaxed">
          Gliteco is an all-in-one AI productivity and creation studio designed to help students, developers, founders, and creators turn ideas into working apps, structured presentations, and clean visuals in seconds.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
            <h2 className="font-semibold text-white">Instant App & Web Builder</h2>
            <p className="text-xs text-zinc-400">Generate responsive websites, dashboards, and interactive web apps with live preview and one-click device export.</p>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
            <h2 className="font-semibold text-white">PPT & Document Workflows</h2>
            <p className="text-xs text-zinc-400">Draft academic project decks, pitch presentations, and reports with structured exports.</p>
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
          <h2 className="font-semibold text-white">Our Mission & Sustainable Access</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            We believe powerful AI tools should remain accessible to everyone. Gliteco offers a free workspace supported by non-intrusive advertising, alongside an optional Gliteco AI Pro upgrade for ad-free use and unlimited exports.
          </p>
        </div>
      </div>
    </div>
  );
}
