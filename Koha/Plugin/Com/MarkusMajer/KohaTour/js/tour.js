(function () {
  'use strict';

  var STORAGE_PREFIX      = 'koha_tour_never_';
  var STORAGE_RESET_TOKEN = 'koha_tour_reset_token';

  function storageKey(path) {
    return STORAGE_PREFIX + btoa(path);
  }

  function applyResetToken() {
    var serverToken = window.KOHA_TOUR_RESET_TOKEN || '0';
    var localToken  = localStorage.getItem(STORAGE_RESET_TOKEN) || '0';
    if (serverToken > localToken) {
      Object.keys(localStorage)
        .filter(function (k) { return k.startsWith(STORAGE_PREFIX); })
        .forEach(function (k) { localStorage.removeItem(k); });
      localStorage.setItem(STORAGE_RESET_TOKEN, serverToken);
    }
  }

  function resolveXPath(xpath) {
    var result = document.evaluate(
      xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
    );
    return result.singleNodeValue;
  }

  function showBanner(steps, path, bannerTexts) {
    var texts = bannerTexts || {};
    var notification = texts.notification || 'A guided tour is available for this page. Would you like to start it?';
    var yesLabel     = texts.yes         || 'Yes, please.';
    var noLabel      = texts.no          || 'No, thanks.';
    var neverLabel   = texts.donotask    || 'Do not ask again.';

    var banner = document.createElement('div');
    banner.id = 'koha-tour-banner';
    banner.style.cssText = [
      'background:#fff8e6',
      'border-bottom:1px solid #f0d080',
      'padding:8px 16px',
      'display:flex',
      'align-items:center',
      'gap:12px',
      'font-size:12px',
      'font-family:Arial,sans-serif',
      'color:#555',
      'z-index:9999'
    ].join(';');

    banner.innerHTML =
      '<span>&#9432; ' + notification + '</span>' +
      '<button id="kt-yes"   style="padding:4px 14px;background:#f0a500;border:none;border-radius:3px;font-size:12px;color:#fff;font-weight:bold;cursor:pointer;">' + yesLabel + '</button>' +
      '<button id="kt-no"    style="padding:4px 14px;background:#ddd;border:none;border-radius:3px;font-size:12px;cursor:pointer;">' + noLabel + '</button>' +
      '<button id="kt-never" style="background:none;border:none;font-size:12px;color:#999;text-decoration:underline;cursor:pointer;">' + neverLabel + '</button>';

    document.body.insertBefore(banner, document.body.firstChild);

    document.getElementById('kt-yes').addEventListener('click', function () {
      banner.remove();
      launchTour(steps);
    });
    document.getElementById('kt-no').addEventListener('click', function () {
      banner.remove();
    });
    document.getElementById('kt-never').addEventListener('click', function () {
      localStorage.setItem(storageKey(path), 'never');
      banner.remove();
    });
  }

  function launchTour(steps) {
    var driverSteps = [];
    for (var i = 0; i < steps.length; i++) {
      var el = resolveXPath(steps[i].xpath);
      if (el) {
        driverSteps.push({
          element: el,
          popover: { title: steps[i].title, description: steps[i].body }
        });
      }
    }

    if (!driverSteps.length) return;

    var d = window.driver.js.driver({
      showProgress: true,
      nextBtnText:  'Weiter →',
      prevBtnText:  '← Zurück',
      doneBtnText:  'Fertig',
      steps:        driverSteps
    });
    d.drive();
  }

  function init() {
    applyResetToken();

    var path = window.location.pathname;
    if (localStorage.getItem(storageKey(path)) === 'never') return;

    var config = window.KOHA_TOUR_CONFIG;
    if (!config || !config.tours) return;

    var match = null;
    for (var i = 0; i < config.tours.length; i++) {
      if (config.tours[i].path === path) {
        match = config.tours[i];
        break;
      }
    }
    if (!match || !match.steps || !match.steps.length) return;

    showBanner(match.steps, path, config.banner);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
