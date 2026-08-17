/* ============================================================================
   Finance Control Tower — Auto-Sync add-on
   Drop-in: add ONE line at the very end of index.html, right before </body>:
       <script src="./auto-sync.js"></script>
   (It must load AFTER the main inline <script>.)

   What it does, with NO backend (no Neon, no Cloudflare):
   • Managers: every edit auto-commits state.json to GitHub (debounced).
   • Viewers: auto-pull the latest state.json every 60s (near-live).
   • Token is entered once per manager, stored ONLY in their browser
     (localStorage) — it is never written into the repo.

   One-time setup:
   1) GitHub → Settings → Developer settings → Fine-grained tokens →
      Generate new token → Repository access: ONLY this repo →
      Permissions → Contents: Read and write. Copy the token.
   2) Make sure a state.json exists in the repo root (Export once & commit it).
   3) First manager edit will prompt for the token, once.
   ============================================================================ */
(function () {
  "use strict";
  if (window.FINANCE_API_BASE) { console.log("[auto-sync] disabled: live API active"); return; }

  // ---- CONFIG — change these if your repo/branch differ ----
  var GH_REPO   = "pierceyalex5-star/finance-department-performance";
  var GH_PATH   = "state.json";
  var GH_BRANCH = "main";
  var PULL_MS   = 10000;   // how often viewers check for updates
  var DEBOUNCE  = 1500;    // wait after last edit before committing

  var saveTimer = null;
  var lastPushedAt = "";

  // ---------- helpers ----------
  function say(msg) {
    // reuse the app's toast if present, else console
    if (typeof toast === "function") { try { toast(msg); return; } catch (e) {} }
    console.log("[auto-sync]", msg);
  }
  function b64(str) {
    // UTF-8 safe base64 for the GitHub Contents API
    return btoa(unescape(encodeURIComponent(str)));
  }
  function getToken() {
    var t = localStorage.getItem("fct_gh_token");
    if (!t) {
      t = prompt(
        "Sauvegarde partagée — gestionnaires seulement.\n\n" +
        "Collez votre token GitHub (fine-grained, Contents: read & write) :"
      );
      if (t) { t = t.trim(); localStorage.setItem("fct_gh_token", t); }
    }
    return t;
  }
  window.fctClearToken = function () {
    localStorage.removeItem("fct_gh_token");
    say("Token GitHub effacé.");
  };

  // Is this browser a "manager" (i.e., allowed to write)?
  // Rule: they have a token OR they’re not in read-only "Manager View" gate.
  function isEditor() {
    // Any selected team member may edit. GitHub authorization is still required by commitNow().
    return true;
  }

  // ---------- COMMIT (managers) ----------
  async function commitNow() {
    if (typeof state === "undefined") return;
    var token = getToken();
    if (!token) return; // viewers or declined → stay local-only
    var api = "https://api.github.com/repos/" + GH_REPO + "/contents/" + GH_PATH;
    try {
      // 1) get current SHA (required to update an existing file)
      var sha;
      var cur = await fetch(api + "?ref=" + GH_BRANCH, {
        headers: { Authorization: "Bearer " + token, "Accept": "application/vnd.github+json" }
      });
      if (cur.ok) { sha = (await cur.json()).sha; }
      else if (cur.status === 401 || cur.status === 403) { say("Token refusé — vérifiez les permissions."); return; }

      // 2) PUT new content
      var payload = {
        message: "Auto-save · " + new Date().toISOString() +
                 (typeof currentUser !== "undefined" ? " · " + currentUser : ""),
        content: b64(JSON.stringify(state, null, 2)),
        branch: GH_BRANCH
      };
      if (sha) payload.sha = sha;

      var r = await fetch(api, {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          "Accept": "application/vnd.github+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (r.ok) { lastPushedAt = state.updatedAt || new Date().toISOString(); say("Enregistré pour toute l'équipe ✓"); }
      else if (r.status === 409) { say("Conflit — un autre gestionnaire a sauvegardé. Rechargez puis réessayez."); }
      else if (r.status === 401 || r.status === 403) { say("Token refusé — permissions insuffisantes."); }
      else { say("Échec de la sauvegarde GitHub (" + r.status + ")."); }
    } catch (e) {
      say("Réseau indisponible — sauvegarde locale seulement.");
    }
  }

  function queueCommit() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(commitNow, DEBOUNCE);
  }
  // expose a manual "Save now" if you want to wire a button to it
  window.fctSaveNow = commitNow;

  // ---------- HOOK: wrap the app's applyLocal so every edit triggers a commit ----------
  function installHook() {
    if (typeof applyLocal !== "function") return false;
    if (applyLocal.__fctWrapped) return true;
    var orig = applyLocal;
    // Reassign the global binding; the app's internal applyLocal(...) calls now route here.
    applyLocal = function (a) {
      orig(a);
      if (isEditor()) queueCommit();
    };
    applyLocal.__fctWrapped = true;
    return true;
  }

  // ---------- PULL (viewers + everyone) ----------
  async function pullLatest() {
    if (typeof state === "undefined") return;
    try {
      var r = await fetch(GH_PATH + "?_=" + Date.now(), { cache: "no-store" });
      if (!r.ok) return;
      var remote = await r.json();
      var localAt  = (state && state.updatedAt) || "";
      var remoteAt = (remote && remote.updatedAt) || "";
      // Only adopt remote if it's newer than what we're showing,
      // and we didn't just push it ourselves.
      if (remoteAt && remoteAt > localAt && remoteAt !== lastPushedAt) {
        state = remote;
        if (typeof saveLocal === "function") { try { saveLocal(); } catch (e) {} }
        if (typeof renderAll === "function") { try { renderAll(); } catch (e) {} }
        say("Tableau mis à jour ✓");
      }
    } catch (e) { /* offline — keep showing current state */ }
  }

  // ---------- boot ----------
  function boot() {
    var ok = installHook();
    if (!ok) { return setTimeout(boot, 300); } // wait until the main script defined applyLocal

    // Seed lastPushedAt so we don't immediately re-pull our own state
    try { lastPushedAt = (typeof state !== "undefined" && state.updatedAt) || ""; } catch (e) {}

    // Initial pull shortly after load (lets the app finish its own init first)
    setTimeout(pullLatest, 2500);
    // Periodic pull for near-live updates
    setInterval(pullLatest, PULL_MS);

    console.log("[auto-sync] active · repo=" + GH_REPO + " · branch=" + GH_BRANCH);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
