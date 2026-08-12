(function bootstrapNanoMotionMeasurement() {
  "use strict";

  var config = window.NANO_MOTION_CONFIG || {};
  var consentKey = "nanoMotion.consent";
  var savedConsent = null;

  try {
    savedConsent = JSON.parse(localStorage.getItem(consentKey) || "null");
  } catch (error) {
    savedConsent = null;
  }

  var measurementGranted = Boolean(savedConsent && savedConsent.measurement === true);
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  // Consent Mode is set before GTM is loaded. A returning visitor's saved
  // decision is applied immediately; a new visitor defaults to denied.
  window.gtag("consent", "default", {
    ad_storage: measurementGranted ? "granted" : "denied",
    analytics_storage: measurementGranted ? "granted" : "denied",
    ad_user_data: measurementGranted ? "granted" : "denied",
    ad_personalization: measurementGranted ? "granted" : "denied",
    wait_for_update: savedConsent ? 0 : 500
  });

  window.dataLayer.push({
    event: "nano_consent_bootstrapped",
    nano_consent_state: measurementGranted ? "granted" : "denied"
  });

  var containerId = String(config.gtmContainerId || "").trim();
  var isRealContainerId = /^GTM-[A-Z0-9]+$/i.test(containerId) && containerId !== "GTM-XXXXXXX";

  window.NANO_MOTION_BOOTSTRAP = {
    consentKey: consentKey,
    initialConsent: savedConsent,
    gtmConfigured: isRealContainerId
  };

  if (!isRealContainerId) return;

  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  var firstScript = document.getElementsByTagName("script")[0];
  var gtmScript = document.createElement("script");
  gtmScript.async = true;
  gtmScript.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(containerId);
  firstScript.parentNode.insertBefore(gtmScript, firstScript);
})();
