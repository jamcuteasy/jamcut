/* Jamcut 소개 사이트 — 움직임.

   공개할 때 채울 값 세 가지:

   - DOWNLOAD_URL : 설치 파일 주소(예: GitHub Releases 의 Jamcut_Setup.exe 링크). 비어 있으면 [받기] 단추가 메일 요청으로 연결됩니다.

   - DOWNLOAD_NOTE: [받기] 단추 아래에 보이는 한 줄(버전·크기).

   - DONATE_URL   : 후원 페이지 주소(Buy Me a Coffee · Ko-fi · GitHub Sponsors 등). 비어 있으면 후원 상자가 보이지 않습니다. */

const DOWNLOAD_URL = "https://github.com/jamcuteasy/jamcut/releases/latest/download/Jamcut_Setup.exe";   // 늘 최신 릴리스의 설치 파일

const DOWNLOAD_NOTE = { ko: "무료 · 버전 3.0.0 · Windows 10/11 · 약 1.4GB", en: "Free · Version 3.0.0 · Windows 10/11 · about 1.4 GB" };

const DONATE_URL = "https://ko-fi.com/jamcut";

const CONTACT = "jamecuteasy@gmail.com";



(() => {

  "use strict";

  const $ = (s, r = document) => r.querySelector(s);

  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const fine = matchMedia("(pointer: fine)").matches;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  const lerp = (a, b, t) => a + (b - a) * t;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const mouse = { x: -9999, y: -9999, moved: 0 };

  addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.moved = performance.now(); }, { passive: true });



  /* ───────── 언어(한국어 · English) ─────────

     HTML 요소는 data-en(안쪽 HTML)·data-en-title·data-en-aria·data-en-href·data-en-content 에 영어를 둔다. 한국어 원문은 처음 읽을 때 기억해 둔다.

     스크립트 안의 글은 L(한국어, 영어) 로 고르고, 언어가 바뀌면 onLang 에 등록한 함수들이 다시 그린다. */

  const ATTRS = [["title", "title"], ["aria", "aria-label"], ["href", "href"], ["content", "content"]];

  const pickLang = () => {

    try {

      const q = new URLSearchParams(location.search).get("lang");

      if (q === "ko" || q === "en") return q;

      const s = localStorage.getItem("jamcut-lang");

      if (s === "ko" || s === "en") return s;

    } catch (e) { /* 저장소를 못 쓰는 창(사생활 보호 모드 등) */ }

    return (navigator.language || "ko").toLowerCase().startsWith("ko") ? "ko" : "en";

  };

  let LANG = pickLang();

  const L = (ko, en) => (LANG === "en" ? en : ko);

  const langHooks = [];

  const onLang = (fn) => langHooks.push(fn);

  function rememberKorean() {

    for (const el of $$("[data-en]")) if (el.dataset.ko === undefined) el.dataset.ko = el.tagName === "TITLE" ? el.textContent : el.innerHTML;

    for (const [k, a] of ATTRS) for (const el of $$(`[data-en-${k}]`)) if (el.dataset[`ko${k}`] === undefined) el.dataset[`ko${k}`] = el.getAttribute(a) || "";

  }

  function applyLang(lang, save) {

    LANG = lang;

    document.documentElement.lang = lang;

    for (const el of $$("[data-en]")) {

      const v = lang === "en" ? el.dataset.en : el.dataset.ko;

      if (el.tagName === "TITLE") { document.title = v; continue; }

      if (el.innerHTML === v) continue;

      el.innerHTML = v;

      if (el.matches(".split")) splitWords(el);

    }

    for (const [k, a] of ATTRS) for (const el of $$(`[data-en-${k}]`)) el.setAttribute(a, lang === "en" ? el.dataset[`en${k[0].toUpperCase()}${k.slice(1)}`] : el.dataset[`ko${k}`]);

    for (const b of $$("[data-lang]")) b.setAttribute("aria-pressed", String(b.dataset.lang === lang));

    if (save) {

      try { localStorage.setItem("jamcut-lang", lang); } catch (e) { /* 무시 */ }

      try { const u = new URL(location.href); u.searchParams.set("lang", lang); history.replaceState(null, "", u); } catch (e) { /* 무시 */ }

    }

    langHooks.forEach((fn) => fn(lang));

    document.documentElement.classList.add("i18n");

  }

  function langButtons() {

    for (const b of $$("[data-lang]")) b.addEventListener("click", () => { if (b.dataset.lang !== LANG) applyLang(b.dataset.lang, true); });

  }



  /* 화면에 보이는 동안만 돌리기 */

  function whileVisible(el, on, off) {

    new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? on() : off())), { rootMargin: "80px" }).observe(el);

  }



  /* ───────── 복셀 물결 배경 ─────────

     휘어진 수평선 위에 네모 점들이 잔잔한 바다처럼 일렁인다. 마우스 아래가 부풀고, 누르면 물결이 퍼진다. */

  function voxel(canvas, opt) {

    const P = Object.assign({ horizon: 0.18, camY: 7, depth: 2.4, px: 13, swell: 62, speed: 1, host: canvas.parentElement }, opt);

    const ctx = canvas.getContext("2d");

    const N = 36;

    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

    const stops = [[0, [18, 15, 23]], [0.5, [72, 34, 230]], [0.82, [177, 158, 239]], [1, [246, 240, 255]]];

    const LUT = Array.from({ length: N }, (_, k) => {

      const v = k / (N - 1);

      let i = 0;

      while (i < stops.length - 2 && v > stops[i + 1][0]) i++;

      const [a, ca] = stops[i], [b, cb] = stops[i + 1];

      const c = mix(ca, cb, clamp((v - a) / (b - a), 0, 1));

      return `rgb(${c[0]},${c[1]},${c[2]})`;

    });

    const buckets = Array.from({ length: N }, () => []);

    let W = 0, H = 0, dpr = 1, raf = 0, live = false, q = 1, slow = 0, last = 0;

    const ptr = { x: 0, z: -1, a: 0, ta: 0 };

    const ring = { x: 0, z: 0, t: -9 };



    function size() {

      const r = canvas.getBoundingClientRect();

      W = r.width; H = r.height;

      dpr = Math.min(devicePixelRatio || 1, 1.5);

      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);

    }

    function geom() {

      const f = H * 0.9, hy = H * (P.horizon + (W < 700 ? 0.12 : 0));

      const zn = (P.camY * f) / ((H - hy) * 1.05), zf = zn * P.depth;

      return { f, hy, zn, zf };

    }

    function toWorld(cx, cy) {

      const r = canvas.getBoundingClientRect(), g = geom();

      const mx = cx - r.left, my = cy - r.top;

      if (my < g.hy + 12 || my > H + 40 || mx < -40 || mx > W + 40) return null;

      const z = clamp((P.camY * g.f) / (my - g.hy), g.zn, g.zf);

      return { x: ((mx - W / 2) * z) / g.f, z };

    }

    P.host.addEventListener("pointermove", (e) => {

      const w = toWorld(e.clientX, e.clientY);

      if (w) { ptr.x = lerp(ptr.x, w.x, ptr.a < 0.05 ? 1 : 0.35); ptr.z = lerp(ptr.z < 0 ? w.z : ptr.z, w.z, ptr.a < 0.05 ? 1 : 0.35); ptr.ta = 1; }

      else ptr.ta = 0;

    }, { passive: true });

    P.host.addEventListener("pointerleave", () => (ptr.ta = 0));

    P.host.addEventListener("pointerdown", (e) => {

      const w = toWorld(e.clientX, e.clientY);

      if (w) { ring.x = w.x; ring.z = w.z; ring.t = performance.now() / 1000; }

    });



    function draw(now) {

      const t = (now / 1000) * P.speed;

      const { f, hy, zn, zf } = geom();

      const step = ((W < 700 ? 9 : P.px) * q * zn) / f;

      const amp = (P.swell * zn) / f;

      const halfFar = ((W / 2) * zf) / f;

      const curv = (0.17 * clamp((W / H) * 0.75, 0.3, 1) * H * zf) / f / (halfFar * halfFar);

      const cx = W / 2;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, W, H);

      for (let k = 0; k < N; k++) buckets[k].length = 0;



      const maxI = Math.ceil((1.06 * halfFar) / step);

      const n = 2 * maxI + 1;

      const s1 = new Float32Array(n), s2 = new Float32Array(n), c2 = new Float32Array(n), s3 = new Float32Array(n);

      for (let i = 0; i < n; i++) {

        const x = (i - maxI) * step;

        s1[i] = Math.sin(x * 0.5 + t * 0.42);

        s2[i] = Math.sin(x * 0.27 - t * 0.3); c2[i] = Math.cos(x * 0.27 - t * 0.3);

        s3[i] = Math.sin(x * 1.1 + t * 0.7);

      }

      ptr.a = lerp(ptr.a, ptr.ta, 0.07);

      const pr2 = Math.pow((130 * (ptr.z > 0 ? ptr.z : zn)) / f, 2);

      const ra = performance.now() / 1000 - ring.t, ringOn = ra < 2.4;

      const rr = ra * 7, rw = 1.1, rAmp = ringOn ? 1.3 * (1 - ra / 2.4) : 0;



      for (let z = zf; z >= zn; z -= step) {

        const d = (z - zn) / (zf - zn);

        const farFade = clamp((1 - d) / 0.16, 0, 1);

        const c1z = Math.cos(z * 0.5 - t * 0.33), s2z = Math.sin(z * 0.33 + t * 0.12), c2z = Math.cos(z * 0.33 + t * 0.12), s3z = Math.sin(z * 0.9 - t * 0.5);

        const half = (1.06 * (W / 2) * z) / f;

        const i0 = Math.max(-maxI, Math.ceil(-half / step)), i1 = Math.min(maxI, Math.floor(half / step));

        const k = f / z, vs = Math.max(1.2, step * k * 0.56);

        for (let i = i0; i <= i1; i++) {

          const x = i * step, j = i + maxI;

          let h = 0.56 * s1[j] * c1z + 0.32 * (s2[j] * c2z + c2[j] * s2z) + 0.12 * s3[j] * s3z;

          if (ptr.a > 0.01) {

            const dx = x - ptr.x, dz = z - ptr.z, r2 = dx * dx + dz * dz;

            if (r2 < pr2 * 6) h += 1.15 * ptr.a * Math.exp(-r2 / pr2);

          }

          if (ringOn) {

            const dx = x - ring.x, dz = z - ring.z, dist = Math.sqrt(dx * dx + dz * dz) - rr;

            if (dist > -3 * rw && dist < 3 * rw) h += rAmp * Math.exp(-(dist * dist) / (rw * rw));

          }

          const y = h * amp - curv * x * x;

          const sx = cx + x * k, sy = hy + (P.camY - y) * k;

          if (sy > H + vs) continue;

          let b = clamp(0.5 + 0.5 * h, 0, 1.25);

          b = b * b * (0.75 + 0.6 * d);

          const edge = 1 - 0.45 * Math.pow(Math.abs(sx - cx) / (W / 2), 2.2);

          const v = clamp((0.13 + 0.92 * b) * farFade * edge, 0, 1);

          const bi = (v * (N - 1)) | 0;

          if (bi < 2) continue;

          buckets[bi].push(sx - vs / 2, sy - vs / 2, vs);

        }

      }

      for (let k = 2; k < N; k++) {

        const a = buckets[k];

        if (!a.length) continue;

        ctx.fillStyle = LUT[k];

        for (let i = 0; i < a.length; i += 3) ctx.fillRect(a[i], a[i + 1], a[i + 2], a[i + 2]);

      }

    }

    function loop(now) {

      if (!live) return;

      const dt = now - last; last = now;

      if (dt > 26 && dt < 200) { if (++slow > 24 && q < 1.9) { q += 0.2; slow = 0; } } else slow = Math.max(0, slow - 1);  // 느린 기기에서는 점을 성기게

      draw(now);

      raf = requestAnimationFrame(loop);

    }

    size();

    addEventListener("resize", () => { size(); if (calm) draw(4200); });

    if (calm) { draw(4200); return; }

    whileVisible(canvas, () => { if (!live) { live = true; last = performance.now(); raf = requestAnimationFrame(loop); } }, () => { live = false; cancelAnimationFrame(raf); });

  }



  /* ───────── 점 격자: 마우스 근처의 점이 밝아지며 밀려난다 ───────── */

  function dots() {

    const c = $("#dots"), ctx = c.getContext("2d");

    const GAP = 28, R = 170;

    let W, H, dpr, px = -9999, py = -9999, e = 0, lastY = -1, raf = 0;

    function size() { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr; lastY = -1; kick(); }

    function draw() {

      raf = 0;

      const active = performance.now() - mouse.moved < 1400 && fine;

      px = lerp(px, mouse.x, 0.2); py = lerp(py, mouse.y, 0.2);

      e = lerp(e, active ? 1 : 0, 0.08);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, W, H);

      const oy = -(scrollY % GAP), ox = ((W % GAP) / 2) | 0;

      ctx.fillStyle = "rgba(255,255,255,.075)";

      for (let y = oy; y < H + GAP; y += GAP) for (let x = ox; x < W; x += GAP) {

        const dx = x - px, dy = y - py, d2 = dx * dx + dy * dy;

        if (e > 0.02 && d2 < R * R) continue;

        ctx.fillRect(x - 1, y - 1, 2, 2);

      }

      if (e > 0.02) {

        const x0 = Math.floor((px - R - ox) / GAP) * GAP + ox, y0 = Math.floor((py - R - oy) / GAP) * GAP + oy;

        for (let y = y0; y < py + R + GAP; y += GAP) for (let x = x0; x < px + R + GAP; x += GAP) {

          const dx = x - px, dy = y - py, d = Math.hypot(dx, dy);

          if (d >= R) { continue; }

          const k = (1 - d / R) * (1 - d / R) * e, push = k * 9, s = 2 + k * 3.2;

          const ux = d ? dx / d : 0, uy = d ? dy / d : 0;

          ctx.fillStyle = `rgba(${200 + 46 * k | 0},${180 + 40 * k | 0},255,${0.055 + 0.85 * k})`;

          ctx.fillRect(x + ux * push - s / 2, y + uy * push - s / 2, s, s);

        }

      }

      lastY = scrollY;

      if (e > 0.02 || Math.abs(px - mouse.x) > 0.5 || Math.abs(py - mouse.y) > 0.5) kick();

    }

    function kick() { if (!raf) raf = requestAnimationFrame(draw); }

    addEventListener("resize", size);

    addEventListener("scroll", kick, { passive: true });

    addEventListener("pointermove", kick, { passive: true });

    size();

  }



  /* ───────── 클릭 불꽃 ───────── */

  function sparks() {

    if (calm) return;

    const c = $("#sparks"), ctx = c.getContext("2d");

    let list = [], raf = 0, dpr = 1;

    const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); c.width = innerWidth * dpr; c.height = innerHeight * dpr; };

    addEventListener("resize", size); size();

    function draw(now) {

      raf = 0;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, innerWidth, innerHeight);

      list = list.filter((s) => now - s.t < 460);

      ctx.lineCap = "round"; ctx.lineWidth = 2;

      for (const s of list) {

        const p = (now - s.t) / 460, ease = 1 - Math.pow(1 - p, 3), r0 = 8 + ease * 22, len = 9 * (1 - ease);

        ctx.strokeStyle = `rgba(214,196,255,${1 - p})`;

        ctx.beginPath();

        for (let i = 0; i < 8; i++) {

          const a = (i / 8) * Math.PI * 2 + s.rot;

          ctx.moveTo(s.x + Math.cos(a) * r0, s.y + Math.sin(a) * r0);

          ctx.lineTo(s.x + Math.cos(a) * (r0 + len), s.y + Math.sin(a) * (r0 + len));

        }

        ctx.stroke();

      }

      if (list.length) raf = requestAnimationFrame(draw);

    }

    addEventListener("pointerdown", (e) => { list.push({ x: e.clientX, y: e.clientY, t: performance.now(), rot: Math.random() }); if (!raf) raf = requestAnimationFrame(draw); }, { passive: true });

  }



  /* ───────── 카드 빛 · 기울기 · 자석 단추 ───────── */

  function pointerFx() {

    if (!fine) return;

    const cards = $$(".card");

    let queued = false;

    const paint = () => {

      queued = false;

      for (const el of cards) {

        const r = el.getBoundingClientRect();

        if (r.bottom < -200 || r.top > innerHeight + 200) continue;

        el.style.setProperty("--mx", `${mouse.x - r.left}px`);

        el.style.setProperty("--my", `${mouse.y - r.top}px`);

      }

    };

    const ask = () => { if (!queued) { queued = true; requestAnimationFrame(paint); } };

    addEventListener("pointermove", ask, { passive: true });

    addEventListener("scroll", ask, { passive: true });



    if (calm) return;

    const tilts = $$(".tilt").map((el) => ({ el, max: parseFloat(el.dataset.tilt) || 4, rx: 0, ry: 0, tx: 0, ty: 0 }));

    for (const t of tilts) {

      t.el.addEventListener("pointermove", (e) => {

        const r = t.el.getBoundingClientRect();

        t.ty = ((e.clientX - r.left) / r.width - 0.5) * 2 * t.max;

        t.tx = -((e.clientY - r.top) / r.height - 0.5) * 2 * t.max;

      });

      t.el.addEventListener("pointerleave", () => { t.tx = t.ty = 0; });

    }

    (function spin() {

      for (const t of tilts) {

        if (Math.abs(t.tx - t.rx) < 0.01 && Math.abs(t.ty - t.ry) < 0.01) continue;

        t.rx = lerp(t.rx, t.tx, 0.12); t.ry = lerp(t.ry, t.ty, 0.12);

        t.el.style.setProperty("--rx", t.rx.toFixed(2) + "deg");

        t.el.style.setProperty("--ry", t.ry.toFixed(2) + "deg");

      }

      requestAnimationFrame(spin);

    })();

    for (const b of $$(".magnet")) {

      b.addEventListener("pointermove", (e) => {

        const r = b.getBoundingClientRect();

        b.style.setProperty("--tx", ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + "px");

        b.style.setProperty("--ty", ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + "px");

      });

      b.addEventListener("pointerleave", () => { b.style.setProperty("--tx", "0px"); b.style.setProperty("--ty", "0px"); });

    }

  }



  /* ───────── 나타나기 · 숫자 세기 ───────── */

  function splitWords(el) {

    let i = 0;

    for (const node of [...el.childNodes]) {

        if (node.nodeType !== 3) continue;

      const frag = document.createDocumentFragment();

        node.textContent.split(/(\s+)/).forEach((part) => {

          if (!part) return;

          if (/^\s+$/.test(part)) { frag.append(" "); return; }

          const s = document.createElement("span");

          s.className = "w"; s.textContent = part; s.style.setProperty("--i", i++);

          frag.append(s);

        });

        node.replaceWith(frag);

    }

  }



  function reveal() {

    $$(".split").forEach(splitWords);

    const count = (el) => {

      const to = +el.dataset.count, t0 = performance.now(), ms = 1100;

      if (calm) { el.textContent = to; return; }

      (function tick(now) {

        const p = clamp((now - t0) / ms, 0, 1);

        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 4)));

        if (p < 1) requestAnimationFrame(tick);

      })(t0);

    };

    const io = new IntersectionObserver((es) => {

      for (const e of es) {

        if (!e.isIntersecting) continue;

        e.target.classList.add("in", "in-view");

        $$("[data-count]", e.target).forEach(count);

        if (e.target.matches("[data-count]")) count(e.target);

        io.unobserve(e.target);

      }

    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });

    $$(".split,.reveal").forEach((el) => io.observe(el));

  }



  /* ───────── 내비게이션 ───────── */

  function nav() {

    const bar = $("#nav"), links = $$(".nav-links a");

    const on = () => bar.classList.toggle("stuck", scrollY > 24);

    addEventListener("scroll", on, { passive: true }); on();

    const io = new IntersectionObserver((es) => {

      for (const e of es) if (e.isIntersecting) links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id));

    }, { rootMargin: "-45% 0px -50% 0px" });

    links.forEach((a) => { const s = $(a.getAttribute("href")); if (s) io.observe(s); });



    const get = $("#get-btn");

    const paintGet = () => {

      if (DOWNLOAD_URL) { get.href = DOWNLOAD_URL; $("#get-note").textContent = DOWNLOAD_NOTE[LANG]; }

      else { get.href = `mailto:${CONTACT}?subject=${encodeURIComponent(L("Jamcut 설치 파일 요청", "Jamcut installer request"))}`; get.firstChild.textContent = L("설치 파일 요청하기 ", "Request the installer "); }

    };

    paintGet(); onLang(paintGet);

    const donate = $("#donate");

    if (DONATE_URL && /^https:\/\//.test(DONATE_URL)) { $("#donate-btn").href = DONATE_URL; donate.hidden = false; }

  }



  /* ───────── 흐르는 꼬리표 ───────── */

  function marquee() {

    for (const m of $$("[data-marquee]")) {

      const track = $(".marquee-track", m);

      track.innerHTML += track.innerHTML;

      if (calm) continue;

      let anim = null, rate = 1, want = 1;

      const start = () => {

        if (anim) anim.cancel();

        const half = track.scrollWidth / 2 + 5;

        anim = track.animate([{ transform: "translateX(0)" }, { transform: `translateX(${-half}px)` }], { duration: half * 26, iterations: Infinity });

        anim.playbackRate = rate;

      };

      start(); onLang(() => requestAnimationFrame(start));

      m.addEventListener("pointerenter", () => (want = 0.25));

      m.addEventListener("pointerleave", () => (want = 1));

      (function ease() { if (anim && Math.abs(rate - want) > 0.01) { rate = lerp(rate, want, 0.08); anim.playbackRate = rate; } requestAnimationFrame(ease); })();

    }

  }



  /* ───────── 히어로의 앱 화면: 자동 처리가 실제처럼 흘러간다 ───────── */

  function appDemo() {

    const STEPS = [   // [한국어 이름, 영어 이름, 시간(ms), 타임라인 효과, 한국어 안내, 영어 안내]

      ["촬영 파일 조사", "Probe footage", 800, "", "촬영 파일을 살펴보는 중", "Scanning the footage"],

      ["카메라 · 오디오 싱크", "Camera · audio sync", 1500, "s-sync", "소리 파형으로 카메라 B를 카메라 A에 맞추는 중", "Lining up camera B to camera A by waveform"],

      ["메인 오디오 정리", "Main audio cleanup", 1300, "s-audio", "노이즈를 걷어내고 음량을 고르게 맞추는 중", "Removing noise and leveling loudness"],

      ["오디오 채널 점검", "Audio channel check", 600, "", "채널을 점검하는 중", "Checking audio channels"],

      ["대본 받아쓰기 (GPU)", "Transcription (GPU)", 1800, "s-text", "Whisper large-v3가 내 그래픽카드에서 받아쓰는 중", "Whisper large-v3 transcribing on your graphics card"],

      ["대본 내보내기", "Export transcript", 600, "", "블록 번호를 붙여 대본을 내보내는 중", "Exporting the transcript with block numbers"],

      ["인서트 후보 장면 모음", "Insert candidate sheets", 900, "", "인서트로 쓸 장면을 모으는 중", "Collecting scenes to use as inserts"],

      ["보조 카메라 색 보정", "Secondary camera color", 1400, "s-color", "피부톤과 옷 색을 기준으로 카메라 B를 맞추는 중", "Matching camera B by skin tone and clothing"],

      ["컷 전 전체 원본 시퀀스", "Full uncut sequence", 900, "s-full", "프리미어용 시퀀스를 쓰는 중", "Writing the Premiere sequence"],

    ];

    const STATE = { "": ["대기", "Waiting"], run: ["진행 중", "Running"], ok: ["완료", "Done"] };

    const LIVE = { busy: ["작업 중", "Working"], done: ["다 됐습니다", "All done"] };

    const FINAL_NOTE = ["전체원본_시퀀스.xml 을 만들었습니다", "Full sequence XML created"];

    const list = $("#steps"), tl = $("#tl"), note = $("#tl-note"), prog = $("#app-prog"), done = $("#app-done"), next = $("#app-next"), live = $("#app-live"), seq = $("#app-nav-seq");

    list.innerHTML = STEPS.map(() => "<li><i></i><span></span><em></em></li>").join("");

    const rows = $$("li", list);

    const wave = $("#wave");

    wave.innerHTML = Array.from({ length: 54 }, (_, i) => {

      const h = 14 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.31)) * 82 * (i % 9 < 4 ? 0.45 : 1), n = 46 + Math.abs(Math.sin(i * 0.9)) * 30;

      return `<i style="--h:${h.toFixed(0)};--n:${n.toFixed(0)}"></i>`;

    }).join("");



    let liveState = "busy", noteNow = [STEPS[0][4], STEPS[0][5]];

    const set = (i, cls) => { rows[i].className = cls; rows[i].lastChild.textContent = L(...STATE[cls]); };

    const setLive = (st) => { liveState = st; live.lastElementChild.textContent = L(...LIVE[st]); };

    const setNote = (pair) => { noteNow = pair; note.textContent = L(...pair); };

    const paint = () => {   // 언어가 바뀌면 지금 상태 그대로 글자만 다시 쓴다

      rows.forEach((r, i) => { r.firstElementChild.nextElementSibling.textContent = L(STEPS[i][0], STEPS[i][1]); r.lastChild.textContent = L(...STATE[r.className || ""]); });

      setLive(liveState); setNote(noteNow);

    };

    paint(); onLang(paint);

    const finish = () => { rows.forEach((_, i) => set(i, "ok")); tl.className = "tl s-sync s-audio s-text s-color s-full"; prog.style.width = "100%"; done.textContent = 9; next.classList.add("show"); setLive("done"); setNote(FINAL_NOTE); };

    if (calm) { finish(); return; }



    let visible = false, running = false;

    async function run() {

      if (running) return;

      running = true;

      while (visible) {

        rows.forEach((_, i) => set(i, ""));

        tl.className = "tl"; prog.style.width = "0%"; done.textContent = 0; next.classList.remove("show"); seq.classList.remove("hint");

        setLive("busy");

        await sleep(700);

        for (let i = 0; i < STEPS.length && visible; i++) {

          const [, , ms, cls, msgKo, msgEn] = STEPS[i];

          set(i, "run"); setNote([msgKo, msgEn]);

          await sleep(ms * 0.45);

          if (cls) { tl.classList.add(cls); if (cls === "s-sync") { tl.classList.add("flash-sync"); setTimeout(() => tl.classList.remove("flash-sync"), 500); } }

          await sleep(ms * 0.55);

          set(i, "ok");

          done.textContent = i + 1; prog.style.width = ((i + 1) / STEPS.length) * 100 + "%";

        }

        if (!visible) break;

        setNote(FINAL_NOTE);

        setLive("done");

        next.classList.add("show"); seq.classList.add("hint");

        await sleep(5200);

      }

      running = false;

    }

    whileVisible($("#app"), () => { visible = true; run(); }, () => { visible = false; });

  }



  /* ───────── 카드 안의 작은 장면들 ───────── */

  function scenes() {

    // 현장 디테일: 하나씩 체크된다

    const craft = $$("#craft li");

    // AI 호출 비교(개념도)

    const A = $("#ticks-a"), B = $("#ticks-b"), ca = $("#calls-a"), cb = $("#calls-b");

    const T = 32, AI = [9, 14, 19, 27];

    A.innerHTML = B.innerHTML = "<i></i>".repeat(T);

    const ta = $$("i", A), tb = $$("i", B);

    if (calm) {

      craft.forEach((li) => li.classList.add("on"));

      ta.forEach((i) => i.classList.add("hot")); tb.forEach((i, k) => i.classList.add(AI.includes(k) ? "ai" : "pc"));

      ca.textContent = T + "+"; cb.textContent = AI.length;

      return;

    }

    let on = false;

    (async function loopCraft() {

      for (;;) {

        if (!on) { await sleep(400); continue; }

        craft.forEach((li) => li.classList.remove("on"));

        await sleep(500);

        for (const li of craft) { li.classList.add("on"); await sleep(850); }

        await sleep(2600);

      }

    })();

    (async function loopCredit() {

      for (;;) {

        if (!on) { await sleep(400); continue; }

        ta.forEach((i) => (i.className = "")); tb.forEach((i) => (i.className = ""));

        ca.textContent = cb.textContent = 0;

        await sleep(600);

        let ai = 0;

        for (let k = 0; k < T; k++) {

          ta[k].className = "hot"; ca.textContent = k + 1;

          if (AI.includes(k)) { tb[k].className = "ai"; cb.textContent = ++ai; } else tb[k].className = "pc";

          await sleep(105);

        }

        ca.textContent = T + "+";

        await sleep(3400);

      }

    })();

    whileVisible($("#why"), () => (on = true), () => (on = false));

    whileVisible($(".gfx"), () => $(".gfx").classList.add("play"), () => $(".gfx").classList.remove("play"));



    // 쇼츠 레이어: 이름에 올리면 화면에서 그 트랙만 남는다

    const phone = $("#phone"), items = $$("#layers li");

    const focus = (name) => {

      phone.classList.toggle("focus", !!name);

      $$("[data-layer]", phone).forEach((el) => el.classList.toggle("hi", el.dataset.layer === name));

      items.forEach((li) => li.classList.toggle("hi", li.dataset.layer === name));

    };

    items.forEach((li) => { li.addEventListener("pointerenter", () => focus(li.dataset.layer)); li.addEventListener("pointerleave", () => focus("")); });

    $$("[data-layer]", phone).forEach((el) => { el.addEventListener("pointerenter", () => focus(el.dataset.layer)); el.addEventListener("pointerleave", () => focus("")); });

  }



  /* ───────── 작업 흐름 ───────── */

  function flow() {

    const KO = [

      ["01", "프로젝트", "직접", "YOU · 1분", "촬영 폴더를 고릅니다", "카메라 A – E와 오디오 A – E 폴더를 고르고, 목표 길이와 꼭 넣을 장면을 적습니다. 카메라 하나만 있어도 됩니다.", ["카메라 A – E", "오디오 A – E", "23.976 – 60 fps"]],

      ["02", "자동 처리", "PC", "PC · AI 호출 없음", "처리 시작을 누르고 기다립니다", "싱크, 오디오 정리, 받아쓰기, 대본, 인서트 후보, 색 분석을 지나 컷 전 전체 시퀀스까지 만듭니다. 처음엔 30분 안팎이고, 끝난 단계는 다음에 건너뜁니다.", ["전체원본_시퀀스.xml", "스크립트_전체.txt", "sheet_*.jpg"]],

      ["03", "시나리오", "AI · 선택", "AI · 대본 한 파일", "AI가 대본을 읽고 3안을 냅니다", "요청서와 대본을 보내면 시나리오 A · B · C가 돌아옵니다. 안마다 군말을 걷어낸 정리된 대본이 함께 옵니다. 마음에 드는 안을 더블클릭하면 정해집니다.", ["시나리오_A", "시나리오_B", "시나리오_C", "정리된 대본"]],

      ["04", "인서트", "AI · 선택", "AI · 장면 모음 이미지", "인서트가 들어갈 자리를 정합니다", "장면 모음 이미지와 대본을 보고 AI가 인서트 위치를 배치합니다. 답은 프로그램이 검증하고 저장합니다. 인서트가 없으면 건너뜁니다.", ["sheet_*.jpg", "배치표.json"]],

      ["05", "색 보정", "AI · 선택", "PC가 먼저 · AI는 검토만", "보조 카메라 색을 메인에 맞춥니다", "자동 처리가 이미 피부톤과 옷 색 기준으로 구간별 LUT를 만들어 두었습니다. 검토가 필요한 구간만 비교 이미지를 AI에 보내 조정합니다.", [".cube LUT", "review_*.jpg", "Lumetri Color"]],

      ["06", "편집 시퀀스", "PC", "PC · AI 호출 없음", "프리미어로 넘깁니다", "무음 컷, 자막, 색 보정을 넣을지 고르고 시퀀스를 만듭니다. 프리미어가 없으면 같은 결과를 MP4로 받습니다.", ["_무음컷적용.xml", "_무음컷없음.xml", ".prproj", ".srt", ".mp4"]],

      ["07", "쇼츠 · 줄이기", "AI", "AI · 문장 대본", "본편에서 쇼츠와 요약본을 뽑습니다", "문장 번호가 붙은 대본에서 AI가 문장을 고릅니다. 세로 1080 × 1920 쇼츠 여러 편, 또는 15분을 7분으로 줄인 편집본이 나옵니다. 프리미어 편집본(XML)에서도 시작할 수 있습니다.", ["쇼츠_A", "쇼츠_B", "1080 × 1920", "요약안", "편집본 XML"]],

    ];

    const EN = [

      ["01", "Project", "You", "YOU · 1 min", "Pick your footage folders", "Choose folders for cameras A – E and audio A – E, then note the target length and must-have scenes. One camera is enough.", ["Cameras A – E", "Audio A – E", "23.976 – 60 fps"]],

      ["02", "Auto process", "PC", "PC · no AI calls", "Press Start and wait", "Sync, audio cleanup, transcription, transcript, insert candidates and color analysis, all the way to a full uncut sequence. About 30 minutes the first time; finished steps are skipped next time.", ["Full sequence .xml", "Full transcript .txt", "sheet_*.jpg"]],

      ["03", "Scenario", "AI · optional", "AI · one transcript file", "AI reads the transcript and pitches 3 cuts", "Send the request and transcript, and scenarios A · B · C come back, each with a clean transcript. Double-click the one you like to lock it in.", ["Scenario_A", "Scenario_B", "Scenario_C", "Clean transcript"]],

      ["04", "Inserts", "AI · optional", "AI · scene contact sheets", "Decide where inserts go", "AI looks at the scene contact sheets and the transcript and places your inserts. The program validates and saves the answer. No inserts? Skip it.", ["sheet_*.jpg", "Placement .json"]],

      ["05", "Color", "AI · optional", "PC first · AI only reviews", "Match secondary cameras to the main one", "Auto processing has already built per-section LUTs from skin tones and clothing. Only sections that need review go to AI as comparison images.", [".cube LUT", "review_*.jpg", "Lumetri Color"]],

      ["06", "Edit sequence", "PC", "PC · no AI calls", "Hand it to Premiere", "Choose silence cuts, captions and color, then build the sequence. No Premiere? Get the same result as an MP4.", ["Silence-cut .xml", "Uncut .xml", ".prproj", ".srt", ".mp4"]],

      ["07", "Shorts · Digest", "AI", "AI · numbered sentences", "Pull shorts and digests from the episode", "AI picks lines from a transcript with numbered sentences. You get several vertical 1080 × 1920 shorts, or a 15-minute edit cut down to 7. A Premiere edit (XML) works as a source too.", ["Short_A", "Short_B", "1080 × 1920", "Digest", "Premiere XML"]],

    ];

    const D = () => (LANG === "en" ? EN : KO);

    const rail = $("#flow-rail"), pane = $(".flow-pane"), bar = $("#flow-bar"), box = $("#flowbox");

    rail.innerHTML = KO.map(() => '<li tabindex="0"><i></i><span></span><em></em></li>').join("");

    const items = $$("li", rail);

    const paintRail = () => items.forEach((li, k) => { const [n, t, who] = D()[k]; li.children[0].textContent = n; li.children[1].textContent = t; li.children[2].textContent = who; });

    paintRail();

    let cur = -1, t0 = 0, hold = false, seen = false;

    const DUR = 5200;

    function show(i, instant) {

      if (i === cur) return;

      cur = i; t0 = performance.now();

      items.forEach((li, k) => li.classList.toggle("on", k === i));

      const fill = () => {

        const [num, , , who, title, desc, out] = D()[i];

        $("#flow-num").textContent = num; $("#flow-who").textContent = who; $("#flow-title").textContent = title; $("#flow-desc").textContent = desc;

        $("#flow-out").innerHTML = out.map((o) => `<span>${o}</span>`).join("");

        pane.classList.remove("swap");

      };

      if (instant || calm) fill(); else { pane.classList.add("swap"); setTimeout(fill, 220); }

    }

    items.forEach((li, i) => {

      li.addEventListener("pointerenter", () => show(i));

      li.addEventListener("click", () => show(i));

      li.addEventListener("focus", () => show(i));

    });

    box.addEventListener("pointerenter", () => (hold = true));

    box.addEventListener("pointerleave", () => { hold = false; t0 = performance.now(); });

    show(0, true);

    onLang(() => { paintRail(); const k = cur; cur = -1; show(k, true); });

    if (calm) return;

    whileVisible(box, () => { seen = true; t0 = performance.now(); }, () => (seen = false));

    (function tick(now) {

      if (seen && !hold) {

        const p = (now - t0) / DUR;

        bar.style.width = clamp(p, 0, 1) * 100 + "%";

        if (p >= 1) show((cur + 1) % KO.length);

      } else if (hold) bar.style.width = "0%";

      requestAnimationFrame(tick);

    })(performance.now());

  }



  /* ───────── 시작 ───────── */

  rememberKorean(); langButtons();

  reveal(); nav(); marquee(); appDemo(); scenes(); flow(); pointerFx(); dots(); sparks();

  applyLang(LANG, false);

  voxel($("#voxel-hero"), { horizon: 0.2, host: $(".hero") });

  voxel($("#voxel-get"), { horizon: 0.1, swell: 54, speed: 0.8, host: $(".get") });

})();

