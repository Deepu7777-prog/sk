(function () {
  "use strict";
  var CFG = window.SK_CONFIG || {};
  var BASE = (CFG.supabaseUrl || "").replace(/\/$/, "");
  var KEY = CFG.supabaseAnonKey || "";
  var ADMIN = (CFG.adminEmail || "").toLowerCase();
  var SKEY = "sk_admin_session";
  var BUCKET = "portfolio";
  var MAX_VIDEO = 50 * 1024 * 1024;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var enc = encodeURIComponent;
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  var PHOTO_CATS = ["Wedding Photography", "Bridal Photography", "Groom Photography", "Candid Photography",
    "Couple Photography", "Pre-Wedding Photography", "Wedding Rituals", "Family Photography", "Portrait Photography", "Creative Photography"];
  var FILM_CATS = ["Wedding Cinematic Films", "Pre-Wedding Films", "Wedding Highlights", "Wedding Teasers",
    "Function Teasers", "Event Videos", "Maternity Shoot"];
  var SCHOOL_CATS = ["Student Activities", "School Celebrations", "Annual Functions", "Special Events", "School Programs"];

  var TABS = {
    photo: { kind: "photo", mode: "image", add: "Add photos", list: "Photos on the website", cats: PHOTO_CATS,
      help: "New photos appear in the Photography Gallery. The first three photos on the site are also shown as Featured Stories." },
    film: { kind: "film", mode: "video", add: "Add a film", list: "Films on the website", cats: FILM_CATS,
      help: "Films appear in the Wedding Films section. Paste a YouTube link or upload an MP4 file." },
    reel: { kind: "reel", mode: "video", add: "Add a reel", list: "Reels on the website", cats: [],
      help: "Reels appear in a scrolling row called Moments, in Motion. Paste an Instagram or YouTube link, or upload an MP4 file." },
    school: { kind: "school", mode: "image", add: "Add school photos", list: "School photos on the website", cats: SCHOOL_CATS,
      help: "These appear in the School Event Photography section, which stays hidden until you add something." }
  };
  var tab = "photo", sess = null, rowsById = {}, listToken = 0, busy = false;

  /* ---------- small helpers ---------- */
  function show(which) {
    ["setup", "login", "app"].forEach(function (id) { $("#" + id).hidden = id !== which; });
    $("#who").hidden = which !== "app";
  }
  function note(id, msg, cls) {
    var n = $("#" + id); n.textContent = msg || ""; n.className = "note" + (cls ? " " + cls : "");
  }
  function uid() {
    return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function storageGet() { try { return JSON.parse(localStorage.getItem(SKEY) || "null"); } catch (e) { return null; } }
  function storageSet(v) { try { if (v) localStorage.setItem(SKEY, JSON.stringify(v)); else localStorage.removeItem(SKEY); } catch (e) { /* private mode */ } }
  function errText(text, status) {
    var msg = "";
    try { var j = JSON.parse(text); msg = j.message || j.msg || j.error_description || j.error || ""; } catch (e) { msg = text || ""; }
    if (/row-level security|violates/i.test(msg)) return "You are not allowed to change the website. Sign in with the owner email.";
    if (/jwt|expired/i.test(msg)) return "Your sign-in has expired. Please sign in again.";
    return msg || ("Something went wrong (code " + status + ").");
  }
  function hdrs(extra) {
    var h = { apikey: KEY, Authorization: "Bearer " + (sess ? sess.access_token : KEY), "Content-Type": "application/json" };
    for (var k in (extra || {})) h[k] = extra[k];
    return h;
  }
  function publicUrl(path) {
    return BASE + "/storage/v1/object/public/" + BUCKET + "/" + path.split("/").map(enc).join("/");
  }

  /* ---------- auth ---------- */
  function captureHash() {
    var h = location.hash.replace(/^#/, "");
    if (!h) return null;
    var p = new URLSearchParams(h);
    if (p.get("error_description")) {
      var msg = p.get("error_description").replace(/\+/g, " ");
      history.replaceState(null, "", location.pathname + location.search);
      return { error: msg };
    }
    if (!p.get("access_token")) return null;
    var s = {
      access_token: p.get("access_token"), refresh_token: p.get("refresh_token"),
      expires_at: Math.floor(Date.now() / 1000) + parseInt(p.get("expires_in") || "3600", 10)
    };
    history.replaceState(null, "", location.pathname + location.search);
    return s;
  }
  async function ensureFresh() {
    if (!sess) throw new Error("Please sign in.");
    var now = Math.floor(Date.now() / 1000);
    if (sess.expires_at - now > 90) return;
    var r = await fetch(BASE + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: sess.refresh_token })
    });
    if (!r.ok) throw new Error("Your sign-in has expired. Please sign in again.");
    var j = await r.json();
    sess = { access_token: j.access_token, refresh_token: j.refresh_token || sess.refresh_token, expires_at: now + (j.expires_in || 3600), email: sess.email };
    storageSet(sess);
  }
  async function currentUser() {
    var r = await fetch(BASE + "/auth/v1/user", { headers: { apikey: KEY, Authorization: "Bearer " + sess.access_token } });
    if (!r.ok) throw new Error("Not signed in.");
    return r.json();
  }
  async function signOut() {
    try {
      if (sess) await fetch(BASE + "/auth/v1/logout", { method: "POST", headers: { apikey: KEY, Authorization: "Bearer " + sess.access_token } });
    } catch (e) { /* ignore */ }
    sess = null; storageSet(null);
    show("login");
  }
  function enter() {
    show("app");
    $("#whoEmail").textContent = sess.email || ADMIN;
    setTab(tab);
  }

  async function boot() {
    var hash = captureHash();
    $("#lEmail").value = CFG.adminEmail || "";
    if (hash && hash.error) { show("login"); note("lNote", hash.error, "err"); return; }
    sess = hash || storageGet();
    if (sess) {
      try {
        await ensureFresh();
        var u = await currentUser();
        if ((u.email || "").toLowerCase() === ADMIN) { sess.email = u.email; storageSet(sess); enter(); return; }
        await signOut();
        note("lNote", "This account is not allowed to manage the website.", "err");
        return;
      } catch (e) { sess = null; storageSet(null); }
    }
    show("login");
  }

  $("#loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var email = $("#lEmail").value.trim().toLowerCase(), pass = $("#lPass").value;
    if (email !== ADMIN) { note("lNote", "Only the website owner can sign in here.", "err"); return; }
    if (!pass) { note("lNote", "Enter your password, or use the sign-in link button.", "err"); return; }
    $("#lGo").disabled = true; note("lNote", "Signing in...");
    try {
      var r = await fetch(BASE + "/auth/v1/token?grant_type=password", {
        method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: pass })
      });
      var t = await r.text();
      if (!r.ok) throw new Error(/invalid/i.test(t) ? "Wrong email or password." : errText(t, r.status));
      var j = JSON.parse(t);
      sess = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (j.expires_in || 3600), email: (j.user && j.user.email) || email };
      storageSet(sess); $("#lPass").value = ""; note("lNote", "");
      enter();
    } catch (err) { note("lNote", err.message, "err"); }
    finally { $("#lGo").disabled = false; }
  });
  $("#lLink").addEventListener("click", async function () {
    var email = $("#lEmail").value.trim().toLowerCase();
    if (email !== ADMIN) { note("lNote", "Only the website owner can sign in here.", "err"); return; }
    note("lNote", "Sending...");
    try {
      var redirect = /^https?:$/.test(location.protocol) ? "?redirect_to=" + enc(location.origin + location.pathname) : "";
      var r = await fetch(BASE + "/auth/v1/otp" + redirect, {
        method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, create_user: false })
      });
      if (!r.ok) throw new Error(errText(await r.text(), r.status));
      note("lNote", "A sign-in link was sent to " + email + ". Open it on this device.", "ok");
    } catch (err) { note("lNote", err.message, "err"); }
  });
  $("#signOut").addEventListener("click", signOut);

  /* ---------- database + storage ---------- */
  async function rest(method, query, body, prefer) {
    await ensureFresh();
    var r = await fetch(BASE + "/rest/v1/media_items" + (query || ""), {
      method: method, headers: hdrs(prefer ? { Prefer: prefer } : {}), body: body ? JSON.stringify(body) : undefined
    });
    var t = await r.text();
    if (!r.ok) throw new Error(errText(t, r.status));
    return t ? JSON.parse(t) : null;
  }
  function insertRow(row) { return rest("POST", "", row, "return=representation"); }

  async function upload(path, blob, ctype, onProgress) {
    await ensureFresh();
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open("POST", BASE + "/storage/v1/object/" + BUCKET + "/" + path.split("/").map(enc).join("/"));
      x.setRequestHeader("apikey", KEY);
      x.setRequestHeader("Authorization", "Bearer " + sess.access_token);
      x.setRequestHeader("Content-Type", ctype || "application/octet-stream");
      x.setRequestHeader("x-upsert", "false");
      x.setRequestHeader("cache-control", "max-age=31536000");
      x.upload.onprogress = function (e) { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
      x.onload = function () {
        if (x.status >= 200 && x.status < 300) resolve();
        else reject(new Error(errText(x.responseText, x.status)));
      };
      x.onerror = function () { reject(new Error("Network problem while uploading. Check the connection and try again.")); };
      x.send(blob);
    });
  }
  async function removeObjects(paths) {
    for (var i = 0; i < paths.length; i++) {
      if (!paths[i]) continue;
      try {
        await fetch(BASE + "/storage/v1/object/" + BUCKET + "/" + paths[i].split("/").map(enc).join("/"), { method: "DELETE", headers: hdrs() });
      } catch (e) { /* best effort */ }
    }
  }

  /* ---------- media preparation ---------- */
  async function prepImage(file, maxDim) {
    maxDim = maxDim || 2200;
    try {
      var bmp = await createImageBitmap(file);
      var s = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
      var w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
      var c = document.createElement("canvas"); c.width = w; c.height = h;
      var ctx = c.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bmp, 0, 0, w, h);
      if (bmp.close) bmp.close();
      var blob = await new Promise(function (res) { c.toBlob(res, "image/jpeg", 0.88); });
      if (!blob) throw new Error("encode");
      return { blob: blob, width: w, height: h, ext: "jpg", type: "image/jpeg" };
    } catch (e) {
      if (/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
        return { blob: file, width: null, height: null, ext: file.type.split("/")[1].replace("jpeg", "jpg"), type: file.type };
      }
      throw new Error("\"" + file.name + "\" could not be read. Please use a JPG or PNG photo.");
    }
  }
  function makePoster(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file), v = document.createElement("video"), done = false;
      function finish(r) { if (done) return; done = true; URL.revokeObjectURL(url); resolve(r); }
      v.preload = "metadata"; v.muted = true; v.playsInline = true;
      v.onloadeddata = function () { try { v.currentTime = Math.min(1, (v.duration || 2) / 2); } catch (e) { finish(null); } };
      v.onseeked = function () {
        try {
          var w = v.videoWidth, h = v.videoHeight;
          if (!w || !h) return finish(null);
          var s = Math.min(1, 1600 / w), c = document.createElement("canvas");
          c.width = Math.round(w * s); c.height = Math.round(h * s);
          c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
          c.toBlob(function (b) { finish(b ? { blob: b, width: c.width, height: c.height, ext: "jpg", type: "image/jpeg" } : null); }, "image/jpeg", 0.85);
        } catch (e) { finish(null); }
      };
      v.onerror = function () { finish(null); };
      setTimeout(function () { finish(null); }, 8000);
      v.src = url;
    });
  }
  function parseVideoLink(raw) {
    try {
      var x = new URL(String(raw).trim()), h = x.hostname.replace(/^(www|m)\./, ""), m;
      if (h === "youtu.be") { m = x.pathname.slice(1).split("/")[0]; return /^[\w-]{11}$/.test(m) ? { type: "youtube", id: m } : null; }
      if (h === "youtube.com" || h === "youtube-nocookie.com" || h === "music.youtube.com") {
        var v = x.searchParams.get("v");
        if (v && /^[\w-]{11}$/.test(v)) return { type: "youtube", id: v };
        m = x.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/);
        return m ? { type: "youtube", id: m[1] } : null;
      }
      if (h === "instagram.com") {
        m = x.pathname.match(/^\/(?:[\w.]+\/)?(?:reel|reels|p|tv)\/([\w-]+)/);
        return m ? { type: "instagram", id: m[1] } : null;
      }
    } catch (e) { /* not a URL */ }
    return null;
  }

  /* ---------- progress ---------- */
  function progress(frac, text) {
    $("#prog").hidden = false;
    $("#progBar").style.width = Math.max(2, Math.min(100, Math.round(frac * 100))) + "%";
    $("#progText").textContent = text || "";
  }
  function setBusy(b) {
    busy = b; $("#addGo").disabled = b; $("#addGo").textContent = b ? "Adding..." : "Add to website";
    if (!b) $("#prog").hidden = true;
  }

  /* ---------- add ---------- */
  async function addPhotos(T) {
    var files = Array.prototype.slice.call($("#fPhotos").files);
    if (!files.length) throw new Error("Choose at least one photo.");
    var cat = $("#fCat").value.trim(), alt = $("#fAlt").value.trim();
    for (var i = 0; i < files.length; i++) {
      var label = "Photo " + (i + 1) + " of " + files.length;
      progress(i / files.length, label + ": preparing");
      var p = await prepImage(files[i]);
      var path = T.kind + "/" + uid() + "." + p.ext;
      await upload(path, p.blob, p.type, function (f) { progress((i + f) / files.length, label + ": uploading " + Math.round(f * 100) + "%"); });
      try {
        await insertRow({ kind: T.kind, type: "image", url: publicUrl(path), path: path, category: cat || null, caption: alt || null, width: p.width, height: p.height });
      } catch (e) { await removeObjects([path]); throw e; }
    }
    return files.length + (files.length === 1 ? " photo" : " photos") + " added.";
  }
  async function addVideo(T) {
    var mode = $("input[name=src]:checked").value;
    var title = $("#fTitle").value.trim(), desc = $("#fDesc").value.trim(), caption = $("#fCaption").value.trim(), cat = $("#fCat").value.trim();
    if (T.kind === "film" && !title) throw new Error("Please enter a title for the film.");
    var row = { kind: T.kind, title: title || null, caption: (T.kind === "film" ? desc : caption) || null, category: T.kind === "reel" ? null : (cat || null) };
    var uploaded = [], vf = null;
    try {
      if (mode === "link") {
        var info = parseVideoLink($("#fLink").value);
        if (!info) throw new Error("That is not a YouTube or Instagram video link. Copy the link from the Share button and paste it again.");
        row.type = info.type; row.ext_id = info.id;
      } else {
        vf = $("#fVideo").files[0];
        if (!vf) throw new Error("Choose a video file.");
        if (vf.size > MAX_VIDEO) throw new Error("This video is larger than 50 MB. Upload it to YouTube and paste the link instead.");
        var ext = ((vf.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "")) || "mp4";
        var vpath = "videos/" + uid() + "." + ext;
        progress(0, "Uploading video");
        await upload(vpath, vf, vf.type || "video/mp4", function (f) { progress(f * 0.9, "Uploading video " + Math.round(f * 100) + "%"); });
        uploaded.push(vpath);
        row.type = "file"; row.url = publicUrl(vpath); row.path = vpath;
      }
      var coverFile = $("#fCover").files[0], cover = null;
      if (coverFile) cover = await prepImage(coverFile, 1600);
      else if (vf) { progress(0.92, "Making a cover image"); cover = await makePoster(vf); }
      if (cover) {
        var ppath = "posters/" + uid() + "." + cover.ext;
        progress(0.95, "Uploading cover image");
        await upload(ppath, cover.blob, cover.type);
        uploaded.push(ppath);
        row.poster_url = publicUrl(ppath); row.poster_path = ppath;
      }
      await insertRow(row);
    } catch (e) { if (uploaded.length) await removeObjects(uploaded); throw e; }
    return (T.kind === "film" ? "Film" : "Reel") + " added.";
  }
  $("#addForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    if (busy) return;
    var T = TABS[tab]; note("addNote", "");
    setBusy(true);
    try {
      var msg = T.mode === "image" ? await addPhotos(T) : await addVideo(T);
      $("#addForm").reset(); applyFields();
      note("addNote", msg + " Now live on the website.", "ok");
      await loadList();
    } catch (err) { note("addNote", err.message, "err"); }
    finally { setBusy(false); }
  });

  /* ---------- list ---------- */
  function thumbFor(r) {
    if (r.type === "image") return r.url;
    if (r.poster_url) return r.poster_url;
    if (r.type === "youtube") return "https://i.ytimg.com/vi/" + enc(r.ext_id) + "/hqdefault.jpg";
    return "";
  }
  var TYPE_LABEL = { image: "Photo", file: "MP4", youtube: "YouTube", instagram: "Instagram" };
  async function loadList() {
    var T = TABS[tab], token = ++listToken, ul = $("#items");
    try {
      var rows = await rest("GET", "?select=*&kind=eq." + T.kind + "&order=sort_order.desc,created_at.desc");
      if (token !== listToken) return;
      rowsById = {};
      if (!rows || !rows.length) {
        ul.innerHTML = '<li class="empty-list">Nothing added here yet. Items you add will show up in this list.</li>';
        return;
      }
      ul.innerHTML = rows.map(function (r) {
        rowsById[r.id] = r;
        var th = thumbFor(r), name = r.title || r.caption || r.category || "Untitled";
        var meta = [r.category, new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })].filter(Boolean).join(" · ");
        return '<li class="item" data-id="' + esc(r.id) + '"><div class="thumb">' +
          (th ? '<img src="' + esc(th) + '" alt="" loading="lazy">' : "<span>" + esc(TYPE_LABEL[r.type] || "Video") + "</span>") +
          '<span class="tag">' + esc(TYPE_LABEL[r.type] || r.type) + '</span></div>' +
          '<div class="info"><b>' + esc(name) + "</b><span>" + esc(meta) + "</span></div>" +
          '<div class="acts"><button type="button" data-act="top">Move to top</button><button type="button" class="danger" data-act="del">Delete</button></div></li>';
      }).join("");
    } catch (err) {
      if (token === listToken) ul.innerHTML = '<li class="empty-list">' + esc(err.message) + "</li>";
    }
  }
  $("#items").addEventListener("click", async function (e) {
    var btn = e.target.closest("button[data-act]"); if (!btn) return;
    var li = btn.closest(".item"), id = li.getAttribute("data-id"), r = rowsById[id];
    if (!r) return;
    try {
      if (btn.dataset.act === "top") {
        var top = await rest("GET", "?select=sort_order&order=sort_order.desc&limit=1");
        var max = (top && top[0] && top[0].sort_order) || 0;
        await rest("PATCH", "?id=eq." + enc(id), { sort_order: max + 1 }, "return=minimal");
        note("addNote", "Moved to the top.", "ok");
        await loadList();
      } else if (btn.dataset.act === "del") {
        if (!btn.classList.contains("armed")) {
          btn.classList.add("armed"); btn.textContent = "Tap again to delete";
          setTimeout(function () { btn.classList.remove("armed"); btn.textContent = "Delete"; }, 4000);
          return;
        }
        btn.disabled = true;
        await rest("DELETE", "?id=eq." + enc(id), null, "return=minimal");
        await removeObjects([r.path, r.poster_path]);
        note("addNote", "Deleted.", "ok");
        await loadList();
      }
    } catch (err) { note("addNote", err.message, "err"); }
  });

  /* ---------- tabs and form fields ---------- */
  function applyFields() {
    var T = TABS[tab], srcEl = $("input[name=src]:checked"), src = srcEl ? srcEl.value : "link";
    $$("#addForm .field").forEach(function (f) {
      var k = f.getAttribute("data-for"), s = f.getAttribute("data-src");
      var visible = k === T.mode || k === T.kind || (k === "catfield" && T.kind !== "reel");
      if (s && s !== src) visible = false;
      f.hidden = !visible;
    });
    $("#coverHint").textContent = T.kind === "reel"
      ? "Instagram reels cannot show a picture automatically, so a cover image makes them look better. Shown before the reel is played."
      : "Shown before the video is played. For an uploaded MP4 a cover is made automatically if you leave this empty.";
  }
  function setTab(t) {
    tab = t;
    var T = TABS[t];
    $$(".tabs button").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.tab === t)); });
    $("#addTitle").textContent = T.add; $("#addHelp").textContent = T.help; $("#listTitle").textContent = T.list;
    $("#catList").innerHTML = T.cats.map(function (c) { return '<option value="' + esc(c) + '">'; }).join("");
    $("#addForm").reset(); note("addNote", "");
    applyFields();
    $("#items").innerHTML = "";
    loadList();
  }
  $$(".tabs button").forEach(function (b) { b.addEventListener("click", function () { setTab(b.dataset.tab); }); });
  $$("input[name=src]").forEach(function (r) { r.addEventListener("change", applyFields); });

  /* ---------- start ---------- */
  if (!BASE || !KEY) { show("setup"); return; }
  boot();
})();
