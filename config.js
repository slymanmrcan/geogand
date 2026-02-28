(function initConfig(global) {
  const difficultyPresets = Object.freeze({
    easy: Object.freeze({
      label: 'Kolay',
      totalRounds: 5,
      roundTimeSeconds: 120,
      maxScorePerRound: 5000,
      scoreDecayKm: 3000
    }),
    medium: Object.freeze({
      label: 'Orta',
      totalRounds: 5,
      roundTimeSeconds: 90,
      maxScorePerRound: 5000,
      scoreDecayKm: 2000
    }),
    hard: Object.freeze({
      label: 'Zor',
      totalRounds: 5,
      roundTimeSeconds: 60,
      maxScorePerRound: 5000,
      scoreDecayKm: 1400
    })
  });

  global.GeoTahminConfig = Object.freeze({
    defaultPreset: 'medium',
    defaultRoundCount: 5,
    roundCountOptions: Object.freeze([1, 3, 5, 10]),
    defaultRoundTimeOverride: 'preset',
    roundTimeOverrideOptions: Object.freeze(['preset', 0, 30, 60, 90, 120]),
    maxPhotoAttempts: 15,
    maxRoundRetries: 3,
    noPhotoRetryDelayMs: 3000,
    localStorageKey: 'geotahmin_google_api_key',
    localStoragePresetKey: 'geotahmin_difficulty_preset',
    localStorageRoundCountKey: 'geotahmin_round_count',
    localStorageRoundTimeKey: 'geotahmin_round_time',

    difficultyPresets,

    pricing: Object.freeze({
      currency: 'USD',
      mapsJsLoadUsd: 0.007,
      streetViewPanoramaUsd: 0.014,
      metadataRequestUsd: 0
    }),

    fatalMetadataStatuses: Object.freeze([
      'REQUEST_DENIED',
      'OVER_QUERY_LIMIT',
      'OVER_DAILY_LIMIT'
    ]),

    // Ağırlıklı bölgeler — coverage iyi yerler
    randomRegions: [
      { latMin: 47, latMax: 55, lngMin: -5, lngMax: 15, weight: 10 },
      { latMin: 44, latMax: 55, lngMin: 15, lngMax: 35, weight: 6 },
      { latMin: 37, latMax: 45, lngMin: 26, lngMax: 45, weight: 5 },
      { latMin: 30, latMax: 48, lngMin: -120, lngMax: -75, weight: 12 },
      { latMin: 43, latMax: 52, lngMin: -95, lngMax: -65, weight: 5 },
      { latMin: 31, latMax: 45, lngMin: 129, lngMax: 145, weight: 7 },
      { latMin: 25, latMax: 37, lngMin: 120, lngMax: 130, weight: 5 },
      { latMin: -38, latMax: -27, lngMin: 115, lngMax: 155, weight: 5 },
      { latMin: -30, latMax: -15, lngMin: -55, lngMax: -40, weight: 4 },
      { latMin: -40, latMax: -28, lngMin: -68, lngMax: -55, weight: 3 },
      { latMin: -35, latMax: -25, lngMin: 16, lngMax: 35, weight: 3 },
      { latMin: 18, latMax: 28, lngMin: 73, lngMax: 88, weight: 4 },
      { latMin: 10, latMax: 22, lngMin: 100, lngMax: 110, weight: 3 },
      { latMin: 19, latMax: 28, lngMin: -105, lngMax: -87, weight: 3 }
    ]
  });
})(window);
