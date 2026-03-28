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
    localeByCountryApi: "https://ipapi.co/json/",
    countryApiTimeoutMs: 1800,
    ...(window.LEAD_FORM_CONFIG || {})
  };

  const i18n = {
    "en-US": {
      htmlLang: "en-US",
      headline: "DON'T YOU OVERLOAD",
      subBefore: "Get early access to unique",
      subAfter: "drop",
      emailPlaceholder: "Enter your e-mail",
      emailLabel: "Email address",
      join: "JOIN",
      discount: "+ 10 % off your first order",
      statusInvalidEmail: "Enter a valid e-mail address.",
      statusOfflineConfigured: "Form works. Set window.LEAD_FORM_CONFIG.endpoint to enable autosend.",
      statusSubmitting: "Joining...",
      statusSuccess: "You're in. Check your inbox.",
      statusError: "Could not submit. Please try again."
    },
    es: {
      htmlLang: "es",
      headline: "NO TE SOBRECARGUES",
      subBefore: "Consigue acceso anticipado al drop unico de",
      subAfter: "",
      emailPlaceholder: "Introduce tu e-mail",
      emailLabel: "Correo electronico",
      join: "UNIRME",
      discount: "+ 10 % de descuento en tu primer pedido",
      statusInvalidEmail: "Introduce un e-mail valido.",
      statusOfflineConfigured: "El formulario funciona. Configura endpoint para el envio automatico.",
      statusSubmitting: "Enviando...",
      statusSuccess: "Listo. Revisa tu correo.",
      statusError: "No se pudo enviar. Intentalo de nuevo."
    },
    de: {
      htmlLang: "de",
      headline: "UEBERLAD DICH NICHT",
      subBefore: "Hol dir fruehen Zugang zum einzigartigen",
      subAfter: "Drop",
      emailPlaceholder: "Gib deine E-Mail ein",
      emailLabel: "E-Mail-Adresse",
      join: "JOIN",
      discount: "+ 10 % auf deine erste Bestellung",
      statusInvalidEmail: "Bitte gib eine gueltige E-Mail-Adresse ein.",
      statusOfflineConfigured: "Formular funktioniert. Setze endpoint fuer automatischen Versand.",
      statusSubmitting: "Wird gesendet...",
      statusSuccess: "Du bist drin. Pruefe dein Postfach.",
      statusError: "Senden fehlgeschlagen. Bitte erneut versuchen."
    },
    pl: {
      htmlLang: "pl",
      headline: "NIE PRZECIAZAJ SIE",
      subBefore: "Zdobadz early access do unikalnego dropu",
      subAfter: "",
      emailPlaceholder: "Wpisz swoj e-mail",
      emailLabel: "Adres e-mail",
      join: "DOLACZ",
      discount: "+ 10 % rabatu na pierwsze zamowienie",
      statusInvalidEmail: "Podaj poprawny adres e-mail.",
      statusOfflineConfigured: "Formularz dziala. Ustaw endpoint, aby wlaczyc automatyczna wysylke.",
      statusSubmitting: "Wysylanie...",
      statusSuccess: "Jestes na liscie. Sprawdz skrzynke.",
      statusError: "Nie udalo sie wyslac. Sprobuj ponownie."
    }
  };

  let activeLocale = "en-US";

  const updateTexts = (localeKey) => {
    const locale = i18n[localeKey] || i18n["en-US"];
    activeLocale = localeKey in i18n ? localeKey : "en-US";

    document.documentElement.lang = locale.htmlLang;
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      if (key && locale[key]) {
        node.textContent = locale[key];
      }
    });
    emailInput.placeholder = locale.emailPlaceholder;
  };

  const getLocaleByCountry = (countryCode) => {
    const code = String(countryCode || "").toUpperCase();
    const spanishCountries = new Set(["ES", "MX", "AR", "CO", "CL", "PE", "UY", "PY", "BO", "EC", "VE", "CR", "PA", "DO", "GT", "SV", "HN", "NI"]);
    const germanCountries = new Set(["DE", "AT", "CH", "LI"]);
    if (code === "PL") return "pl";
    if (spanishCountries.has(code)) return "es";
    if (germanCountries.has(code)) return "de";
    return "en-US";
  };

  const getLocaleByNavigator = () => {
    const lang = String(navigator.language || "en-US").toLowerCase();
    if (lang.startsWith("pl")) return "pl";
    if (lang.startsWith("es")) return "es";
    if (lang.startsWith("de")) return "de";
    return "en-US";
  };

  const getLocaleByQuery = () => {
    const query = new URLSearchParams(window.location.search).get("lang");
    const clean = String(query || "").toLowerCase();
    if (clean === "pl") return "pl";
    if (clean === "es") return "es";
    if (clean === "de") return "de";
    if (clean === "en" || clean === "en-us") return "en-US";
    return "";
  };

  const detectLocale = async () => {
    const queryLocale = getLocaleByQuery();
    if (queryLocale) return queryLocale;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), Number(cfg.countryApiTimeoutMs) || 1800);

    try {
      const response = await fetch(cfg.localeByCountryApi, {
        method: "GET",
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error("Locale API error");
      const data = await response.json();
      const country = data?.country_code || data?.country || "";
      return getLocaleByCountry(country);
    } catch (_error) {
      clearTimeout(timeoutId);
      return getLocaleByNavigator();
    }
  };

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

  detectLocale().then((locale) => updateTexts(locale));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");
    const t = i18n[activeLocale] || i18n["en-US"];

    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const honeypot = String(data.get("website") || "").trim();

    if (honeypot) return;
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setStatus(t.statusInvalidEmail, "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = t.statusSubmitting;

    const payload = {
      email,
      website: honeypot,
      source: cfg.source,
      list: cfg.listName,
      createdAt: new Date().toISOString(),
      locale: navigator.language,
      localeUi: activeLocale,
      userAgent: navigator.userAgent,
      referrer: document.referrer || "",
      ...getUtmParams()
    };

    try {
      if (!isConfigured()) {
        localStorage.setItem("webeillin:lastLead", JSON.stringify(payload));
        setStatus(t.statusOfflineConfigured, "success");
        form.reset();
        return;
      }

      const response = await fetch(cfg.endpoint, {
        method: cfg.method || "POST",
        headers: cfg.headers || { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      setStatus(t.statusSuccess, "success");
      form.reset();
    } catch (error) {
      console.error(error);
      setStatus(t.statusError, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = t.join;
    }
  });
})();
