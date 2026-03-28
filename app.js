(() => {
  const form = document.getElementById("lead-form");
  const statusEl = document.getElementById("form-status");
  const submitBtn = document.getElementById("submit-btn");
  const emailInput = document.getElementById("email");

  if (!form || !statusEl || !submitBtn || !emailInput) return;

  const cfg = {
    endpoint: "/api/lead",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    listName: "webeillin-drop-list",
    source: "landing-page",
    ...(window.LEAD_FORM_CONFIG || {})
  };

  const en = {
    join: "JOIN",
    statusInvalidEmail: "Enter a valid email address.",
    statusOfflineConfigured: "Form endpoint is not configured.",
    statusSubmitting: "Joining...",
    statusSuccess: "You are on the list. Check your inbox.",
    statusError: "Could not submit. Please try again.",
    statusServerErrorPrefix: "Could not submit:"
  };

  // Force English UI and messages regardless of browser locale.
  document.documentElement.lang = "en";
  emailInput.placeholder = "Enter your e-mail";
  submitBtn.textContent = en.join;

  const getUtmParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
      utm_content: params.get("utm_content") || "",
      utm_term: params.get("utm_term") || ""
    };
  };

  const setStatus = (message, type) => {
    statusEl.textContent = message;
    statusEl.classList.remove("error", "success");
    if (type) statusEl.classList.add(type);
  };

  const isConfigured = () => {
    return Boolean(cfg.endpoint && (/^https?:\/\//i.test(cfg.endpoint) || cfg.endpoint.startsWith("/")));
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");

    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const honeypot = String(data.get("website") || "").trim();

    if (honeypot) return;
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setStatus(en.statusInvalidEmail, "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = en.statusSubmitting;

    const payload = {
      email,
      website: honeypot,
      source: cfg.source,
      list: cfg.listName,
      createdAt: new Date().toISOString(),
      locale: navigator.language,
      localeUi: "en-US",
      userAgent: navigator.userAgent,
      referrer: document.referrer || "",
      ...getUtmParams()
    };

    try {
      if (!isConfigured()) {
        setStatus(en.statusOfflineConfigured, "error");
        return;
      }

      const response = await fetch(cfg.endpoint, {
        method: cfg.method || "POST",
        headers: cfg.headers || { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let serverMessage = "";
        try {
          const result = await response.json();
          serverMessage = String(result?.error || "");
        } catch (_error) {
          serverMessage = "";
        }
        throw new Error(serverMessage || `Request failed (${response.status})`);
      }

      setStatus(en.statusSuccess, "success");
      form.reset();
    } catch (error) {
      console.error(error);
      const details = error instanceof Error ? error.message : "";
      if (details) {
        setStatus(`${en.statusServerErrorPrefix} ${details}`, "error");
      } else {
        setStatus(en.statusError, "error");
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = en.join;
    }
  });
})();
