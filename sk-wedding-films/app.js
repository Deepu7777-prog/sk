(function () {
  "use strict";
  var M = window.SK_MEDIA || {};
  var CFG = window.SK_CONFIG || {};
  var WA = "917207187193";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var el = function (tag, attrs, html) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html != null) e.innerHTML = html;
    return e;
  };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var enc = encodeURIComponent;
  var PLAY = '<i><svg><use href="#i-play"/></svg></i>';

  var PHOTO_CATS = ["Wedding Photography", "Bridal Photography", "Groom Photography", "Candid Photography",
    "Couple Photography", "Pre-Wedding Photography", "Wedding Rituals", "Family Photography", "Portrait Photography", "Creative Photography"];
  var FILM_CATS = ["Wedding Cinematic Films", "Pre-Wedding Films", "Wedding Highlights", "Wedding Teasers",
    "Function Teasers", "Event Videos", "Maternity Shoot"];

  /* ---------- Header + mobile drawer ---------- */
  var hdr = $("#hdr"), drawer = $("#drawer"), burger = $("#burger");
  function onScroll() { hdr.classList.toggle("solid", window.scrollY > 40); }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  function setDrawer(open) {
    drawer.hidden = !open;
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
    hdr.classList.toggle("solid", open || window.scrollY > 40);
  }
  burger.addEventListener("click", function () { setDrawer(drawer.hidden); });
  drawer.addEventListener("click", function (e) { if (e.target.closest("a")) setDrawer(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !drawer.hidden) setDrawer(false); });
  window.addEventListener("resize", function () { if (window.innerWidth > 980 && !drawer.hidden) setDrawer(false); });
  $("#yr").textContent = new Date().getFullYear();

  /* ---------- Hero ---------- */
  var hm = $("#heroMedia"), hero = M.hero;
  if (hero && hero.type === "video" && hero.src) {
    var hv = el("video", { autoplay: "", muted: "", loop: "", playsinline: "", preload: "metadata" });
    if (hero.poster) hv.setAttribute("poster", hero.poster);
    hv.muted = true; hv.src = hero.src; hm.appendChild(hv);
  } else if (hero && hero.src) {
    hm.style.backgroundImage = "url('" + hero.src.replace(/'/g, "%27") + "')";
  }

  /* ---------- Founder portrait ---------- */
  var pt = $("#portrait");
  if (M.portrait && M.portrait.src) {
    pt.appendChild(el("img", { src: M.portrait.src, alt: M.portrait.alt || "Sathish Kumar", loading: "lazy" }));
  } else {
    pt.innerHTML = '<span class="mono" aria-hidden="true">SK</span>';
  }

  /* ---------- Lightbox ---------- */
  var lb = $("#lb"), lbImg = $("#lbImg"), lbCap = $("#lbCap");
  var lbList = [], lbIdx = 0, lastFocus = null;
  function lbShow(i) {
    lbIdx = (i + lbList.length) % lbList.length;
    var it = lbList[lbIdx];
    lbImg.src = it.src; lbImg.alt = it.alt || "";
    lbCap.textContent = it.alt || it.category || "";
  }
  function lbOpen(list, i) {
    lbList = list; lastFocus = document.activeElement;
    lb.hidden = false; document.body.style.overflow = "hidden";
    lbShow(i); $("#lbClose").focus();
  }
  function lbClose() {
    lb.hidden = true; document.body.style.overflow = ""; lbImg.removeAttribute("src");
    if (lastFocus) lastFocus.focus();
  }
  $("#lbClose").addEventListener("click", lbClose);
  $("#lbPrev").addEventListener("click", function () { lbShow(lbIdx - 1); });
  $("#lbNext").addEventListener("click", function () { lbShow(lbIdx + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) lbClose(); });
  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") lbClose();
    else if (e.key === "ArrowLeft") lbShow(lbIdx - 1);
    else if (e.key === "ArrowRight") lbShow(lbIdx + 1);
  });
  var tx = null;
  lb.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (tx == null) return;
    var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) lbShow(lbIdx + (dx < 0 ? 1 : -1));
    tx = null;
  });

  /* ---------- Filters ---------- */
  function buildFilters(host, cats, items, onChange) {
    host.innerHTML = "";
    var present = cats.filter(function (c) { return items.some(function (i) { return i.category === c; }); });
    items.forEach(function (i) { if (i.category && present.indexOf(i.category) < 0) present.push(i.category); });
    if (!items.length || present.length < 2) { host.hidden = true; return; }
    host.hidden = false;
    ["All"].concat(present).forEach(function (c, n) {
      var b = el("button", { class: "chip", type: "button", "aria-pressed": n === 0 }, esc(c));
      b.addEventListener("click", function () {
        host.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        onChange(c === "All" ? null : c);
      });
      host.appendChild(b);
    });
  }
  function emptyPanel(title, note) {
    return '<div class="empty"><b>' + esc(title) + "</b>" + esc(note) + "<small>Original work is added here as it is uploaded.</small></div>";
  }

  /* ---------- Photo grids ---------- */
  function renderPhotos(grid, items, filter, emptyTitle) {
    grid.innerHTML = "";
    var list = filter ? items.filter(function (i) { return i.category === filter; }) : items;
    if (!list.length) { grid.innerHTML = emptyPanel(emptyTitle, "Photographs coming soon."); return; }
    list.forEach(function (it, idx) {
      var f = el("figure", { tabindex: "0", role: "button", "aria-label": "Open image: " + (it.alt || it.category || "photograph") });
      var img = el("img", { src: it.src, alt: it.alt || it.category || "Photograph by SK Wedding Films", loading: "lazy", decoding: "async" });
      if (it.width && it.height) { img.width = it.width; img.height = it.height; }
      f.appendChild(img);
      if (it.category) f.appendChild(el("figcaption", {}, esc(it.category)));
      var open = function () { lbOpen(list, idx); };
      f.addEventListener("click", open);
      f.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
      f.style.animationDelay = Math.min(idx, 12) * 40 + "ms";
      grid.appendChild(f);
    });
  }

  /* ---------- Players ---------- */
  function mountPlayer(player, f) {
    var title = f.title || f.caption || "Film";
    var poster = f.poster || (f.type === "youtube" && f.id ? "https://i.ytimg.com/vi/" + enc(f.id) + "/hqdefault.jpg" : "");
    player.innerHTML = (poster ? '<img src="' + esc(poster) + '" alt="' + esc(title) + ' thumbnail" loading="lazy">' : "") +
      '<button class="play" type="button" aria-label="Play ' + esc(title) + '">' + PLAY + "</button>";
    player.querySelector(".play").addEventListener("click", function () {
      if (f.type === "youtube" && f.id) {
        player.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + enc(f.id) +
          '?autoplay=1&rel=0&playsinline=1" title="' + esc(title) + '" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
      } else if (f.type === "instagram" && f.id) {
        player.innerHTML = '<iframe src="https://www.instagram.com/reel/' + enc(f.id) + '/embed" title="' + esc(title) + '" allowfullscreen scrolling="no"></iframe>';
      } else if (f.src) {
        var vid = el("video", { controls: "", autoplay: "", playsinline: "", preload: "auto", "aria-label": title });
        if (f.poster) vid.setAttribute("poster", f.poster);
        vid.src = f.src;
        player.innerHTML = ""; player.appendChild(vid);
        var p = vid.play(); if (p && p.catch) p.catch(function () {});
      }
    });
  }
  function filmCard(f, idx) {
    var card = el("article", { class: "film" });
    card.style.animationDelay = Math.min(idx, 12) * 40 + "ms";
    var player = el("div", { class: "player" });
    mountPlayer(player, f);
    card.appendChild(player);
    var info = el("div", { class: "film-info" });
    info.innerHTML = (f.category ? "<small>" + esc(f.category) + "</small>" : "") + "<h3>" + esc(f.title || "Film") + "</h3>" +
      (f.description ? "<p>" + esc(f.description) + "</p>" : "");
    if (f.src) {
      var fs = el("button", { class: "fs", type: "button" }, "Full screen");
      fs.addEventListener("click", function () {
        var vid = player.querySelector("video");
        if (!vid) { player.querySelector(".play").click(); vid = player.querySelector("video"); }
        if (vid && vid.requestFullscreen) { var rq = vid.requestFullscreen(); if (rq && rq.catch) rq.catch(function () {}); }
        else if (vid && vid.webkitEnterFullscreen) vid.webkitEnterFullscreen();
      });
      info.appendChild(fs);
    }
    card.appendChild(info);
    return card;
  }
  function renderFilms(grid, items, filter, emptyTitle) {
    grid.innerHTML = "";
    var list = filter ? items.filter(function (i) { return i.category === filter; }) : items;
    if (!list.length) { grid.innerHTML = emptyPanel(emptyTitle, "Films coming soon."); return; }
    list.forEach(function (f, i) { grid.appendChild(filmCard(f, i)); });
  }

  /* ---------- Page content (built-in list + anything added in the admin page) ---------- */
  function build(rows) {
    var d = {
      photos: (M.photos || []).slice(), films: (M.films || []).slice(), reels: (M.reels || []).slice(),
      school: (M.school || []).slice(), schoolFilms: (M.schoolFilms || []).slice()
    };
    (rows || []).forEach(function (r) {
      if (r.kind === "photo" || r.kind === "school") {
        if (!r.url) return;
        var p = { src: r.url, category: r.category || "", alt: r.caption || r.title || r.category || "Photograph by SK Wedding Films" };
        if (r.width && r.height) { p.width = r.width; p.height = r.height; }
        (r.kind === "photo" ? d.photos : d.school).push(p);
        return;
      }
      var f = { type: r.type, title: r.title || "", description: r.caption || "", caption: r.caption || r.title || "", category: r.category || "" };
      if (r.type === "file") { f.src = r.url; f.poster = r.poster_url || ""; }
      else { f.id = r.ext_id; if (r.poster_url) f.poster = r.poster_url; }
      if (!(f.src || f.id)) return;
      if (r.kind === "film") d.films.push(f); else if (r.kind === "reel") d.reels.push(f);
    });
    return d;
  }

  var fg3 = $("#featGrid"), pg = $("#photoGrid"), fg = $("#filmGrid"), sf = $("#schoolFilms"), rr = $("#reelRow");
  function render(d) {
    /* service card images (the site owner's own work) */
    document.querySelectorAll("[data-bg]").forEach(function (n) {
      var spec = n.getAttribute("data-bg").split(":"), src = null;
      if (spec[0] === "photo") {
        var p = d.photos.filter(function (x) { return x.src.indexOf(spec[1]) > -1; })[0];
        src = p && p.src;
      } else if (spec[0] === "film") {
        var f = d.films[parseInt(spec[1], 10) - 1];
        src = f && f.poster;
      }
      if (src) n.style.backgroundImage = "url('" + src.replace(/'/g, "%27") + "')";
    });

    /* featured stories = first three photographs */
    var feat = d.photos.slice(0, 3);
    fg3.innerHTML = "";
    $("#featured").hidden = !feat.length;
    feat.forEach(function (it, idx) {
      var f = el("figure", { tabindex: "0", role: "button", "aria-label": "Open image: " + (it.alt || "photograph") });
      f.appendChild(el("img", { src: it.src, alt: it.alt || "Photograph by SK Wedding Films", loading: "lazy", decoding: "async" }));
      var open = function () { lbOpen(feat, idx); };
      f.addEventListener("click", open);
      f.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
      fg3.appendChild(f);
    });

    /* photography gallery */
    buildFilters($("#photoFilters"), PHOTO_CATS, d.photos, function (c) { renderPhotos(pg, d.photos, c, "Photography Gallery"); });
    renderPhotos(pg, d.photos, null, "Photography Gallery");

    /* school (hidden until used) */
    $("#school").hidden = !(d.school.length || d.schoolFilms.length);
    $("#schoolGrid").hidden = !d.school.length;
    if (d.school.length) renderPhotos($("#schoolGrid"), d.school, null, "School event photography");
    sf.hidden = !d.schoolFilms.length;
    if (d.schoolFilms.length) renderFilms(sf, d.schoolFilms, null, "");

    /* films */
    buildFilters($("#filmFilters"), FILM_CATS, d.films, function (c) { renderFilms(fg, d.films, c, "Wedding Films"); });
    renderFilms(fg, d.films, null, "Wedding Films");

    /* reels (hidden until used) */
    rr.innerHTML = "";
    $("#reels").hidden = !d.reels.length;
    d.reels.forEach(function (r, i) {
      var c = el("article", { class: "reel" });
      c.style.animationDelay = Math.min(i, 12) * 40 + "ms";
      var p = el("div", { class: "player" });
      mountPlayer(p, r);
      c.appendChild(p);
      if (r.caption || r.title) c.appendChild(el("p", {}, esc(r.caption || r.title)));
      rr.appendChild(c);
    });
  }
  render(build([]));

  /* before / after sliders (hidden until used) */
  var cmp = M.editingCompare || [];
  if (cmp.length) {
    var cw = el("div", { class: "compare-wrap wrap" });
    var host = $("#stories .films").parentNode;
    cmp.forEach(function (c) {
      var box = el("div", { class: "compare" });
      box.innerHTML = '<img src="' + esc(c.before) + '" alt="Before: ' + esc(c.label || "edit") + '" loading="lazy">' +
        '<img class="after" src="' + esc(c.after) + '" alt="After: ' + esc(c.label || "edit") + '" loading="lazy">' +
        '<div class="bar"></div><em class="l">Before</em><em class="r">After</em>' +
        '<input type="range" min="0" max="100" value="50" aria-label="Before and after slider: ' + esc(c.label || "edit") + '">';
      var r = box.querySelector("input"), a = box.querySelector(".after"), b = box.querySelector(".bar");
      r.addEventListener("input", function () { a.style.clipPath = "inset(0 0 0 " + r.value + "%)"; b.style.left = r.value + "%"; });
      cw.appendChild(box);
    });
    host.appendChild(cw);
  }

  /* ---------- Items added from the admin page ---------- */
  if (CFG.supabaseUrl && CFG.supabaseAnonKey) {
    var ctl = ("AbortController" in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    fetch(CFG.supabaseUrl.replace(/\/$/, "") + "/rest/v1/media_items?select=*&order=sort_order.desc,created_at.desc", {
      headers: { apikey: CFG.supabaseAnonKey, Authorization: "Bearer " + CFG.supabaseAnonKey },
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        clearTimeout(timer);
        if (Array.isArray(rows) && rows.length) render(build(rows));
      })
      .catch(function () { /* offline or not set up: the built-in list stays */ });
  }

  /* ---------- Reveal ---------- */
  var rv = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: .1 });
    rv.forEach(function (n) { io.observe(n); });
  } else { rv.forEach(function (n) { n.classList.add("in"); }); }

  /* ---------- Contact form ---------- */
  var form = $("#contactForm"), note = $("#formNote");
  function formData() {
    var d = new FormData(form), name = (d.get("name") || "").trim(), msg = (d.get("msg") || "").trim();
    if (!name || !msg) { note.textContent = "Please enter your name and a message."; return null; }
    return { name: name, event: d.get("event"), text: "Name: " + name + "\nPhone: " + (d.get("phone") || "") + "\nEvent type: " + d.get("event") + "\n\n" + msg };
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var x = formData(); if (!x) return;
    window.location.href = "mailto:satish.ok65@gmail.com?subject=" + enc("Enquiry from " + x.name + " - " + x.event) + "&body=" + enc(x.text);
    note.textContent = "Opening your email app. You can also call 7207187193.";
  });
  $("#waBtn").addEventListener("click", function () {
    var x = formData(); if (!x) return;
    window.open("https://wa.me/" + WA + "?text=" + enc(x.text), "_blank", "noopener");
    note.textContent = "Opening WhatsApp.";
  });
})();
