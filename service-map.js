(() => {
  const CITIES = [
    { name: "Renton", lat: 47.4829, lng: -122.2171 },
    { name: "Kent", lat: 47.3809, lng: -122.2348 },
    { name: "Maple Valley", lat: 47.3923, lng: -122.0454 },
    { name: "Covington", lat: 47.3573, lng: -122.1015 },
    { name: "Federal Way", lat: 47.3223, lng: -122.3126 },
    { name: "Auburn", lat: 47.3073, lng: -122.2285 },
    { name: "Sumner", lat: 47.2032, lng: -122.2404 },
    { name: "Puyallup", lat: 47.1854, lng: -122.2929 },
    { name: "Bonney Lake", lat: 47.1771, lng: -122.1868 },
    { name: "Enumclaw", lat: 47.2043, lng: -121.9915 }
  ];

  let leafletPromise = null;
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (leafletPromise) return leafletPromise;
    leafletPromise = new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      css.integrity = "sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H";
      css.crossOrigin = "anonymous";
      document.head.appendChild(css);
      const js = document.createElement("script");
      js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      js.integrity = "sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH";
      js.crossOrigin = "anonymous";
      js.onload = () => resolve(window.L);
      js.onerror = reject;
      document.head.appendChild(js);
    });
    return leafletPromise;
  }

  class ServiceAreaMap extends HTMLElement {
    connectedCallback() {
      if (this._built) return;
      this._built = true;
      this.style.display = "block";
      this.style.position = "relative";
      this.style.width = "100%";
      this.style.height = this.getAttribute("height") || "460px";
      this.style.background = "#EFEBE5";

      const holder = document.createElement("div");
      holder.style.cssText = "position:absolute;inset:0";
      this.appendChild(holder);

      loadLeaflet().then((L) => {
        const map = L.map(holder, {
          center: [47.318, -122.235],
          zoom: 10,
          scrollWheelZoom: false,
          zoomControl: true,
          attributionControl: true
        });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 18
        }).addTo(map);
        const tilePane = holder.querySelector(".leaflet-tile-pane");
        if (tilePane) tilePane.style.filter = "grayscale(1) contrast(1.04) brightness(1.02)";

        if (!document.getElementById("sam-keyframes")) {
          const st = document.createElement("style");
          st.id = "sam-keyframes";
          st.textContent = "@keyframes samDrop{0%{opacity:0;transform:translateY(-22px) scale(.7)}70%{opacity:1;transform:translateY(2px) scale(1.05)}100%{opacity:1;transform:none}}@media (prefers-reduced-motion: reduce){.sam-pin{animation:none !important}}";
          document.head.appendChild(st);
        }
        const icon = L.divIcon({
          className: "",
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          html: '<span class="sam-pin" style="display:block;width:16px;height:16px;border-radius:50%;background:#215088;border:3px solid #FFFFFF;box-shadow:0 1px 4px rgba(0,0,0,0.45);animation:samDrop .5s cubic-bezier(.2,.8,.3,1) both"></span>'
        });
        const dropPins = () => {
          CITIES.forEach((c, i) => {
            setTimeout(() => {
              L.marker([c.lat, c.lng], { icon, title: c.name })
                .addTo(map)
                .bindTooltip(c.name, { direction: "top", offset: [0, -10] });
            }, i * 110);
          });
        };
        if ("IntersectionObserver" in window) {
          const io = new IntersectionObserver((es) => {
            es.forEach((e) => { if (e.isIntersecting) { dropPins(); io.disconnect(); } });
          }, { threshold: 0.25 });
          io.observe(this);
        } else {
          dropPins();
        }

        const fit = L.latLngBounds(CITIES.map((c) => [c.lat, c.lng])).pad(0.18);
        map.fitBounds(fit);
        setTimeout(() => map.invalidateSize(), 200);
        const refit = () => { map.invalidateSize(); map.fitBounds(fit); };
        if ("ResizeObserver" in window) {
          this._ro = new ResizeObserver(() => {
            clearTimeout(this._rt);
            this._rt = setTimeout(refit, 120);
          });
          this._ro.observe(this);
        } else {
          this._onResize = () => { clearTimeout(this._rt); this._rt = setTimeout(refit, 120); };
          window.addEventListener("resize", this._onResize);
        }
        this._map = map;
      });
    }
    disconnectedCallback() {
      if (this._ro) { this._ro.disconnect(); this._ro = null; }
      if (this._onResize) { window.removeEventListener("resize", this._onResize); this._onResize = null; }
      clearTimeout(this._rt);
      if (this._map) { this._map.remove(); this._map = null; this._built = false; }
    }
  }

  if (!customElements.get("service-area-map")) {
    customElements.define("service-area-map", ServiceAreaMap);
  }
  window.MAYS_SERVICE_CITIES = CITIES.map((c) => c.name);
})();
