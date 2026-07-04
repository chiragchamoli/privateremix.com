/* PrivateRemix — single source of truth for the download link.
   Change APP_STORE_URL here and every button on every page updates. */
(function () {
  // TODO: replace REPLACE_WITH_APP_ID with the real Mac App Store numeric app id.
  var APP_STORE_URL = "https://apps.apple.com/app/idREPLACE_WITH_APP_ID";

  function apply() {
    var links = document.querySelectorAll("[data-download]");
    for (var i = 0; i < links.length; i++) {
      links[i].setAttribute("href", APP_STORE_URL);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();
