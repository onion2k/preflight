// --- Progressive Web App wiring: install, updates, offline state ---
(function () {
  var installBtn = document.getElementById("install");
  var status = document.getElementById("netstatus");
  var deferredPrompt = null;

  function setStatus(text, offline) {
    status.textContent = text || "";
    status.classList.toggle("offline", !!offline);
  }

  function reportConnection() {
    if (navigator.onLine) {
      setStatus(navigator.serviceWorker && navigator.serviceWorker.controller ? "Available offline" : "", false);
    } else {
      setStatus("Offline — checklist still working", true);
    }
  }

  window.addEventListener("online", reportConnection);
  window.addEventListener("offline", reportConnection);

  // Chromium fires this when the app qualifies for installation.
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
  });

  installBtn.addEventListener("click", function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function () {
      deferredPrompt = null;
      installBtn.hidden = true;
    });
  });

  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    installBtn.hidden = true;
    setStatus("Installed", false);
  });

  if (!("serviceWorker" in navigator)) { reportConnection(); return; }

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./sw.js").then(function (reg) {
      reportConnection();

      function watch(worker) {
        if (!worker) return;
        worker.addEventListener("statechange", function () {
          if (worker.state === "installed" && navigator.serviceWorker.controller) offerUpdate(worker);
        });
      }

      function offerUpdate(worker) {
        setStatus("", false);
        var btn = document.createElement("button");
        btn.className = "btn primary";
        btn.type = "button";
        btn.textContent = "New version — reload";
        btn.addEventListener("click", function () { worker.postMessage("skip-waiting"); });
        status.parentNode.insertBefore(btn, status);
      }

      if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
      watch(reg.installing);
      reg.addEventListener("updatefound", function () { watch(reg.installing); });
    }).catch(function () {
      // Registration fails on file:// and other insecure origins — the page still works.
      reportConnection();
    });

    var reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  });
})();