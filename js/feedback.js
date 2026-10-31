/* Feedback modal: opened by any [data-fk-feedback] element or a link to #feedback.
   Posts to /api/feedback (functions/api/feedback.js) with a Turnstile token. */
(() => {
  // Cloudflare Turnstile site key (public). Localhost uses Cloudflare's always-pass test key.
  const SITE_KEY = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? "1x00000000000000000000AA" : "TURNSTILE_SITE_KEY";
  const GAMES = ["Bug Hunter", "Button Builder", "Color Chaos", "Fix the Website", "Font Friends", "Loop Machine", "Password Power", "Sort the Bots", "Spot the Fake", "Teach the Robot"];
  const SOON = ["Spacing Police", "Mobile Rescue", "Guess the Prompt", "Robot Chef", "Link Detective", "Logo Lab", "Menu Maze", "Share or Not?"];
  const G = window.gsap;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const opt = (n) => `<option value="${n}">${n}</option>`;
  const ICO_X = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
  const ICO_HEART = '<svg viewBox="0 0 22 20" fill="none" aria-hidden="true"><path d="M11 18.5C4 13.5 1.5 10 2 6.5 2.6 3 7.5 2 11 6.5 14.5 2 19.4 3 20 6.5 20.5 10 18 13.5 11 18.5Z" fill="currentColor"/></svg>';
  const ICO_SEND = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12l16-8-6 16-2.5-6.5L4 12z" fill="currentColor"/></svg>';

  let root, card, form, view, done, err, slot, opener, widget, tsLoading;

  const build = () => {
    root = document.createElement("div");
    root.className = "fk-fb";
    root.hidden = true;
    root.setAttribute("data-lenis-prevent", "");
    root.innerHTML = `
<div class="fk-fb_backdrop" data-fk-close></div>
<div class="fk-fb_card" role="dialog" aria-modal="true" aria-labelledby="fk-fb-title">
  <button type="button" class="fk-fb_close" data-fk-close aria-label="Close feedback">${ICO_X}</button>
  <div class="fk-fb_view">
    <div class="fk-fb_tag"><span class="fk-fb_dot"></span>Feedback</div>
    <h2 class="fk-fb_title" id="fk-fb-title" tabindex="-1">Tell us what you think!</h2>
    <p class="fk-fb_lead">Found a bug, loved a game, or have an idea for a new one? We read every message.</p>
    <form class="fk-fb_form" novalidate>
      <div class="fk-fb_row">
        <label class="fk-fb_field"><span class="fk-fb_label">Name</span>
          <input class="fk-fb_input" name="name" type="text" maxlength="80" autocomplete="given-name" placeholder="Your first name"></label>
        <label class="fk-fb_field"><span class="fk-fb_label">Which game? <em>optional</em></span>
          <span class="fk-fb_select-wrap"><select class="fk-fb_input fk-fb_select" name="game">
            <option value="General">General feedback</option>
            <optgroup label="Games">${GAMES.map(opt).join("")}</optgroup>
            <optgroup label="Coming soon">${SOON.map(opt).join("")}</optgroup>
          </select></span></label>
      </div>
      <label class="fk-fb_field"><span class="fk-fb_label">Message</span>
        <textarea class="fk-fb_input fk-fb_textarea" name="message" rows="4" maxlength="4000" required placeholder="What did you like? What was tricky?"></textarea></label>
      <label class="fk-fb_field"><span class="fk-fb_label">Email <em>if you want a reply</em></span>
        <input class="fk-fb_input" name="email" type="email" maxlength="200" autocomplete="email" placeholder="grown-up@example.com"></label>
      <input class="fk-fb_trap" type="text" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="fk-fb_turnstile"></div>
      <p class="fk-fb_error" role="alert" hidden></p>
      <button type="submit" class="button fk-fb_submit"><span>Send feedback</span>${ICO_SEND}</button>
      <p class="fk-fb_note">Kids: ask a grown-up before sharing an email address.</p>
    </form>
  </div>
  <div class="fk-fb_done" hidden>
    <div class="fk-fb_done-icon">${ICO_HEART}</div>
    <h2 class="fk-fb_title" tabindex="-1">Thank you!</h2>
    <p class="fk-fb_lead">Your message is on its way to the Flowkidz team.</p>
    <button type="button" class="button fk-fb_submit" data-fk-close><span>Back to the games</span></button>
  </div>
</div>`;
    document.body.appendChild(root);
    card = root.querySelector(".fk-fb_card");
    view = root.querySelector(".fk-fb_view");
    done = root.querySelector(".fk-fb_done");
    form = root.querySelector("form");
    err = root.querySelector(".fk-fb_error");
    slot = root.querySelector(".fk-fb_turnstile");
    root.addEventListener("click", (e) => { if (e.target.closest("[data-fk-close]")) close(); });
    root.addEventListener("keydown", onKey);
    form.addEventListener("submit", submit);
  };

  /* Turnstile loads on first open, not on page load */
  const loadTurnstile = () => {
    if (tsLoading) return tsLoading;
    tsLoading = new Promise((resolve) => {
      window.onFkTurnstile = resolve;
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onFkTurnstile";
      s.async = true;
      s.onerror = () => resolve();
      document.head.appendChild(s);
    }).then(() => {
      if (window.turnstile && widget === undefined) {
        widget = turnstile.render(slot, { sitekey: SITE_KEY, theme: "light", appearance: "interaction-only", size: "flexible" });
      }
    });
    return tsLoading;
  };
  const token = () => new Promise((resolve) => {
    const t0 = Date.now();
    const poll = () => {
      const v = widget !== undefined && window.turnstile ? turnstile.getResponse(widget) : "";
      if (v || Date.now() - t0 > 10000) return resolve(v || "");
      setTimeout(poll, 200);
    };
    poll();
  });

  const focusables = () => [...card.querySelectorAll("button, [href], input:not(.fk-fb_trap), select, textarea, [tabindex]:not([tabindex='-1'])")]
    .filter((el) => !el.disabled && el.offsetParent !== null);
  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key !== "Tab") return;
    const f = focusables();
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  const open = (game) => {
    if (!root) build();
    if (!root.hidden) return;
    opener = document.activeElement;
    if (game) form.game.value = game;
    view.hidden = false;
    done.hidden = true;
    err.hidden = true;
    root.hidden = false;
    document.documentElement.classList.add("fk-fb-open");
    if (window.lenis) window.lenis.stop();
    if (G && !reduce) {
      G.fromTo(root.querySelector(".fk-fb_backdrop"), { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power1.out" });
      G.fromTo(card, { y: 40, scale: 0.92, rotation: -2, opacity: 0 }, { y: 0, scale: 1, rotation: 0, opacity: 1, duration: 0.55, ease: "back.out(1.8)", clearProps: "transform,opacity" });
    }
    // touch screens: don't pop the keyboard over the form straight away
    setTimeout(() => (matchMedia("(pointer: coarse)").matches ? view.querySelector(".fk-fb_title") : form.name).focus(), 50);
    loadTurnstile();
  };

  const close = () => {
    if (!root || root.hidden) return;
    const finish = () => {
      root.hidden = true;
      document.documentElement.classList.remove("fk-fb-open");
      if (window.lenis) window.lenis.start();
      if (location.hash === "#feedback") history.replaceState(null, "", location.pathname + location.search);
      if (opener && opener.focus) opener.focus();
    };
    if (G && !reduce) {
      G.to(root.querySelector(".fk-fb_backdrop"), { opacity: 0, duration: 0.2 });
      G.to(card, { y: 30, scale: 0.95, opacity: 0, duration: 0.2, ease: "power2.in", onComplete: finish });
    } else finish();
  };

  const showError = (msg, el) => {
    err.textContent = msg;
    err.hidden = false;
    if (el) el.focus();
    if (G && !reduce) G.fromTo(err, { x: -6 }, { x: 0, duration: 0.4, ease: "elastic.out(1,.4)" });
  };

  async function submit(e) {
    e.preventDefault();
    if (form.dataset.busy) return;
    err.hidden = true;
    const message = form.message.value.trim();
    const email = form.email.value.trim();
    if (message.length < 2) return showError("Please write a message first.", form.message);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError("That email doesn't look right. You can also leave it empty.", form.email);

    form.dataset.busy = "1";
    const btn = form.querySelector(".fk-fb_submit");
    btn.disabled = true;
    btn.firstElementChild.textContent = "Sending…";
    await loadTurnstile();
    const body = new FormData();
    ["name", "game", "message", "email", "company"].forEach((k) => body.append(k, form.elements[k].value.trim()));
    body.append("cf-turnstile-response", await token());
    let res = {};
    try {
      res = await (await fetch("/api/feedback", { method: "POST", body })).json();
    } catch {}
    delete form.dataset.busy;
    btn.disabled = false;
    btn.firstElementChild.textContent = "Send feedback";
    if (res.ok) {
      form.reset();
      view.hidden = true;
      done.hidden = false;
      done.querySelector(".fk-fb_title").focus();
      if (G && !reduce) {
        G.fromTo(done.querySelector(".fk-fb_done-icon"), { scale: 0, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.7, ease: "back.out(3)" });
        G.fromTo(done.querySelectorAll(".fk-fb_title, .fk-fb_lead, .fk-fb_submit"), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power3.out", clearProps: "transform,opacity" });
      }
    } else {
      showError(res.error === "invalid-email" ? "That email doesn't look right. You can also leave it empty." : "Oops, that didn't send. Please try again in a moment.");
    }
    if (!res.ok && widget !== undefined && window.turnstile) turnstile.reset(widget);
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-fk-feedback], a[href='#feedback']");
    if (!t) return;
    e.preventDefault();
    open(t.getAttribute("data-fk-game"));
  });
  if (location.hash === "#feedback") open();
})();
