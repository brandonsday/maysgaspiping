(() => {
  // Paste your GA4 Measurement ID (G-XXXXXXXXXX) between the quotes to turn on analytics.
  const GA_ID = "";
  const SHEETS_URL = "https://script.google.com/macros/s/AKfycbybkWP4CQfqUYMfJdirZJACs93B3T7jPd0uFweq-yRl1nOZhZwAuSVg3HWsod_lezXL/exec";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const track = (name, params) => { if (typeof window.gtag === "function") window.gtag("event", name, params || {}); };

  if (GA_ID) {
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID);
  }

  // Modal
  const modal = document.getElementById("quote-modal");
  const form = document.getElementById("quote-form");
  const states = {
    form: modal.querySelector('[data-state="form"]'),
    sending: modal.querySelector('[data-state="sending"]'),
    sent: modal.querySelector('[data-state="sent"]')
  };
  let openedAt = 0, timer = null;
  const show = (name) => Object.keys(states).forEach((k) => { states[k].hidden = k !== name; });
  const open = () => {
    openedAt = Date.now();
    track("quote_form_open", {});
    show("form");
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  };
  const close = () => { modal.hidden = true; document.body.style.overflow = ""; };

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest("[data-open-form]")) { e.preventDefault(); open(); return; }
    if (t.closest("[data-close-form]")) { close(); return; }
    if (t.closest("[data-reset-form]")) { form.reset(); openedAt = Date.now(); show("form"); return; }
    if (t.classList && t.classList.contains("modal-wrap")) { close(); return; }
    const tel = t.closest('a[href^="tel:"]');
    if (tel) track("phone_call_click", { location: tel.closest("header") ? "header" : "page" });
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) close(); });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const started = Date.now();
    const finish = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { show("sent"); form.reset(); }, Math.max(0, 1500 - (Date.now() - started)));
    };
    show("sending");
    // Spam gates: honeypot filled in, or submitted impossibly fast.
    if (data.website || Date.now() - openedAt < 3000) { finish(); return; }
    delete data.website;
    data.submittedAt = new Date().toISOString();
    data.type = "Web form";
    data.source = window.location.hostname || "draft";
    fetch(SHEETS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data)
    }).then(finish).catch(finish);
    track("generate_lead", { project: data.project || "unspecified" });
  });

  // Condensing sticky header
  const header = document.querySelector('[data-el="header"]');
  const logo = document.querySelector('[data-el="logo"]');
  if (header) {
    const inner = header.firstElementChild;
    let condensed = null;
    const onScroll = () => {
      const on = window.scrollY > 120;
      if (on === condensed) return;
      condensed = on;
      inner.style.padding = on ? "7px 20px" : "12px 20px";
      if (logo) logo.style.height = on ? "52px" : "76px";
      header.style.boxShadow = on ? "0 8px 24px rgba(0,0,0,0.35)" : "none";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Guarantee check marks draw in on scroll
  const marks = [...document.querySelectorAll('[data-anim="check"]')];
  if (!reduced && marks.length && "IntersectionObserver" in window) {
    marks.forEach((p) => {
      const len = p.getTotalLength ? p.getTotalLength() : 30;
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      p.style.transition = "stroke-dashoffset 0.5s cubic-bezier(.2,.7,.3,1)";
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const past = entry.boundingClientRect.bottom < 0;
        if (!entry.isIntersecting && !past) return;
        const el = entry.target;
        setTimeout(() => { el.style.strokeDashoffset = 0; }, past ? 0 : Math.max(marks.indexOf(el), 0) * 140);
        io.unobserve(el);
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -10% 0px" });
    marks.forEach((p) => io.observe(p));
    setTimeout(() => marks.forEach((p) => { p.style.strokeDashoffset = 0; }), 6000);
  }
})();
