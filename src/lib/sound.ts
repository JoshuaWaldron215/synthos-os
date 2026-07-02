// Tiny dependency-free notification blip (two soft sine tones).
let ctx: AudioContext | null = null;

export function playNotifySound(): void {
  try {
    ctx = ctx ?? new AudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime;
    [880, 1174.66].forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      const start = t0 + i * 0.09;
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  } catch {
    /* audio unavailable (autoplay policy, no device) — stay silent */
  }
}
