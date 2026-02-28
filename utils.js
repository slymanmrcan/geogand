(function initUtils(global) {
  const config = global.GeoTahminConfig;

  function randomWorldCoords() {
    const regions = config.randomRegions;
    const totalWeight = regions.reduce(function sumWeights(sum, region) {
      return sum + region.weight;
    }, 0);

    let rand = Math.random() * totalWeight;
    let region = regions[regions.length - 1];

    for (const candidate of regions) {
      rand -= candidate.weight;
      if (rand <= 0) {
        region = candidate;
        break;
      }
    }

    return {
      lat: region.latMin + Math.random() * (region.latMax - region.latMin),
      lng: region.lngMin + Math.random() * (region.lngMax - region.lngMin)
    };
  }

  function calcScore(distKm, rules) {
    const maxScore = rules && Number.isFinite(rules.maxScorePerRound) ? rules.maxScorePerRound : 5000;
    const decayKm = rules && Number.isFinite(rules.scoreDecayKm) ? rules.scoreDecayKm : 2000;
    return Math.round(maxScore * Math.exp(-distKm / decayKm));
  }

  function haversine(a, b) {
    const earthRadiusKm = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a.lat * Math.PI) / 180) *
        Math.cos((b.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return earthRadiusKm * 2 * Math.asin(Math.sqrt(x));
  }

  function formatDistance(distKm) {
    if (distKm === null || Number.isNaN(distKm)) {
      return 'Tahmin yapılmadı';
    }

    if (distKm < 1) {
      return `${Math.round(distKm * 1000)} m`;
    }

    return `${Math.round(distKm).toLocaleString()} km`;
  }

  global.GeoTahminUtils = {
    randomWorldCoords,
    calcScore,
    haversine,
    formatDistance
  };
})(window);
