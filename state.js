(function initState(global) {
  const config = global.GeogandConfig;
  const presetIds = Object.keys(config.difficultyPresets);
  const roundCountOptions = Array.isArray(config.roundCountOptions)
    ? config.roundCountOptions.map(Number).filter(Number.isFinite)
    : [config.defaultRoundCount];
  const roundTimeOverrideOptions = Array.isArray(config.roundTimeOverrideOptions)
    ? config.roundTimeOverrideOptions
    : [config.defaultRoundTimeOverride];

  function isValidPresetId(presetId) {
    return presetIds.includes(presetId);
  }

  function normalizePresetId(presetId) {
    if (isValidPresetId(presetId)) {
      return presetId;
    }

    if (isValidPresetId(config.defaultPreset)) {
      return config.defaultPreset;
    }

    return presetIds[0];
  }

  function getPresetDefinition(presetId) {
    return config.difficultyPresets[normalizePresetId(presetId)];
  }

  function normalizeRoundCount(roundCount) {
    const parsed = Number(roundCount);
    if (Number.isFinite(parsed) && roundCountOptions.includes(parsed)) {
      return parsed;
    }

    if (roundCountOptions.includes(config.defaultRoundCount)) {
      return config.defaultRoundCount;
    }

    return roundCountOptions[0] || 5;
  }

  function normalizeRoundTimeOverride(roundTimeOverride) {
    if (roundTimeOverride === 'preset') {
      return 'preset';
    }

    const parsed = Number(roundTimeOverride);
    if (Number.isFinite(parsed) && roundTimeOverrideOptions.includes(parsed)) {
      return parsed;
    }

    if (roundTimeOverrideOptions.includes(config.defaultRoundTimeOverride)) {
      return config.defaultRoundTimeOverride;
    }

    return roundTimeOverrideOptions[0] || 'preset';
  }

  function buildRulesFromPreset(presetId, roundCount, roundTimeOverride) {
    const normalized = normalizePresetId(presetId);
    const normalizedRoundCount = normalizeRoundCount(roundCount);
    const normalizedRoundTimeOverride = normalizeRoundTimeOverride(roundTimeOverride);
    const preset = getPresetDefinition(normalized);
    const resolvedRoundTimeSeconds =
      normalizedRoundTimeOverride === 'preset' ? preset.roundTimeSeconds : normalizedRoundTimeOverride;

    return {
      presetId: normalized,
      presetLabel: preset.label,
      totalRounds: normalizedRoundCount,
      roundTimeSeconds: resolvedRoundTimeSeconds,
      maxScorePerRound: preset.maxScorePerRound,
      scoreDecayKm: preset.scoreDecayKm,
      maxRoundRetries: config.maxRoundRetries
    };
  }

  function createUsageStats() {
    return {
      mapsApiLoads: 0,
      metadataRequests: 0,
      panoramasLoaded: 0,
      osmTileRequests: 0,
      osmTileLoads: 0,
      osmTileErrors: 0,
      manualRefreshes: 0,
      fatalErrors: 0,
      skippedRounds: 0,
      metadataStatuses: {},
      fatalReasons: {},
      estimatedCostUsd: 0
    };
  }

  function loadPreset() {
    try {
      const saved = localStorage.getItem(config.localStoragePresetKey) || '';
      return normalizePresetId(saved);
    } catch (error) {
      return normalizePresetId(config.defaultPreset);
    }
  }

  function loadRoundCount() {
    try {
      const saved = localStorage.getItem(config.localStorageRoundCountKey) || '';
      return normalizeRoundCount(saved);
    } catch (error) {
      return normalizeRoundCount(config.defaultRoundCount);
    }
  }

  function loadRoundTimeOverride() {
    try {
      const saved = localStorage.getItem(config.localStorageRoundTimeKey) || '';
      return normalizeRoundTimeOverride(saved || config.defaultRoundTimeOverride);
    } catch (error) {
      return normalizeRoundTimeOverride(config.defaultRoundTimeOverride);
    }
  }

  const initialPresetId = loadPreset();
  const initialRoundCount = loadRoundCount();
  const initialRoundTimeOverride = loadRoundTimeOverride();
  const initialRules = buildRulesFromPreset(initialPresetId, initialRoundCount, initialRoundTimeOverride);

  const state = {
    apiKey: '',
    selectedPresetId: initialPresetId,
    selectedRoundCount: initialRoundCount,
    selectedRoundTimeOverride: initialRoundTimeOverride,
    rules: initialRules,
    round: 0,
    totalScore: 0,
    roundScores: [],
    currentCoords: null,
    currentPanoId: null,
    guessCoords: null,
    timerInterval: null,
    retryTimeout: null,
    timeLeft: initialRules.roundTimeSeconds,
    guessMap: null,
    guessMarker: null,
    resultMap: null,
    streetViewPanorama: null,
    isRoundResolved: false,
    roundRetryCount: 0,
    usage: createUsageStats()
  };

  function recalculateEstimatedCost() {
    const pricing = config.pricing;
    state.usage.estimatedCostUsd =
      state.usage.mapsApiLoads * pricing.mapsJsLoadUsd +
      state.usage.panoramasLoaded * pricing.streetViewPanoramaUsd +
      state.usage.metadataRequests * pricing.metadataRequestUsd;
  }

  function clearTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function clearRetryTimeout() {
    if (state.retryTimeout) {
      clearTimeout(state.retryTimeout);
      state.retryTimeout = null;
    }
  }

  function resetRoundState() {
    state.currentCoords = null;
    state.currentPanoId = null;
    state.guessCoords = null;
    state.isRoundResolved = false;
    state.timeLeft = state.rules.roundTimeSeconds;
    clearTimer();
  }

  function resetUsageStats() {
    state.usage = createUsageStats();
    recalculateEstimatedCost();
  }

  function resetGameState() {
    state.round = 0;
    state.totalScore = 0;
    state.roundScores = [];
    state.roundRetryCount = 0;
    resetRoundState();
    clearRetryTimeout();
    resetUsageStats();
  }

  function applyPresetToRules(presetId, roundCount, roundTimeOverride) {
    const normalized = normalizePresetId(presetId);
    const normalizedRoundCount = normalizeRoundCount(roundCount);
    const normalizedRoundTimeOverride = normalizeRoundTimeOverride(roundTimeOverride);
    state.selectedPresetId = normalized;
    state.selectedRoundCount = normalizedRoundCount;
    state.selectedRoundTimeOverride = normalizedRoundTimeOverride;
    state.rules = buildRulesFromPreset(normalized, normalizedRoundCount, normalizedRoundTimeOverride);
    state.timeLeft = state.rules.roundTimeSeconds;
    return state.rules;
  }

  function savePreset(presetId) {
    const normalized = normalizePresetId(presetId);
    try {
      localStorage.setItem(config.localStoragePresetKey, normalized);
    } catch (error) {
      // no-op
    }
  }

  function saveRoundCount(roundCount) {
    const normalized = normalizeRoundCount(roundCount);
    try {
      localStorage.setItem(config.localStorageRoundCountKey, String(normalized));
    } catch (error) {
      // no-op
    }
  }

  function saveRoundTimeOverride(roundTimeOverride) {
    const normalized = normalizeRoundTimeOverride(roundTimeOverride);
    try {
      localStorage.setItem(config.localStorageRoundTimeKey, String(normalized));
    } catch (error) {
      // no-op
    }
  }

  function saveKey(key) {
    try {
      localStorage.setItem(config.localStorageKey, key);
    } catch (error) {
      // no-op
    }
  }

  function loadKey() {
    try {
      return localStorage.getItem(config.localStorageKey) || '';
    } catch (error) {
      return '';
    }
  }

  function clearKey() {
    try {
      localStorage.removeItem(config.localStorageKey);
    } catch (error) {
      // no-op
    }
  }

  function trackMapsApiLoad() {
    state.usage.mapsApiLoads += 1;
    recalculateEstimatedCost();
  }

  function trackMetadataStatus(status) {
    const statusKey = status || 'UNKNOWN';
    state.usage.metadataRequests += 1;
    state.usage.metadataStatuses[statusKey] = (state.usage.metadataStatuses[statusKey] || 0) + 1;
    recalculateEstimatedCost();
  }

  function trackPanoramaLoad() {
    state.usage.panoramasLoaded += 1;
    recalculateEstimatedCost();
  }

  function trackOsmTileRequest() {
    state.usage.osmTileRequests += 1;
  }

  function trackOsmTileLoad() {
    state.usage.osmTileLoads += 1;
  }

  function trackOsmTileError() {
    state.usage.osmTileErrors += 1;
  }

  function trackManualRefresh() {
    state.usage.manualRefreshes += 1;
  }

  function trackFatalReason(reason) {
    const reasonKey = reason || 'UNKNOWN_FATAL';
    state.usage.fatalErrors += 1;
    state.usage.fatalReasons[reasonKey] = (state.usage.fatalReasons[reasonKey] || 0) + 1;
  }

  function trackSkippedRound() {
    state.usage.skippedRounds += 1;
  }

  function getUsageSnapshot() {
    return {
      mapsApiLoads: state.usage.mapsApiLoads,
      metadataRequests: state.usage.metadataRequests,
      panoramasLoaded: state.usage.panoramasLoaded,
      osmTileRequests: state.usage.osmTileRequests,
      osmTileLoads: state.usage.osmTileLoads,
      osmTileErrors: state.usage.osmTileErrors,
      manualRefreshes: state.usage.manualRefreshes,
      fatalErrors: state.usage.fatalErrors,
      skippedRounds: state.usage.skippedRounds,
      metadataStatuses: { ...state.usage.metadataStatuses },
      fatalReasons: { ...state.usage.fatalReasons },
      estimatedCostUsd: state.usage.estimatedCostUsd
    };
  }

  global.GeogandState = {
    state,
    clearTimer,
    clearRetryTimeout,
    resetRoundState,
    resetGameState,
    applyPresetToRules,
    savePreset,
    saveRoundCount,
    saveRoundTimeOverride,
    loadPreset,
    loadRoundCount,
    loadRoundTimeOverride,
    saveKey,
    loadKey,
    clearKey,
    trackMapsApiLoad,
    trackMetadataStatus,
    trackPanoramaLoad,
    trackOsmTileRequest,
    trackOsmTileLoad,
    trackOsmTileError,
    trackManualRefresh,
    trackFatalReason,
    trackSkippedRound,
    getUsageSnapshot
  };
})(window);
