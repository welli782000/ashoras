/* ── Weather Widget – AsHoras ────────────────────────────────── */

(function () {

    const WMO = {
        0:  { desc: "Céu limpo"           },
        1:  { desc: "Predomin. limpo"     },
        2:  { desc: "Parcial. nublado"    },
        3:  { desc: "Nublado"             },
        45: { desc: "Névoa"               },
        48: { desc: "Névoa c/ geada"      },
        51: { desc: "Chuvisco leve"       },
        53: { desc: "Chuvisco"            },
        55: { desc: "Chuvisco intenso"    },
        61: { desc: "Chuva leve"          },
        63: { desc: "Chuva moderada"      },
        65: { desc: "Chuva forte"         },
        71: { desc: "Neve leve"           },
        73: { desc: "Neve moderada"       },
        75: { desc: "Neve forte"          },
        80: { desc: "Pancadas de chuva"   },
        81: { desc: "Pancadas moderadas"  },
        82: { desc: "Pancadas fortes"     },
        95: { desc: "Tempestade"          },
        96: { desc: "Tempestade c/ granizo" },
        99: { desc: "Tempestade forte"    },
    };

    function getWeatherInfo(code) {
        return WMO[code] || { desc: "Clima" };
    }

    const widget  = document.getElementById("weather-widget");
    const dataEl  = document.getElementById("weather-data");
    const noLocEl = document.getElementById("weather-no-location");
    const tempEl  = document.getElementById("weather-temp");
    const descEl  = document.getElementById("weather-desc");
    const cityEl  = document.getElementById("weather-city");

    if (!widget) return;

    const CACHE_KEY = "ashoras_weather_cache";
    const CACHE_TTL = 30 * 60 * 1000;

    try { localStorage.removeItem(CACHE_KEY); } catch {}

    function getCache() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (Date.now() - data.timestamp > CACHE_TTL) return null;
            return data;
        } catch { return null; }
    }

    function setCache(data) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, timestamp: Date.now() }));
        } catch {}
    }

    function render(data) {
        widget.classList.remove("weather-loading", "weather-no-loc");
        dataEl.style.display  = "flex";
        noLocEl.style.display = "none";
        tempEl.textContent = data.temp + "°C";
        descEl.textContent = data.desc;
        cityEl.textContent = data.city || "";
    }

    function renderNoLocation() {
        widget.classList.remove("weather-loading");
        widget.classList.add("weather-no-loc");
        dataEl.style.display  = "none";
        noLocEl.style.display = "flex";
    }

    async function fetchWeather(lat, lon) {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&temperature_unit=celsius&timezone=auto`;
        const res  = await fetch(url);
        const json = await res.json();
        const cur  = json.current;
        const info = getWeatherInfo(cur.weathercode);
        return { temp: Math.round(cur.temperature_2m), desc: info.desc };
    }

    async function fetchCity(lat, lon) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14&addressdetails=1&accept-language=pt-BR`;
            const res  = await fetch(url, { headers: { "Accept-Language": "pt-BR,pt;q=0.9" } });
            const json = await res.json();
            const addr = json.address || {};
            return (
                addr.town         ||
                addr.village      ||
                addr.municipality ||
                addr.city_district||
                addr.city         ||
                addr.county       ||
                ""
            );
        } catch { return ""; }
    }

    async function loadWeather(forceRefresh) {
        if (!forceRefresh) {
            const cached = getCache();
            if (cached) { render(cached); return; }
        }

        widget.classList.add("weather-loading");
        dataEl.style.display  = "flex";
        noLocEl.style.display = "none";
        tempEl.textContent = "--°C";
        descEl.textContent = "···";
        cityEl.textContent = "";

        if (!navigator.geolocation) { renderNoLocation(); return; }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const lat = pos.coords.latitude.toFixed(5);
                    const lon = pos.coords.longitude.toFixed(5);
                    const [weather, city] = await Promise.all([
                        fetchWeather(lat, lon),
                        fetchCity(lat, lon),
                    ]);
                    const data = { ...weather, city };
                    setCache(data);
                    render(data);
                } catch {
                    renderNoLocation();
                }
            },
            () => renderNoLocation(),
            { timeout: 10000, maximumAge: 0 }
        );
    }

    // ── Clique no ícone: pede permissão ou atualiza ───────────────
    widget.addEventListener("click", async () => {
        try { localStorage.removeItem(CACHE_KEY); } catch {}

        // Verifica se a permissão foi bloqueada permanentemente
        if (navigator.permissions) {
            try {
                const status = await navigator.permissions.query({ name: "geolocation" });
                if (status.state === "denied") {
                    // Permissão bloqueada: orienta o usuário a liberar nas configurações
                    alert("📍 Localização bloqueada.\n\nPara ver o clima, ative a localização nas configurações do seu navegador para este site.");
                    return;
                }
            } catch {}
        }

        // Permissão não concedida ainda ou já concedida: dispara o popup nativo
        loadWeather(true);
    });

    loadWeather(false);

})();
