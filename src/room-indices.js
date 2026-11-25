// Post-processing of per-source SPPS energy responses. Times are in seconds.
function windowEnergy(band, start, end) {
  const dt = band.timeStep;
  const arrival = band.parameters.arrival;
  if (!(dt > 0) || !Number.isFinite(arrival) || !Array.isArray(band.response)) return null;
  if (band.response.length * dt + 1e-9 < arrival + end) return null;
  let energy = 0;
  for (let i = Math.floor((arrival + start) / dt); i < band.response.length; i++) {
    const t = i * dt - arrival;
    if (t >= end) break;
    const width = Math.max(0, Math.min(end, t + dt) - Math.max(start, t));
    energy += band.response[i] * width / dt;
  }
  return energy;
}

export function augmentRoomResults(data, job) {
  for (const receiver of data.receivers) {
    for (const channel of receiver.bySource || []) {
      const source = job.sources.find(item => item.id === channel.sourceId);
      const distance = source?.position && receiver.position
        ? Math.hypot(...receiver.position.map((v,i) => v-source.position[i])) : null;
      for (const band of channel.bands) {
        const p = band.parameters;
        if (!p) continue;
        const power = source?.power[job.bands.indexOf(band.frequency)];
        // Model reference: omnidirectional free field at 10 m, nominal ρc = 400 Pa·s/m.
        const reference = power - 10 * Math.log10(4 * Math.PI * 100);
        p.G = Number.isFinite(reference) && Number.isFinite(band.spl) && p.tailFraction <= .001
          ? band.spl - reference : null;
        const total = band.meanSquarePressure;
        const early = windowEnergy(band, 0, .08);
        const fraction = total > 0 && early !== null ? Math.min(1, early / total) : null;
        p.D80 = fraction === null ? null : 100 * fraction;
        p.Gearly = p.G !== null && fraction > 0 ? p.G + 10 * Math.log10(fraction) : null;
        p.Glate = p.G !== null && fraction !== null && fraction < 1
          ? p.G + 10 * Math.log10(1 - fraction) : null;
        // Stage support estimates require the standard 1 m source-receiver spacing.
        const direct = windowEnergy(band, 0, .01);
        for (const [key,start,end] of [['STearly',.02,.1], ['STlate',.1,1]]) {
          const reflected = windowEnergy(band, start, end);
          p[key] = distance !== null && Math.abs(distance - 1) <= .001 &&
            direct > 0 && reflected > 0 ? 10 * Math.log10(reflected / direct) : null;
        }
      }
      // Use a single decay estimator across all bands contributing to each ratio.
      channel.spectralRatios = {};
      for (const fit of ['T20', 'T30']) {
        const time = f => channel.bands.find(b => b.frequency === f)?.parameters?.[fit]?.seconds;
        const ratio = (a, b) => {
          const times = [a, b, 500, 1000].map(time);
          return times.every(t => Number.isFinite(t) && t > 0)
            ? (times[0] + times[1]) / (times[2] + times[3]) : null;
        };
        channel.spectralRatios[fit] = {bassRatio: ratio(125, 250), brilliance: ratio(2000, 4000)};
      }
    }
  }
}
