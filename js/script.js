(function () {
  "use strict";

  const EVENT_DATE_ISO    = "2026-08-22T09:00:00+07:00";
  const RSVP_ENDPOINT     = "php/submit_rsvp.php";
  const RSVP_LIST_ENDPOINT= "php/get_rsvp.php";

  /* guest name from URL */
  function initGuestName() {
    const params = new URLSearchParams(window.location.search);
    const to = params.get("to");
    if (to && to.trim()) {
      const guestLine = document.getElementById("guestLine");
      const guestName = document.getElementById("guestName");
      if (guestLine && guestName) {
        guestName.textContent = decodeURIComponent(to.trim());
        guestLine.style.display = "flex";
      }
    }
  }

  /* open invitation */
  function initCover() {
    const cover  = document.getElementById("cover");
    const openBtn= document.getElementById("openBtn");
    const main   = document.getElementById("mainInvitation");
    const musicPlayer = document.getElementById("musicPlayer");
    const audio  = document.getElementById("musicAudio");
    if (!openBtn) return;

    openBtn.addEventListener("click", function () {
      cover.classList.add("closing");
      setTimeout(function () {
        cover.style.display = "none";
        main.classList.remove("hidden");
        document.body.style.overflow = "auto";
        if (musicPlayer) musicPlayer.style.display = "flex";

        // try autoplay
        if (audio) {
          audio.volume = 0.55;
          audio.play().then(function () {
            const toggle = document.getElementById("musicToggle");
            const icon   = document.getElementById("musicIcon");
            if (toggle) toggle.classList.add("playing");
            if (icon)   { icon.classList.remove("fa-play"); icon.classList.add("fa-pause"); }
          }).catch(function(){});
        }

        const hero = document.getElementById("hero");
        if (hero) hero.classList.add("active");

        initScrollObserver();
        initNav();
        startCountdown();
      }, 900);
    });
  }

  /* scroll reveal */
  let observer = null;
  function initScrollObserver() {
    const items = document.querySelectorAll(".fade-in");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function(el){ el.classList.add("visible"); });
      return;
    }
    if (!observer) {
      observer = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold:0.12, rootMargin:"0px 0px -36px 0px" });
    }
    items.forEach(function(el){
      if (!el.classList.contains("visible")) observer.observe(el);
    });
  }

  /* nav */
  function initNav() {
    const nav = document.getElementById("nav");
    if (!nav) return;
    window.addEventListener("scroll", function(){
      nav.classList.toggle("scrolled", window.scrollY > 40);
    });
  }

  /* countdown */
  let timer = null;
  function startCountdown() {
    if (timer) return;
    const target = new Date(EVENT_DATE_ISO).getTime();
    const elD = document.getElementById("cDays");
    const elH = document.getElementById("cHours");
    const elM = document.getElementById("cMins");
    const elS = document.getElementById("cSecs");
    if (!elD) return;

    function pad(n){ return String(n).padStart(2,"0"); }
    function flip(el, val){
      const s = pad(val);
      if (el.textContent === s) return;
      el.style.opacity = "0";
      el.style.transform = "translateY(-6px)";
      setTimeout(function(){
        el.textContent = s;
        el.style.transition = "opacity .25s,transform .25s";
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }, 140);
    }
    function tick(){
      var diff = Math.max(0, target - Date.now());
      flip(elD, Math.floor(diff/86400000));
      flip(elH, Math.floor((diff%86400000)/3600000));
      flip(elM, Math.floor((diff%3600000)/60000));
      flip(elS, Math.floor((diff%60000)/1000));
      if (diff <= 0 && timer) clearInterval(timer);
    }
    tick();
    timer = setInterval(tick, 1000);
  }

  /* music */
  window.toggleMusic = function(){
    const audio  = document.getElementById("musicAudio");
    const toggle = document.getElementById("musicToggle");
    const icon   = document.getElementById("musicIcon");
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(function(){});
      if (toggle) toggle.classList.add("playing");
      if (icon)   { icon.classList.remove("fa-play"); icon.classList.add("fa-pause"); }
    } else {
      audio.pause();
      if (toggle) toggle.classList.remove("playing");
      if (icon)   { icon.classList.remove("fa-pause"); icon.classList.add("fa-play"); }
    }
  };
  function initMusic(){
    const btn = document.getElementById("musicToggle");
    if (btn) btn.addEventListener("click", window.toggleMusic);
  }

  /* RSVP */
  function initRsvpForm(){
    const form   = document.getElementById("rsvpForm");
    const status = document.getElementById("rsvpStatus");
    const btn    = document.getElementById("rsvpSubmitBtn");
    if (!form) return;

    form.addEventListener("submit", function(e){
      e.preventDefault();
      status.textContent=""; status.className="rsvp__status";
      const payload = {
        nama:        document.getElementById("nama").value.trim(),
        telepon:     document.getElementById("telepon").value.trim(),
        jumlah_tamu: document.getElementById("jumlah_tamu").value,
        kehadiran:   document.getElementById("kehadiran").value,
        ucapan:      document.getElementById("ucapan").value.trim(),
      };
      if (!payload.nama||!payload.telepon||!payload.kehadiran){
        status.textContent="Mohon lengkapi nama, no. telepon, dan konfirmasi kehadiran.";
        status.classList.add("is-error"); return;
      }
      btn.disabled=true; btn.querySelector("span").textContent="Mengirim...";
      fetch(RSVP_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})
        .then(function(r){ if(!r.ok) throw new Error("Gagal mengirim, coba lagi."); return r.json(); })
        .then(function(d){
          if(d&&d.success){
            status.textContent="Terima kasih! Konfirmasi Anda telah kami terima. 🌸";
            status.classList.add("is-success");
            form.reset(); document.getElementById("jumlah_tamu").value=1;
            loadRsvpList();
          } else throw new Error((d&&d.message)||"Gagal mengirim.");
        })
        .catch(function(err){ status.textContent=err.message; status.classList.add("is-error"); })
        .finally(function(){ btn.disabled=false; btn.querySelector("span").textContent="Kirim Konfirmasi"; });
    });
  }

  function loadRsvpList(){
    const list=document.getElementById("rsvpList"); if(!list) return;
    fetch(RSVP_LIST_ENDPOINT)
      .then(function(r){ return r.json(); })
      .then(function(d){
        list.innerHTML="";
        const rows=(d&&d.data)||[];
        if(!rows.length){ list.innerHTML='<li class="empty">Belum ada ucapan. Jadilah yang pertama! 🌸</li>'; return; }
        rows.forEach(function(row){
          const li=document.createElement("li");
          li.innerHTML="<b>"+esc(row.nama)+"</b><span class=\"tag\">"+esc(row.kehadiran)+"</span>"+(row.ucapan?"<p>"+esc(row.ucapan)+"</p>":"");
          list.appendChild(li);
        });
      })
      .catch(function(){ list.innerHTML='<li class="empty">Tidak dapat memuat ucapan saat ini.</li>'; });
  }

  function initRsvpToggle(){
    const toggle=document.getElementById("rsvpListToggle");
    const list  =document.getElementById("rsvpList");
    if(!toggle||!list) return;
    var loaded=false;
    toggle.addEventListener("click",function(){
      list.hidden=!list.hidden;
      toggle.textContent=list.hidden?"Lihat Ucapan Tamu Lainnya ▾":"Tutup Ucapan ▴";
      if(!list.hidden&&!loaded){ loaded=true; loadRsvpList(); }
    });
  }

  function esc(s){ var d=document.createElement("div"); d.textContent=s||""; return d.innerHTML; }

  /* gallery drag-to-scroll (mouse); touch pakai scroll native */
  function initGalleryDrag(){
    const tracks = document.querySelectorAll(".gallery-scroll");
    if (!tracks.length) return;

    tracks.forEach(function(track){
      let isDown = false, startX = 0, scrollStart = 0, moved = false;

      track.addEventListener("mousedown", function(e){
        isDown = true; moved = false;
        track.classList.add("dragging");
        startX = e.pageX;
        scrollStart = track.scrollLeft;
      });
      window.addEventListener("mouseup", function(){
        isDown = false;
        track.classList.remove("dragging");
      });
      window.addEventListener("mouseleave", function(){
        isDown = false;
        track.classList.remove("dragging");
      });
      track.addEventListener("mousemove", function(e){
        if (!isDown) return;
        e.preventDefault();
        const dx = e.pageX - startX;
        if (Math.abs(dx) > 4) moved = true;
        track.scrollLeft = scrollStart - dx;
      });
      // hindari klik "nyangkut" jadi drag pada gambar
      track.addEventListener("click", function(e){
        if (moved) { e.preventDefault(); e.stopPropagation(); }
      }, true);
      track.addEventListener("dragstart", function(e){ e.preventDefault(); });
    });
  }

  /* bunga-bunga minimalis berjatuhan di cover */
  function initPetals(){
    const wrap = document.getElementById("petalsContainer");
    if (!wrap) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const colors = ["#d4a5a5", "#c4898a", "#e8d5b0", "#f0c2c2"];
    const COUNT = window.innerWidth < 560 ? 10 : 16;

    function petalSVG(color){
      // bunga minimalis 5 kelopak
      return (
        '<svg viewBox="0 0 32 32" width="100%" height="100%">' +
        '<g fill="' + color + '" fill-opacity="0.85">' +
        '<ellipse cx="16" cy="8"  rx="5" ry="8"/>' +
        '<ellipse cx="16" cy="24" rx="5" ry="8"/>' +
        '<ellipse cx="8"  cy="16" rx="8" ry="5"/>' +
        '<ellipse cx="24" cy="16" rx="8" ry="5"/>' +
        '</g>' +
        '<circle cx="16" cy="16" r="3.4" fill="#f7eded"/>' +
        '</svg>'
      );
    }

    for (let i = 0; i < COUNT; i++) {
      const petal = document.createElement("div");
      petal.className = "petal";
      const size = 10 + Math.random() * 12;
      const left = Math.random() * 100;
      const duration = 9 + Math.random() * 8;
      const delay = Math.random() * 12;
      const drift = (Math.random() * 120 - 60) + "px";
      const rot = (Math.random() * 280 + 120) + "deg";
      const color = colors[Math.floor(Math.random() * colors.length)];

      petal.style.left = left + "%";
      petal.style.width = size + "px";
      petal.style.height = size + "px";
      petal.style.setProperty("--petal-drift", drift);
      petal.style.setProperty("--petal-rot", rot);
      petal.style.animationDuration = duration + "s";
      petal.style.animationDelay = "-" + delay + "s";
      petal.innerHTML = petalSVG(color);
      wrap.appendChild(petal);
    }
  }

  document.addEventListener("DOMContentLoaded",function(){
    initGuestName(); initCover(); initMusic(); initRsvpForm(); initRsvpToggle(); initGalleryDrag(); initPetals();
  });
})();
