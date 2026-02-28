(function initUI(global) {
  const config = global.GeoTahminConfig;
  const stateApi = global.GeoTahminState;
  const state = stateApi.state;

  function byId(id) {
    return document.getElementById(id);
  }

  const refs = {
    splash: byId('splash'),
    game: byId('game'),
    status: byId('status-msg'),
    startBtn: byId('start-btn'),
    apiKeyInput: byId('api-key-input'),
    clearKeyBtn: byId('clear-key-btn'),
    keySavedBadge: byId('key-saved-badge'),
    difficultySelect: byId('difficulty-select'),
    roundCountSelect: byId('round-count-select'),
    roundTimeSelect: byId('round-time-select'),
    rulesPreview: byId('rules-preview'),
    rulesHint: byId('rules-hint'),
    guessBtn: byId('guess-btn'),
    clearBtn: byId('clear-btn'),
    refreshBtn: byId('refresh-btn'),
    nextBtn: byId('next-btn'),
    playAgainBtn: byId('play-again-btn'),
    loading: byId('loading'),
    loadingText: byId('loading-text'),
    noPhoto: byId('no-photo'),
    noPhotoText: byId('no-photo-text'),
    timerDisplay: byId('timer-display'),
    timerBar: byId('timer-bar'),
    totalScoreHud: byId('total-score-hud'),
    roundInfo: byId('round-info'),
    roundScoreDisplay: byId('round-score-display'),
    roundDistDisplay: byId('round-dist-display'),
    resultOverlay: byId('result-overlay'),
    finalOverlay: byId('final-overlay'),
    finalScoreDisplay: byId('final-score-display'),
    finalGrade: byId('final-grade'),
    roundBreakdown: byId('round-breakdown'),
    usageSummary: byId('usage-summary')
  };

  function setSplashVisible(isVisible) {
    refs.splash.style.display = isVisible ? 'flex' : 'none';
  }

  function setGameVisible(isVisible) {
    refs.game.style.display = isVisible ? 'block' : 'none';
  }

  function setStatusMessage(message, isError) {
    refs.status.textContent = message || '';
    refs.status.classList.toggle('error', Boolean(isError));
  }

  function showKeySavedBadge(isVisible) {
    refs.keySavedBadge.style.display = isVisible ? 'inline' : 'none';
    refs.clearKeyBtn.style.display = isVisible ? 'inline-flex' : 'none';
  }

  function setDifficultyPreset(presetId) {
    if (refs.difficultySelect) {
      refs.difficultySelect.value = presetId;
    }
  }

  function getSelectedPresetId() {
    if (!refs.difficultySelect) {
      return state.selectedPresetId;
    }
    return refs.difficultySelect.value;
  }

  function setRoundCount(roundCount) {
    if (refs.roundCountSelect) {
      refs.roundCountSelect.value = String(roundCount);
    }
  }

  function getSelectedRoundCount() {
    if (!refs.roundCountSelect) {
      return state.selectedRoundCount;
    }
    return Number(refs.roundCountSelect.value);
  }

  function setRoundTimeOverride(roundTimeOverride) {
    if (refs.roundTimeSelect) {
      refs.roundTimeSelect.value = String(roundTimeOverride);
    }
  }

  function getSelectedRoundTimeOverride() {
    if (!refs.roundTimeSelect) {
      return state.selectedRoundTimeOverride;
    }

    const value = refs.roundTimeSelect.value;
    return value === 'preset' ? 'preset' : Number(value);
  }

  function formatRoundTime(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return 'suresiz';
    }
    return `${seconds} saniye`;
  }

  function setRulesSummary(rules) {
    const line = `${rules.totalRounds} tur · ${formatRoundTime(rules.roundTimeSeconds)} · maks ${
      (rules.maxScorePerRound * rules.totalRounds).toLocaleString()
    } puan`;

    refs.rulesPreview.textContent =
      `${rules.presetLabel} ayari: puan dusus hizi ~ ${rules.scoreDecayKm} km bazli.`;
    refs.rulesHint.textContent = `${line} · key tarayicinda duz metin saklanir.`;
  }

  function setRoundInfo(round, totalRounds) {
    refs.roundInfo.textContent = `TUR ${round} / ${totalRounds}`;
  }

  function setTotalScore(score) {
    refs.totalScoreHud.textContent = score.toLocaleString();
  }

  function setTimer(timeLeft, totalTime) {
    if (!Number.isFinite(totalTime) || totalTime <= 0) {
      refs.timerDisplay.textContent = '∞';
      refs.timerBar.style.width = '100%';
      refs.timerBar.style.background = '#e8ff47';
      return;
    }

    refs.timerDisplay.textContent = String(timeLeft);
    const pct = Math.max(0, (timeLeft / totalTime) * 100);
    refs.timerBar.style.width = `${pct}%`;
    refs.timerBar.style.background = pct > 40 ? '#e8ff47' : pct > 20 ? '#ffa500' : '#ff4747';
  }

  function showLoading(isVisible, text) {
    refs.loading.style.display = isVisible ? 'flex' : 'none';
    if (text) {
      refs.loadingText.textContent = text;
    }
  }

  function showNoPhoto(isVisible, message) {
    refs.noPhoto.classList.toggle('show', isVisible);
    if (message) {
      refs.noPhotoText.textContent = message;
    }
  }

  function trackTileLayerUsage(tileLayer) {
    if (!tileLayer || typeof tileLayer.on !== 'function') {
      return tileLayer;
    }

    tileLayer.on('tileloadstart', function onTileLoadStart() {
      stateApi.trackOsmTileRequest();
    });

    tileLayer.on('tileload', function onTileLoad() {
      stateApi.trackOsmTileLoad();
    });

    tileLayer.on('tileerror', function onTileError() {
      stateApi.trackOsmTileError();
    });

    return tileLayer;
  }

  function initGuessMap(onGuessSelected) {
    if (state.guessMap) {
      setTimeout(function refreshMapSize() {
        state.guessMap.invalidateSize();
      }, 0);
      return;
    }

    state.guessMap = L.map('guess-map', {
      center: [20, 10],
      zoom: 2,
      zoomControl: true,
      attributionControl: false
    });

    const guessTileLayer = trackTileLayerUsage(
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
      })
    );
    guessTileLayer.addTo(state.guessMap);

    state.guessMap.on('click', function onGuessMapClick(event) {
      placeGuessMarker(event.latlng.lat, event.latlng.lng);
      if (typeof onGuessSelected === 'function') {
        onGuessSelected();
      }
    });
  }

  function placeGuessMarker(lat, lng) {
    state.guessCoords = { lat, lng };

    if (state.guessMarker) {
      state.guessMap.removeLayer(state.guessMarker);
    }

    state.guessMarker = L.circleMarker([lat, lng], {
      radius: 8,
      fillColor: '#e8ff47',
      color: '#000',
      weight: 2,
      fillOpacity: 1
    }).addTo(state.guessMap);

    refs.guessBtn.disabled = false;
  }

  function clearGuess() {
    if (state.guessMarker && state.guessMap) {
      state.guessMap.removeLayer(state.guessMarker);
      state.guessMarker = null;
    }

    state.guessCoords = null;
    refs.guessBtn.disabled = true;
  }

  function renderStreetView(panoId) {
    if (typeof google === 'undefined' || !google.maps) {
      return false;
    }

    state.streetViewPanorama = global.GeoTahminStreetView.createPanorama('viewer', panoId);
    return Boolean(state.streetViewPanorama);
  }

  function hideResultOverlay() {
    refs.resultOverlay.classList.remove('show');
  }

  function hideFinalOverlay() {
    refs.finalOverlay.classList.remove('show');
  }

  function renderResultMap(actualCoords, guessCoords) {
    if (state.resultMap) {
      state.resultMap.remove();
      state.resultMap = null;
    }

    state.resultMap = L.map('result-map', {
      zoomControl: false,
      attributionControl: false
    });

    const resultTileLayer = trackTileLayerUsage(
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
    );
    resultTileLayer.addTo(state.resultMap);

    if (actualCoords) {
      L.circleMarker([actualCoords.lat, actualCoords.lng], {
        radius: 10,
        fillColor: '#e8ff47',
        color: '#000',
        weight: 2,
        fillOpacity: 1
      }).addTo(state.resultMap);
    }

    if (guessCoords) {
      L.circleMarker([guessCoords.lat, guessCoords.lng], {
        radius: 10,
        fillColor: '#ff4747',
        color: '#000',
        weight: 2,
        fillOpacity: 1
      }).addTo(state.resultMap);
    }

    if (actualCoords && guessCoords) {
      L.polyline(
        [
          [actualCoords.lat, actualCoords.lng],
          [guessCoords.lat, guessCoords.lng]
        ],
        {
          color: '#e8ff47',
          weight: 2,
          dashArray: '6,6',
          opacity: 0.8
        }
      ).addTo(state.resultMap);

      state.resultMap.fitBounds(
        L.latLngBounds([
          [actualCoords.lat, actualCoords.lng],
          [guessCoords.lat, guessCoords.lng]
        ]),
        { padding: [30, 30] }
      );
    } else if (actualCoords) {
      state.resultMap.setView([actualCoords.lat, actualCoords.lng], 5);
    }

    setTimeout(function invalidateResultMap() {
      if (state.resultMap) {
        state.resultMap.invalidateSize();
      }
    }, 50);
  }

  function showRoundResult(result) {
    refs.roundScoreDisplay.textContent = result.score.toLocaleString();
    refs.roundScoreDisplay.className = result.score < 1000 ? 'round-score bad' : 'round-score';
    refs.roundDistDisplay.textContent = result.distanceText;
    refs.nextBtn.textContent = result.nextButtonLabel;

    renderResultMap(result.actualCoords, result.guessCoords);
    refs.resultOverlay.classList.add('show');
  }

  function formatStatusMap(statusMap) {
    const entries = Object.entries(statusMap || {});
    if (!entries.length) {
      return '-';
    }

    return entries
      .sort(function sortByKey(a, b) {
        return a[0].localeCompare(b[0]);
      })
      .map(function toLabel(entry) {
        return `${entry[0]}: ${entry[1]}`;
      })
      .join(' | ');
  }

  function renderUsageSummary(usage) {
    const currency = config.pricing.currency;

    refs.usageSummary.innerHTML =
      '<div class="usage-title">Kullanim Ozeti (Tahmini)</div>' +
      '<div class="usage-grid">' +
      `<div>Metadata denemesi: <b>${usage.metadataRequests}</b></div>` +
      `<div>Pano yukleme: <b>${usage.panoramasLoaded}</b></div>` +
      `<div>Maps JS yukleme: <b>${usage.mapsApiLoads}</b></div>` +
      `<div>OSM tile istek: <b>${usage.osmTileRequests}</b></div>` +
      `<div>OSM tile yukleme: <b>${usage.osmTileLoads}</b></div>` +
      `<div>OSM tile hata: <b>${usage.osmTileErrors}</b></div>` +
      `<div>Manuel yenileme: <b>${usage.manualRefreshes || 0}</b></div>` +
      `<div>Atlanan tur: <b>${usage.skippedRounds}</b></div>` +
      `<div>Fatal hata: <b>${usage.fatalErrors}</b></div>` +
      '</div>' +
      `<div class="usage-cost">Tahmini maliyet: ${currency} ${usage.estimatedCostUsd.toFixed(4)}</div>` +
      `<div class="usage-note">Status dagilimi: ${formatStatusMap(usage.metadataStatuses)}</div>` +
      `<div class="usage-note">Fatal nedenler: ${formatStatusMap(usage.fatalReasons)}</div>` +
      '<div class="usage-note">Not: OSM tile sayilari bilgi amaclidir ve Google maliyetine dahil degildir.</div>' +
      '<div class="usage-note">Not: Kesin tutar Google Cloud Billing tarafinda gorulur.</div>';
  }

  function showFinal(totalScore, roundScores, usage, rules) {
    hideResultOverlay();
    refs.finalScoreDisplay.textContent = totalScore.toLocaleString();

    const max = rules.maxScorePerRound * rules.totalRounds;
    const pct = totalScore / max;

    let grade = 'Kayip';
    if (pct >= 0.9) {
      grade = 'Efsane';
    } else if (pct >= 0.7) {
      grade = 'Gezgin';
    } else if (pct >= 0.5) {
      grade = 'Ortalama';
    }

    refs.finalGrade.textContent = `${grade} (${rules.presetLabel})`;

    refs.roundBreakdown.innerHTML = roundScores
      .map(function renderRoundScore(score, index) {
        return (
          '<div class="round-pip">' +
          `<div class="pip-label">TUR ${index + 1}</div>` +
          `<div class="pip-score">${score.toLocaleString()}</div>` +
          '</div>'
        );
      })
      .join('');

    renderUsageSummary(usage);
    refs.finalOverlay.classList.add('show');
  }

  function populateSavedKey() {
    const saved = stateApi.loadKey();
    if (saved) {
      refs.apiKeyInput.value = saved;
      showKeySavedBadge(true);
    }
  }

  function initializePresetSelector() {
    setDifficultyPreset(state.selectedPresetId);
    setRoundCount(state.selectedRoundCount);
    setRoundTimeOverride(state.selectedRoundTimeOverride);
    setRulesSummary(state.rules);

    refs.difficultySelect.addEventListener('change', function onDifficultyChange() {
      const presetId = getSelectedPresetId();
      const roundCount = getSelectedRoundCount();
      const roundTimeOverride = getSelectedRoundTimeOverride();
      stateApi.applyPresetToRules(presetId, roundCount, roundTimeOverride);
      stateApi.savePreset(presetId);
      stateApi.saveRoundCount(roundCount);
      stateApi.saveRoundTimeOverride(roundTimeOverride);
      setRulesSummary(state.rules);
    });

    if (refs.roundCountSelect) {
      refs.roundCountSelect.addEventListener('change', function onRoundCountChange() {
        const presetId = getSelectedPresetId();
        const roundCount = getSelectedRoundCount();
        const roundTimeOverride = getSelectedRoundTimeOverride();
        stateApi.applyPresetToRules(presetId, roundCount, roundTimeOverride);
        stateApi.saveRoundCount(roundCount);
        stateApi.saveRoundTimeOverride(roundTimeOverride);
        setRulesSummary(state.rules);
      });
    }

    if (refs.roundTimeSelect) {
      refs.roundTimeSelect.addEventListener('change', function onRoundTimeChange() {
        const presetId = getSelectedPresetId();
        const roundCount = getSelectedRoundCount();
        const roundTimeOverride = getSelectedRoundTimeOverride();
        stateApi.applyPresetToRules(presetId, roundCount, roundTimeOverride);
        stateApi.saveRoundTimeOverride(roundTimeOverride);
        setRulesSummary(state.rules);
      });
    }
  }

  refs.apiKeyInput.addEventListener('input', function onApiKeyInput() {
    showKeySavedBadge(false);
  });

  refs.clearKeyBtn.addEventListener('click', function onClearKeyClick() {
    stateApi.clearKey();
    refs.apiKeyInput.value = '';
    showKeySavedBadge(false);
  });

  populateSavedKey();
  initializePresetSelector();

  global.GeoTahminUI = {
    refs,
    setSplashVisible,
    setGameVisible,
    setStatusMessage,
    showKeySavedBadge,
    setDifficultyPreset,
    getSelectedPresetId,
    setRoundCount,
    getSelectedRoundCount,
    setRoundTimeOverride,
    getSelectedRoundTimeOverride,
    setRulesSummary,
    setRoundInfo,
    setTotalScore,
    setTimer,
    showLoading,
    showNoPhoto,
    initGuessMap,
    clearGuess,
    renderStreetView,
    hideResultOverlay,
    hideFinalOverlay,
    showRoundResult,
    showFinal
  };
})(window);
