(function () {
  'use strict';

  var STORAGE_PREFIX      = 'koha_tour_never_';
  var STORAGE_RESET_TOKEN = 'koha_tour_reset_token';
  var LOG_PREFIX          = '%c[KohaTour]%c ';
  var LOG_STYLE           = 'color:#f0a500;font-weight:bold';
  var LOG_RESET           = 'color:inherit;font-weight:normal';

  function log(msg) {
    console.log(LOG_PREFIX + msg, LOG_STYLE, LOG_RESET);
  }

  function warn(msg) {
    console.warn(LOG_PREFIX + msg, LOG_STYLE, LOG_RESET);
  }

  function error(msg) {
    console.error(LOG_PREFIX + msg, LOG_STYLE, LOG_RESET);
  }

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
      launchTour(steps, texts);
    });
    document.getElementById('kt-no').addEventListener('click', function () {
      banner.remove();
    });
    document.getElementById('kt-never').addEventListener('click', function () {
      localStorage.setItem(storageKey(path), 'never');
      banner.remove();
    });
  }

  function launchTour(steps, texts) {
    log('Starting tour with ' + steps.length + ' step(s)...');

    var unavailableText = texts.stepNotAvailable ||
      'This step is not available in your current view. ' +
      'This can happen when your user account does not have the permissions to see certain features. ' +
      'For more details, open the developer console (F12).';
    var driverSteps = [];
    var found = 0;
    var unavailable = 0;

    for (var i = 0; i < steps.length; i++) {
      var step = steps[i];
      var stepLabel = 'Step ' + (i + 1) + ' ("' + (step.title || 'untitled') + '")';

      if (!step.selector) {
        warn(
          stepLabel + ' has no "selector" field. ' +
          'Each step needs a CSS selector so KohaTour knows which element to highlight.\n' +
          '  How to get a selector: right-click the element in the browser > Inspect > ' +
          'right-click the tag in DevTools > Copy > Copy selector'
        );
        driverSteps.push({
          popover: { title: step.title || 'Step ' + (i + 1), description: unavailableText }
        });
        unavailable++;
        continue;
      }

      var el;
      try {
        el = document.querySelector(step.selector);
      } catch (e) {
        error(
          stepLabel + ' — invalid CSS selector:\n' +
          '  "' + step.selector + '"\n' +
          '  Browser says: ' + e.message + '\n' +
          '  Tip: Make sure the selector is valid CSS. You can test it in the browser console:\n' +
          '  document.querySelector("' + step.selector.replace(/"/g, '\\"') + '")'
        );
        driverSteps.push({
          popover: { title: step.title || 'Step ' + (i + 1), description: unavailableText }
        });
        unavailable++;
        continue;
      }

      if (el) {
        driverSteps.push({
          element: step.selector,
          popover: { title: step.title, description: step.body }
        });
        log(stepLabel + ' — element found.');
        found++;
      } else {
        warn(
          stepLabel + ' — element not found on this page.\n' +
          '  Selector: "' + step.selector + '"\n' +
          '  This means the element does not exist (or not yet) on the current page.\n' +
          '  The step will be shown as a placeholder so the tour can continue.\n' +
          '  Tip: You can test the selector in the browser console:\n' +
          '  document.querySelector("' + step.selector + '")\n' +
          '  If it returns null, the selector does not match anything.'
        );
        driverSteps.push({
          popover: { title: step.title || 'Step ' + (i + 1), description: unavailableText }
        });
        unavailable++;
      }
    }

    if (!found) {
      error(
        'Tour cannot start — none of the ' + steps.length + ' configured step(s) matched an element on this page.\n' +
        '  This usually means the CSS selectors in the tour configuration do not match the current page.\n\n' +
        '  To fix this:\n' +
        '  1. Right-click the element you want to highlight > Inspect\n' +
        '  2. In DevTools: right-click the highlighted HTML tag > Copy > Copy selector\n' +
        '  3. Paste the selector into your tour configuration under "selector"\n' +
        '  4. Save the configuration and reload the page'
      );
      return;
    }

    if (unavailable) {
      log(found + ' of ' + steps.length + ' step(s) found, ' + unavailable + ' shown as placeholder. Launching tour...');
    } else {
      log(found + ' of ' + steps.length + ' step(s) ready. Launching tour...');
    }

    try {
      var d = window.driver.js.driver({
        showProgress: true,
        nextBtnText:  texts.nextBtn  || 'Next',
        prevBtnText:  texts.prevBtn  || 'Previous',
        doneBtnText:  texts.doneBtn  || 'Done',
        steps:        driverSteps
      });
      d.drive();
    } catch (e) {
      error(
        'Failed to start the tour overlay (driver.js).\n' +
        '  Error: ' + e.message + '\n' +
        '  This might mean driver.js did not load correctly from the CDN.\n' +
        '  Check if https://cdn.jsdelivr.net is reachable from this server.'
      );
    }
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

    log(
      'Tour available: "' + (match.name || 'unnamed') + '" (' + match.steps.length + ' steps) ' +
      'for path: ' + path
    );
    showBanner(match.steps, path, config.banner);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
