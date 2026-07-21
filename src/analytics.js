function postHogUiHost(apiHost) {
  return apiHost.includes("eu.i.posthog.com") ? "https://eu.posthog.com" : "https://us.posthog.com";
}

export function createProductAnalytics({ client, key, host }) {
  let enabled = false;

  return {
    init() {
      if (!key || !client?.init) return false;
      try {
        client.init(key, {
          api_host: host,
          ui_host: postHogUiHost(host),
          autocapture: true,
          capture_pageview: true,
          capture_pageleave: true,
          persistence: "localStorage",
          person_profiles: "identified_only",
          disable_session_recording: false,
          disable_external_dependency_loading: true,
          advanced_disable_flags: false,
          advanced_disable_feature_flags: false,
          capture_heatmaps: true,
          enable_heatmaps: true,
          capture_performance: true,
          capture_dead_clicks: true,
          capture_exceptions: true,
          disable_surveys: false,
          enable_recording_console_log: true,
          mask_all_text: false,
          mask_all_element_attributes: false,
          session_recording: {
            blockSelector: ".analytics-image-block",
            maskAllInputs: false
          },
          loaded: () => {}
        });
        enabled = true;
        return true;
      } catch {
        return false;
      }
    },

    capture(event, properties = {}) {
      if (!enabled || !client?.capture) return false;
      try {
        client.capture(event, properties);
        return true;
      } catch {
        return false;
      }
    },

    reset() {
      if (!enabled || !client?.reset) return false;
      try {
        client.reset();
        return true;
      } catch {
        return false;
      }
    }
  };
}

export function createPuzzleJourney(capture) {
  let context = {};
  let startCaptured = false;
  let firstMoveCaptured = false;
  let meaningfulPlayCaptured = false;

  function reset(nextContext, existingMoves = 0, hasExistingProgress = existingMoves > 0) {
    context = { ...nextContext };
    startCaptured = hasExistingProgress;
    firstMoveCaptured = existingMoves > 0;
    meaningfulPlayCaptured = existingMoves >= 5;
  }

  function ensureStarted() {
    if (startCaptured) return;
    startCaptured = true;
    capture("puzzle_started", context);
  }

  return {
    resume(nextContext, existingMoves = 0, hasExistingProgress = existingMoves > 0) {
      reset(nextContext, existingMoves, hasExistingProgress);
    },

    start(nextContext) {
      reset(nextContext, 0);
      ensureStarted();
    },

    recordInteraction() {
      ensureStarted();
    },

    recordMove(moveCount) {
      if (moveCount > 0) ensureStarted();
      if (!firstMoveCaptured && moveCount > 0) {
        firstMoveCaptured = true;
        capture("puzzle_first_move", context);
      }
      if (!meaningfulPlayCaptured && moveCount >= 5) {
        meaningfulPlayCaptured = true;
        capture("puzzle_meaningful_play", { ...context, move_threshold: 5 });
      }
    },

    recordHint(properties = {}) {
      ensureStarted();
      capture("hint_requested", { ...context, ...properties });
    },

    complete(properties = {}) {
      ensureStarted();
      capture("puzzle_completed", { ...context, ...properties });
    }
  };
}
