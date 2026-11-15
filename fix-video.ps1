
$p = "src/app/page.tsx"
$s = [System.IO.File]::ReadAllText($p)

$start = $s.IndexOf("function CinematicVideoCard")
$end = $s.IndexOf("export default function Home()", $start)

if ($start -lt 0 -or $end -lt 0) {
    Write-Host "ERROR: Component boundaries not found. Original file unchanged."
    exit 1
}

Copy-Item $p "$p.before-video-fix.bak" -Force

$replacement = @'
function CinematicVideoCard({ video }: { video: GeneratedVideoItem }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-indigo-600 text-white break-words">
          {video.prompt}
        </div>
      </div>
      <div className="w-full max-w-xl rounded-2xl p-3 bg-zinc-900 border border-zinc-800 space-y-3 shadow-xl">
        <div className="flex justify-between items-center text-xs text-indigo-300">
          <span className="flex items-center gap-2">
            <Video className="w-4 h-4" /> Gliteco AI Video
          </span>
          <span className="text-emerald-400">MP4 Ready</span>
        </div>
        <video
          src={video.videoUrl}
          controls
          autoPlay
          loop
          playsInline
          className="w-full aspect-video rounded-xl bg-black object-contain"
        />
        <a
          href={video.videoUrl}
          download="gliteco-ai-video.mp4"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
        >
          <Download className="w-4 h-4" /> Download Video
        </a>
      </div>
    </div>
  );
}

'@

$s = $s.Substring(0, $start) + $replacement + $s.Substring($end)

[System.IO.File]::WriteAllText(
    (Resolve-Path $p),
    $s,
    [System.Text.UTF8Encoding]::new($false)
)

Write-Host "SUCCESS: Video component replaced. Backup created."
