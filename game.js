(function initGame(global) {
  const config = global.GeogandConfig;
  const stateApi = global.GeogandState;
  const state = stateApi.state;
  const ui = global.GeogandUI;
  const utils = global.GeogandUtils;
  const sv = global.GeogandStreetView;

  let isAdvancingRound = false;
  let mapsApiLoaded = false;
  let loadedMapsApiKey = '';

  function getFatalMessage(reason) {
    if (reason === 'REQUEST_DENIED') {
      return 'API key yetkisiz. Maps JavaScript ve Street View API izinlerini kontrol et.';
    }
    if (reason === 'OVER_QUERY_LIMIT') {
      return 'API kota limiti asildi (OVER_QUERY_LIMIT).';
    }
    if (reason === 'OVER_DAILY_LIMIT') {
      return 'Gunluk API kotasi doldu (OVER_DAILY_LIMIT).';
    }
    return 'Street View servisine erisim saglanamadi.';
  }

  function sendToSplashWithError(message, resetMaps) {
    ui.showLoading(false);
    ui.showNoPhoto(false);
    ui.setStatusMessage(message, true);
    ui.setGameVisible(false);
    ui.setSplashVisible(true);
    if (ui.refs.refreshBtn) {
      ui.refs.refreshBtn.disabled = true;
    }

    if (resetMaps) {
      mapsApiLoaded = false;
      loadedMapsApiKey = '';
    }
  }

  function loadGoogleMapsApi(apiKey) {
    return new Promise(function setupGoogleMaps(resolve, reject) {
      if (mapsApiLoaded && typeof google !== 'undefined' && loadedMapsApiKey === apiKey) {
        resolve();
        return;
      }

      const old = document.getElementById('google-maps-script');
      if (old) {
        old.remove();
      }

      window.__googleMapsReady = function onMapsReady() {
        mapsApiLoaded = true;
        loadedMapsApiKey = apiKey;
        stateApi.trackMapsApiLoad();
        resolve();
      };

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=__googleMapsReady`;
      script.async = true;
      script.onerror = function onMapsError() {
        reject(new Error('Google Maps JS yuklenemedi.'));
      };

      document.head.appendChild(script);
    });
  }

  async function handleStartClick() {
    const apiKey = ui.refs.apiKeyInput.value.trim();
    if (!apiKey) {
      ui.setStatusMessage('Lutfen Google Maps API key gir.', true);
      return;
    }

    const selectedPresetId = ui.getSelectedPresetId();
    const selectedRoundCount = ui.getSelectedRoundCount();
    const selectedRoundTimeOverride = ui.getSelectedRoundTimeOverride();
    stateApi.applyPresetToRules(selectedPresetId, selectedRoundCount, selectedRoundTimeOverride);
    stateApi.savePreset(selectedPresetId);
    stateApi.saveRoundCount(selectedRoundCount);
    stateApi.saveRoundTimeOverride(selectedRoundTimeOverride);
    ui.setRulesSummary(state.rules);
    stateApi.resetGameState();

    ui.refs.startBtn.disabled = true;
    ui.setStatusMessage('API baglantisi kontrol ediliyor...', false);

    try {
      await loadGoogleMapsApi(apiKey);
    } catch (error) {
      ui.setStatusMessage('Google Maps yuklenemedi. Key veya domain kisitini kontrol et.', true);
      ui.refs.startBtn.disabled = false;
      return;
    }

    state.apiKey = apiKey;
    stateApi.saveKey(apiKey);
    ui.showKeySavedBadge(true);
    ui.setStatusMessage('', false);
    ui.setSplashVisible(false);
    ui.setGameVisible(true);
    ui.initGuessMap(function clearStatusOnGuess() {
      ui.setStatusMessage('', false);
    });
    ui.setTotalScore(0);
    if (ui.refs.refreshBtn) {
      ui.refs.refreshBtn.disabled = true;
    }

    ui.refs.startBtn.disabled = false;
    await beginRound(false);
  }

  function resolveSkippedRound(message) {
    if (state.isRoundResolved) {
      return;
    }

    state.isRoundResolved = true;
    stateApi.clearTimer();
    stateApi.trackSkippedRound();

    state.roundScores.push(0);
    ui.setTotalScore(state.totalScore);
    if (ui.refs.refreshBtn) {
      ui.refs.refreshBtn.disabled = true;
    }

    ui.showRoundResult({
      score: 0,
      distanceText: message || 'Konum bulunamadi, tur pas gecildi.',
      actualCoords: null,
      guessCoords: state.guessCoords,
      nextButtonLabel: state.round >= state.rules.totalRounds ? 'SKORU GOR ->' : 'SONRAKI TUR ->'
    });
  }

  async function beginRound(isRetry) {
    if (isAdvancingRound) {
      return;
    }

    isAdvancingRound = true;

    try {
      stateApi.clearTimer();
      stateApi.clearRetryTimeout();
      stateApi.resetRoundState();

      ui.clearGuess();
      ui.hideResultOverlay();
      ui.hideFinalOverlay();
      ui.showNoPhoto(false);
      ui.showLoading(true, 'KONUM ARANIYOR...');
      if (ui.refs.refreshBtn) {
        ui.refs.refreshBtn.disabled = true;
      }

      if (!isRetry) {
        state.round += 1;
        state.roundRetryCount = 0;
      }

      if (state.round > state.rules.totalRounds) {
        ui.showLoading(false);
        showFinal();
        return;
      }

      ui.setRoundInfo(state.round, state.rules.totalRounds);

      const result = await sv.loadRandomPanorama(
        state.apiKey,
        utils.randomWorldCoords,
        function onAttemptResult(attemptResult) {
          stateApi.trackMetadataStatus(attemptResult.status);
          if (attemptResult.status !== 'OK') {
            console.warn(`Attempt ${attemptResult.attempt} status:`, attemptResult.status, attemptResult.error || '');
          }
        }
      );

      if (result.fatalError) {
        stateApi.trackFatalReason(result.fatalReason);
        sendToSplashWithError(getFatalMessage(result.fatalReason), true);
        return;
      }

      if (!result.pano) {
        if (result.lastError && result.lastStatus !== 'ZERO_RESULTS') {
          sendToSplashWithError('Street View servisine erisilemedi. Baglantini veya kota durumunu kontrol et.', false);
          return;
        }

        state.roundRetryCount += 1;
        if (state.roundRetryCount >= state.rules.maxRoundRetries) {
          ui.showLoading(false);
          ui.showNoPhoto(false);
          resolveSkippedRound('Bu tur icin Street View bulunamadi (pas gecildi).');
          return;
        }

        ui.showLoading(false);
        ui.showNoPhoto(
          true,
          `Bu turda Street View yok. Tekrar deneme ${state.roundRetryCount}/${state.rules.maxRoundRetries}...`
        );

        state.retryTimeout = setTimeout(function retrySameRound() {
          beginRound(true);
        }, config.noPhotoRetryDelayMs);
        return;
      }

      state.currentCoords = { lat: result.pano.lat, lng: result.pano.lng };
      state.currentPanoId = result.pano.panoId;
      state.roundRetryCount = 0;

      const rendered = ui.renderStreetView(result.pano.panoId);
      if (!rendered) {
        stateApi.trackFatalReason('MAPS_JS_NOT_READY');
        sendToSplashWithError('Google Maps JS API hazir degil. Sayfayi yenileyip tekrar dene.', true);
        return;
      }

      stateApi.trackPanoramaLoad();
      ui.showLoading(false);
      if (ui.refs.refreshBtn) {
        ui.refs.refreshBtn.disabled = false;
      }
      startTimer();
    } finally {
      isAdvancingRound = false;
    }
  }

  function startTimer() {
    stateApi.clearTimer();
    if (!Number.isFinite(state.rules.roundTimeSeconds) || state.rules.roundTimeSeconds <= 0) {
      state.timeLeft = null;
      ui.setTimer(null, 0);
      return;
    }

    state.timeLeft = state.rules.roundTimeSeconds;
    ui.setTimer(state.timeLeft, state.rules.roundTimeSeconds);

    state.timerInterval = setInterval(function onTick() {
      state.timeLeft -= 1;
      ui.setTimer(state.timeLeft, state.rules.roundTimeSeconds);

      if (state.timeLeft <= 0) {
        resolveRound();
      }
    }, 1000);
  }

  function resolveRound() {
    if (state.isRoundResolved) {
      return;
    }

    state.isRoundResolved = true;
    stateApi.clearTimer();

    let distKm = null;
    let score = 0;

    if (state.guessCoords && state.currentCoords) {
      distKm = utils.haversine(state.currentCoords, state.guessCoords);
      score = utils.calcScore(distKm, state.rules);
    }

    state.totalScore += score;
    state.roundScores.push(score);
    ui.setTotalScore(state.totalScore);
    if (ui.refs.refreshBtn) {
      ui.refs.refreshBtn.disabled = true;
    }

    ui.showRoundResult({
      score,
      distanceText: utils.formatDistance(distKm),
      actualCoords: state.currentCoords,
      guessCoords: state.guessCoords,
      nextButtonLabel: state.round >= state.rules.totalRounds ? 'SKORU GOR ->' : 'SONRAKI TUR ->'
    });
  }

  function showFinal() {
    if (ui.refs.refreshBtn) {
      ui.refs.refreshBtn.disabled = true;
    }
    ui.showFinal(state.totalScore, state.roundScores, stateApi.getUsageSnapshot(), state.rules);
  }

  async function handleNextClick() {
    if (state.round >= state.rules.totalRounds) {
      showFinal();
      return;
    }

    await beginRound(false);
  }

  async function handlePlayAgainClick() {
    stateApi.resetGameState();
    ui.hideFinalOverlay();
    ui.setTotalScore(0);
    if (ui.refs.refreshBtn) {
      ui.refs.refreshBtn.disabled = true;
    }
    await beginRound(false);
  }

  async function handleRefreshClick() {
    if (state.round <= 0 || state.isRoundResolved) {
      return;
    }

    stateApi.trackManualRefresh();
    await beginRound(true);
  }

  ui.refs.startBtn.addEventListener('click', handleStartClick);
  ui.refs.apiKeyInput.addEventListener('keydown', function onEnter(event) {
    if (event.key === 'Enter') {
      handleStartClick();
    }
  });
  ui.refs.guessBtn.addEventListener('click', resolveRound);
  ui.refs.clearBtn.addEventListener('click', ui.clearGuess);
  if (ui.refs.refreshBtn) {
    ui.refs.refreshBtn.addEventListener('click', handleRefreshClick);
  }
  ui.refs.nextBtn.addEventListener('click', handleNextClick);
  ui.refs.playAgainBtn.addEventListener('click', handlePlayAgainClick);
})(window);
