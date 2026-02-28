(function initStreetView(global) {
  const config = global.GeogandConfig;

  async function findNearestPanorama(lat, lng, apiKey) {
    const url =
      `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}` +
      `&radius=5000&source=outdoor&key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url);
    if (!response.ok) {
      const error = new Error(`Metadata HTTP error: ${response.status}`);
      error.status = `HTTP_${response.status}`;
      throw error;
    }

    const data = await response.json();
    const status = data.status || 'UNKNOWN';

    if (status === 'OK' && data.location && data.pano_id) {
      return {
        ok: true,
        status,
        fatal: false,
        pano: {
          panoId: data.pano_id,
          lat: data.location.lat,
          lng: data.location.lng
        }
      };
    }

    return {
      ok: false,
      status,
      fatal: config.fatalMetadataStatuses.includes(status),
      errorMessage: data.error_message || ''
    };
  }

  async function loadRandomPanorama(apiKey, getCoords, onAttemptResult) {
    let lastError = null;
    let lastStatus = null;

    for (let attempt = 1; attempt <= config.maxPhotoAttempts; attempt += 1) {
      try {
        const coords = getCoords();
        const result = await findNearestPanorama(coords.lat, coords.lng, apiKey);

        lastStatus = result.status;
        if (typeof onAttemptResult === 'function') {
          onAttemptResult({
            attempt,
            status: result.status,
            fatal: result.fatal,
            errorMessage: result.errorMessage || ''
          });
        }

        if (result.ok) {
          return {
            pano: result.pano,
            lastError: null,
            lastStatus: result.status,
            fatalError: false,
            fatalReason: null
          };
        }

        if (result.fatal) {
          return {
            pano: null,
            lastError: new Error(result.errorMessage || result.status),
            lastStatus: result.status,
            fatalError: true,
            fatalReason: result.status
          };
        }
      } catch (error) {
        lastError = error;
        lastStatus = error.status || 'NETWORK_ERROR';

        if (typeof onAttemptResult === 'function') {
          onAttemptResult({
            attempt,
            status: lastStatus,
            fatal: false,
            error: error.message || String(error)
          });
        }
      }
    }

    return {
      pano: null,
      lastError,
      lastStatus,
      fatalError: false,
      fatalReason: null
    };
  }

  function createPanorama(containerId, panoId) {
    const container = document.getElementById(containerId);
    if (!container || typeof google === 'undefined' || !google.maps) {
      return null;
    }

    const oldStage = container.querySelector('.streetview-stage');
    if (oldStage) {
      oldStage.remove();
    }

    const stage = document.createElement('div');
    stage.className = 'streetview-stage';
    stage.style.cssText = 'position:absolute;inset:0;z-index:1;';
    container.insertBefore(stage, container.firstChild);

    return new google.maps.StreetViewPanorama(stage, {
      pano: panoId,
      pov: { heading: Math.random() * 360, pitch: 0 },
      zoom: 0,
      addressControl: false,
      showRoadLabels: false,
      motionTracking: false,
      motionTrackingControl: false,
      fullscreenControl: false,
      enableCloseButton: false,
      clickToGo: true,
      scrollwheel: true
    });
  }

  global.GeogandStreetView = {
    loadRandomPanorama,
    createPanorama
  };
})(window);
