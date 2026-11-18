(function () {
  const AVATARS = {
    kuromi: "assets/avatar-kuromi.png",
    usagi: "assets/avatar-usagi.png",
    bananya: "assets/avatar-bananya.png",
    nyan: "assets/avatar-nyan.png",
    jiji: "assets/avatar-jiji.png"
  };
  const EMO = ["😔", "😕", "😐", "🙂", "☺️"];

  const screens = QUIZ.screens;
  let index = 0;
  let answers = {}; // id -> { value, detail }
  let submitting = false;
  let submitted = false;

  const els = {};

  function load() {
    try {
      const raw = localStorage.getItem(QUIZ.storageKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && typeof data === "object") {
        answers = data.answers || {};
        if (typeof data.index === "number" && data.index >= 0 && data.index < screens.length) {
          index = data.index;
        }
        submitted = !!data.submitted;
      }
    } catch (e) { /* start fresh */ }
  }

  function save() {
    try {
      localStorage.setItem(QUIZ.storageKey, JSON.stringify({
        answers,
        index,
        submitted,
        updatedAt: new Date().toISOString()
      }));
    } catch (e) { /* ignore quota */ }
  }

  function clearStorage() {
    answers = {};
    submitted = false;
    try { localStorage.removeItem(QUIZ.storageKey); } catch (e) {}
  }

  function isQuestion(s) {
    return s && !["welcome", "info", "thanks"].includes(s.type);
  }

  function questionNumber(i) {
    let n = 0;
    for (let k = 0; k <= i; k++) if (isQuestion(screens[k])) n++;
    return n;
  }

  function hasAnswer(id) {
    const a = answers[id];
    if (!a) return false;
    if (a.value === null || a.value === undefined) return false;
    if (typeof a.value === "string") return a.value.trim().length > 0;
    if (typeof a.value === "number") return !Number.isNaN(a.value);
    return true;
  }

  function canAdvance(s) {
    if (!s) return false;
    if (s.type === "welcome" || s.type === "info") return true;
    if (s.type === "thanks") return !submitting;
    return hasAnswer(s.id);
  }

  function setTheme(theme) {
    document.body.classList.remove("playful", "night");
    document.body.classList.add(theme === "night" ? "night" : "playful");
  }

  function sectionOf(s) {
    return s.section ? QUIZ.sections[s.section] : null;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function guideHtml(sec, extraClass) {
    if (!sec) return "";
    if (sec.host === "all") {
      return `<div class="friends" aria-hidden="true">
        <img src="${AVATARS.kuromi}" alt="" style="z-index:2">
        <img src="${AVATARS.bananya}" alt="" style="z-index:5">
        <img src="${AVATARS.usagi}" alt="" style="z-index:3">
        <img src="${AVATARS.jiji}" alt="" style="z-index:2">
      </div>`;
    }
    const src = AVATARS[sec.host];
    return `<div class="guide ${extraClass || ""}">
      <img class="ava" src="${src}" alt="">
      <div class="bubble">${sec.bubble}</div>
    </div>`;
  }

  function renderProgress() {
    const s = screens[index];
    const top = els.topbar;
    if (s.type === "welcome") {
      top.hidden = true;
      return;
    }
    top.hidden = false;
    els.back.hidden = index === 0;
    if (s.type === "thanks") {
      els.progMeta.innerHTML = `<span>Готово</span><span>${QUIZ.questionCount} из ${QUIZ.questionCount}</span>`;
      els.trailFill.style.width = "100%";
      els.trailNyan.style.left = "100%";
      return;
    }
    const sec = sectionOf(s);
    const qn = isQuestion(s) ? questionNumber(index) : Math.max(0, questionNumber(index));
    const pct = Math.max(2, Math.round((qn / QUIZ.questionCount) * 100));
    els.progMeta.innerHTML = `<span>${sec ? escapeHtml(sec.short) : ""}</span><span>${qn} из ${QUIZ.questionCount}</span>`;
    els.trailFill.style.width = pct + "%";
    els.trailNyan.style.left = pct + "%";
  }

  function render() {
    const s = screens[index];
    const sec = sectionOf(s);
    const theme = s.theme || (sec && sec.theme) || "playful";
    setTheme(theme);
    renderProgress();
    els.screen.innerHTML = screenHtml(s, sec);
    bindScreen(s);
    updateNext(s);
    els.screen.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function screenHtml(s, sec) {
    if (s.type === "welcome") {
      return `
        <img class="nyan-hero" src="assets/nyan-fly.png" alt="">
        <h1 class="hero-title">${escapeHtml(s.title)}</h1>
        <p class="hero-sub">${escapeHtml(s.subtitle)}</p>
        <div class="friends" aria-hidden="true">
          <img src="${AVATARS.nyan}" alt="" style="z-index:1">
          <img src="${AVATARS.kuromi}" alt="" style="z-index:2">
          <img src="${AVATARS.bananya}" alt="" style="z-index:5">
          <img src="${AVATARS.usagi}" alt="" style="z-index:3">
          <img src="${AVATARS.jiji}" alt="" style="z-index:2">
        </div>
        <div class="intro">
          <p class="dear">Ангелина, здесь нет правильных или неправильных ответов.</p>
          <p>Тебе не нужно стараться выглядеть лучше или скрывать что-то, чтобы не расстроить близких.</p>
          <p>Я хочу понять, что с тобой происходит, что ты чувствуешь и какая помощь тебе нужна. Отвечай настолько честно, насколько можешь. Если не знаешь ответа, так и напиши.</p>
        </div>
        <div class="foot-note">
          <button class="btn-start" type="button" data-next>Начать</button>
        </div>`;
    }
    if (s.type === "info") {
      return `${guideHtml(sec)}
        <div class="reassure">${escapeHtml(s.text)}</div>
        <div class="foot-note">
          <button class="btn-next" type="button" data-next>Дальше</button>
        </div>`;
    }
    if (s.type === "thanks") {
      if (submitted) {
        return `
          <img class="nyan-hero" src="assets/nyan-fly.png" alt="">
          ${guideHtml(sec)}
          <h1 class="hero-title">${escapeHtml(s.title)}</h1>
          <p class="thanks-text">${escapeHtml(s.text)}</p>
          <p class="status-msg ok">Ответы отправлены. Спасибо.</p>`;
      }
      return `
        <img class="nyan-hero" src="assets/nyan-fly.png" alt="">
        ${guideHtml(sec)}
        <h1 class="hero-title">${escapeHtml(s.title)}</h1>
        <p class="thanks-text">${escapeHtml(s.text)}</p>
        <div class="foot-note">
          <button class="btn-start" type="button" data-submit>Отправить</button>
          <div class="status-msg" data-status hidden></div>
        </div>`;
    }

    const chip = sec ? `<div class="section-chip">Часть ${s.section} · ${escapeHtml(sec.title)}</div>` : "";
    const hint = s.hint ? `<div class="hint">${escapeHtml(s.hint)}</div>` : "";
    let body = "";
    const cur = answers[s.id] || {};

    if (s.type === "yn") {
      const opts = QUIZ.yn;
      body = `<div class="choice-row">
        ${opts.filter(o => o.kind !== "idk").map(o => choiceBtn(o, cur.value)).join("")}
      </div>
      ${opts.filter(o => o.kind === "idk").map(o => choiceBtn(o, cur.value)).join("")}`;
      if (s.optionalDetail) body += detailBox(s, cur);
    } else if (s.type === "chips") {
      body = `<div class="chips">
        ${s.options.map(opt => {
          const sel = cur.value === opt ? " selected" : "";
          return `<button type="button" class="chip${sel}" data-choice="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`;
        }).join("")}
      </div>`;
      if (s.optionalDetail) body += detailBox(s, cur);
    } else if (s.type === "slider") {
      const set = typeof cur.value === "number";
      const val = set ? cur.value : null;
      const mid = (s.min + s.max) / 2;
      const pos = set ? ((val - s.min) / (s.max - s.min)) * 100 : 50;
      const label = set ? (s.labels && s.labels[val]) || "" : "выбери число";
      const display = set ? String(val) : "—";
      body = `<div class="slider-wrap" data-slider>
        <div class="slider-value">
          <div class="num">${escapeHtml(display)}</div>
          <div class="label">${escapeHtml(label)}</div>
        </div>
        <div class="emo-row" aria-hidden="true">
          ${EMO.map((e, i) => `<span data-emo="${i}">${e}</span>`).join("")}
        </div>
        <div class="track-ui" data-track role="slider" tabindex="0"
             aria-valuemin="${s.min}" aria-valuemax="${s.max}"
             aria-valuenow="${set ? val : ""}" aria-label="${escapeHtml(s.question)}">
          <div class="bar"></div>
          <div class="ticks">${Array.from({length: s.max - s.min + 1}, () => "<i></i>").join("")}</div>
          <div class="thumb${set ? "" : " unset"}" style="left:${pos}%" data-thumb>${set ? emoFor(val, s) : ""}</div>
        </div>
        <div class="scale-ends"><span>${escapeHtml(s.left)}</span><span>${escapeHtml(s.right)}</span></div>
      </div>`;
    } else if (s.type === "text") {
      body = `<textarea class="textarea" data-text rows="5" placeholder="${escapeHtml(s.placeholder || "Напиши своими словами…")}">${escapeHtml(cur.value || "")}</textarea>
        <button type="button" class="helper" data-fill-idk>Написать «Не знаю»</button>`;
    } else if (s.type === "number") {
      const v = cur.value === 0 || cur.value ? String(cur.value) : "";
      body = `<div class="num-wrap">
        <button type="button" class="num-step" data-step="-">−</button>
        <input class="num-input" data-number type="number" inputmode="decimal"
               min="${s.min}" max="${s.max}" step="${s.step || 1}" value="${escapeHtml(v)}"
               placeholder="—">
        <button type="button" class="num-step" data-step="+">+</button>
        ${s.unit ? `<span class="unit">${escapeHtml(s.unit)}</span>` : ""}
      </div>`;
    }

    return `${guideHtml(sec)}
      <div class="q-card">
        ${chip}
        <div class="question">${escapeHtml(s.question)}</div>
        ${hint}
        ${body}
      </div>
      <div class="foot-note">
        <button class="btn-next" type="button" data-next>Дальше</button>
      </div>`;
  }

  function choiceBtn(o, current) {
    const sel = current === o.value ? " selected" : "";
    return `<button type="button" class="choice ${o.kind}${sel}" data-choice="${escapeHtml(o.value)}">${escapeHtml(o.value)}</button>`;
  }

  function detailBox(s, cur) {
    return `<div class="soft-label">${escapeHtml(s.detailPrompt || "Если хочешь, расскажи подробнее. Это необязательно.")}</div>
      <textarea class="textarea detail" data-detail rows="3" placeholder="Можно не писать">${escapeHtml(cur.detail || "")}</textarea>`;
  }

  function emoFor(val, s) {
    const t = (val - s.min) / (s.max - s.min);
    return EMO[Math.min(4, Math.max(0, Math.round(t * 4)))];
  }

  function bindScreen(s) {
    els.screen.querySelectorAll("[data-next]").forEach(btn => {
      btn.addEventListener("click", () => next());
    });
    const submitBtn = els.screen.querySelector("[data-submit]");
    if (submitBtn) submitBtn.addEventListener("click", () => submit());

    if (s.type === "yn" || s.type === "chips") {
      els.screen.querySelectorAll("[data-choice]").forEach(btn => {
        btn.addEventListener("click", () => {
          setValue(s.id, btn.getAttribute("data-choice"));
          render();
        });
      });
    }
    const detail = els.screen.querySelector("[data-detail]");
    if (detail) {
      detail.addEventListener("input", () => {
        if (!answers[s.id]) answers[s.id] = { value: answers[s.id] && answers[s.id].value };
        if (!answers[s.id]) answers[s.id] = {};
        const a = answers[s.id] || (answers[s.id] = {});
        a.detail = detail.value;
        save();
      });
    }
    if (s.type === "text") {
      const ta = els.screen.querySelector("[data-text]");
      ta.addEventListener("input", () => {
        setValue(s.id, ta.value);
        updateNext(s);
      });
      const fill = els.screen.querySelector("[data-fill-idk]");
      if (fill) fill.addEventListener("click", () => {
        ta.value = "Не знаю";
        setValue(s.id, "Не знаю");
        updateNext(s);
        ta.focus();
      });
    }
    if (s.type === "number") {
      const inp = els.screen.querySelector("[data-number]");
      const apply = () => {
        const v = inp.value.trim();
        if (v === "") {
          if (answers[s.id]) { delete answers[s.id].value; if (!answers[s.id].detail) delete answers[s.id]; }
          save(); updateNext(s); return;
        }
        const n = Number(v);
        if (Number.isNaN(n)) { updateNext(s); return; }
        const clamped = Math.min(s.max, Math.max(s.min, n));
        setValue(s.id, clamped);
        if (String(clamped) !== v) inp.value = String(clamped);
        updateNext(s);
      };
      inp.addEventListener("input", apply);
      inp.addEventListener("change", apply);
      els.screen.querySelectorAll("[data-step]").forEach(btn => {
        btn.addEventListener("click", () => {
          const step = Number(s.step || 1);
          const dir = btn.getAttribute("data-step") === "+" ? 1 : -1;
          let cur = answers[s.id] && typeof answers[s.id].value === "number" ? answers[s.id].value : (dir > 0 ? s.min : s.min);
          if (answers[s.id] && typeof answers[s.id].value === "number") cur = answers[s.id].value + dir * step;
          else cur = dir > 0 ? (s.min || 0) : (s.min || 0);
          cur = Math.min(s.max, Math.max(s.min, Math.round(cur / step) * step));
          // fix float
          cur = Number(cur.toFixed(4));
          inp.value = String(cur);
          setValue(s.id, cur);
          updateNext(s);
        });
      });
    }
    if (s.type === "slider") {
      const track = els.screen.querySelector("[data-track]");
      const bindPos = (clientX) => {
        const rect = track.getBoundingClientRect();
        const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        const val = Math.round(s.min + t * (s.max - s.min));
        setValue(s.id, val);
        // update UI without full rerender to keep dragging smooth
        const pos = ((val - s.min) / (s.max - s.min)) * 100;
        const thumb = els.screen.querySelector("[data-thumb]");
        thumb.style.left = pos + "%";
        thumb.classList.remove("unset");
        thumb.textContent = emoFor(val, s);
        els.screen.querySelector(".slider-value .num").textContent = String(val);
        els.screen.querySelector(".slider-value .label").textContent = (s.labels && s.labels[val]) || "";
        updateNext(s);
      };
      let dragging = false;
      const onPtr = (e) => { bindPos(e.clientX); };
      track.addEventListener("pointerdown", (e) => {
        dragging = true;
        track.setPointerCapture(e.pointerId);
        onPtr(e);
      });
      track.addEventListener("pointermove", (e) => { if (dragging) onPtr(e); });
      track.addEventListener("pointerup", () => { dragging = false; });
      track.addEventListener("pointercancel", () => { dragging = false; });
      track.addEventListener("keydown", (e) => {
        let val = (answers[s.id] && typeof answers[s.id].value === "number") ? answers[s.id].value : s.min;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") { val = Math.min(s.max, val + 1); e.preventDefault(); }
        else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { val = Math.max(s.min, val - 1); e.preventDefault(); }
        else return;
        setValue(s.id, val);
        render();
        els.screen.querySelector("[data-track]").focus();
      });
      els.screen.querySelectorAll("[data-emo]").forEach(el => {
        el.addEventListener("click", () => {
          const i = Number(el.getAttribute("data-emo"));
          const val = Math.round(s.min + (i / 4) * (s.max - s.min));
          setValue(s.id, val);
          render();
        });
      });
    }
  }

  function setValue(id, value) {
    if (!answers[id]) answers[id] = {};
    answers[id].value = value;
    save();
  }

  function updateNext(s) {
    const btn = els.screen.querySelector("[data-next], [data-submit]");
    if (!btn) return;
    btn.disabled = !canAdvance(s) || submitting;
  }

  function next() {
    const s = screens[index];
    if (!canAdvance(s)) return;
    if (index < screens.length - 1) {
      index += 1;
      save();
      render();
    }
  }

  function back() {
    if (index > 0) {
      index -= 1;
      save();
      render();
    }
  }

  function formatEmail() {
    const when = new Date();
    const lines = [];
    lines.push("Анкетка о самочувствии");
    lines.push("Дата отправки: " + when.toLocaleString("ru-RU", { timeZone: "Europe/Lisbon" }) + " (Europe/Lisbon)");
    lines.push("");
    let currentSec = null;
    screens.forEach((s) => {
      if (!isQuestion(s)) return;
      const sec = sectionOf(s);
      if (sec && sec.title !== currentSec) {
        currentSec = sec.title;
        lines.push("");
        lines.push("=== " + s.section + ". " + currentSec + " ===");
        lines.push("");
      }
      const a = answers[s.id] || {};
      let val = a.value;
      if (val === undefined || val === null || (typeof val === "string" && !val.trim())) val = "—";
      lines.push("Вопрос: " + (s.original || s.question));
      lines.push("Ответ: " + val);
      if (a.detail && String(a.detail).trim()) {
        lines.push("Подробнее: " + String(a.detail).trim());
      }
      lines.push("");
    });
    return lines.join("\n");
  }

  async function submit() {
    if (submitting || submitted) return;
    // ensure all questions answered
    const missing = screens.filter(s => isQuestion(s) && !hasAnswer(s.id));
    if (missing.length) {
      const first = screens.indexOf(missing[0]);
      index = first;
      save();
      render();
      return;
    }
    submitting = true;
    const btn = els.screen.querySelector("[data-submit]");
    const status = els.screen.querySelector("[data-status]");
    if (btn) { btn.disabled = true; btn.textContent = "Отправляю…"; }
    if (status) { status.hidden = false; status.className = "status-msg"; status.textContent = "Отправляю ответы…"; }
    const payload = {
      _subject: "Анкетка: ответы получены",
      _template: "box",
      _captcha: "false",
      _honey: "",
      name: "Анкетка",
      submitted_at: new Date().toISOString(),
      message: formatEmail()
    };
    try {
      const res = await fetch(QUIZ.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      });
      let data = null;
      try { data = await res.json(); } catch (e) { data = null; }
      const ok = res.ok && data && String(data.success) !== "false";
      if (!ok) throw new Error((data && data.message) || "Ошибка отправки");
      submitting = false;
      submitted = true;
      answers = {};
      try { localStorage.removeItem(QUIZ.storageKey); } catch (e) {}
      // keep submitted flag only in this session; live page starts empty on new visit
      render();
    } catch (err) {
      submitting = false;
      save();
      if (btn) { btn.disabled = false; btn.textContent = "Попробовать ещё раз"; }
      if (status) {
        status.hidden = false;
        status.className = "status-msg error";
        status.textContent = "Не получилось отправить. Ответы сохранены на этом устройстве — нажми ещё раз, когда будет интернет.";
      }
    }
  }

  function init() {
    els.topbar = document.getElementById("topbar");
    els.back = document.getElementById("btn-back");
    els.progMeta = document.getElementById("prog-meta");
    els.trailFill = document.getElementById("trail-fill");
    els.trailNyan = document.getElementById("trail-nyan");
    els.screen = document.getElementById("screen");
    els.back.addEventListener("click", back);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        const tag = (e.target && e.target.tagName) || "";
        if (tag === "TEXTAREA") return;
        const s = screens[index];
        if (s.type === "thanks") return;
        if (canAdvance(s)) { e.preventDefault(); next(); }
      }
    });
    load();
    if (submitted) {
      // previous session already submitted and leftover flag — start clean
      submitted = false;
      answers = {};
      index = 0;
      try { localStorage.removeItem(QUIZ.storageKey); } catch (e) {}
    }
    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
