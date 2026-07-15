/* ============================================================
   SEMANA DO ANO — navegação entre semanas + barra do ano
   Semana começa na SEGUNDA-FEIRA (alinhado com script.js).
   MutationObserver protege os valores quando em modo consulta.
   ============================================================ */

(() => {
    'use strict';

    /* ── Helpers ────────────────────────────────────────────── */

    /** Retorna a primeira segunda-feira do ano. */
    function primeiraSegundaFeira(ano) {
        const jan1 = new Date(ano, 0, 1);
        const dia  = jan1.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
        if (dia === 1) return jan1;
        // Dias para chegar na próxima segunda
        const offset = dia === 0 ? 1 : 8 - dia;
        return new Date(ano, 0, 1 + offset);
    }

    /** Número da semana do ano (semana começa na segunda-feira). */
    function semanaDoAno(data) {
        const ano   = data.getFullYear();
        const d     = new Date(ano, data.getMonth(), data.getDate());
        const seg   = primeiraSegundaFeira(ano);
        if (d < seg) return 1; // antes da primeira segunda = semana 1
        const diffDias = Math.floor((d - seg) / 86400000);
        return Math.floor(diffDias / 7) + 2;
    }

    /** Total de semanas do ano. */
    function totalSemanasAno(ano) {
        return semanaDoAno(new Date(ano, 11, 31));
    }

    /** Intervalo { inicio: Date, fim: Date } de uma semana. */
    function rangeDeUmaSemana(ano, sem) {
        let inicio;
        if (sem === 1) {
            // Semana 1 começa na segunda-feira da semana que contém 1º de janeiro.
            // Essa segunda pode ser no ano anterior (ex: 29/12/2025 para o ano 2026).
            const jan1 = new Date(ano, 0, 1);
            const dia  = jan1.getDay(); // 0=Dom, 1=Seg … 6=Sáb
            const diasAtras = dia === 0 ? 6 : dia - 1; // quantos dias voltar até a segunda
            inicio = new Date(ano, 0, 1 - diasAtras);
        } else {
            const seg = primeiraSegundaFeira(ano);
            inicio = new Date(seg);
            inicio.setDate(inicio.getDate() + (sem - 2) * 7);
        }
        const fim = new Date(inicio);
        fim.setDate(fim.getDate() + 6);
        return { inicio, fim };
    }

    /** Formata Date como dd/mm. */
    const fmtDia = d =>
        `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;

    /** Dia ordinal do ano (1–365/366). */
    function diaDoAno(data) {
        const inicio = new Date(data.getFullYear(), 0, 1);
        // Zera horas/minutos/segundos antes de calcular a diferença — sem isso,
        // sobrava uma fração de dia (a hora atual) que o Math.ceil arredondava
        // para cima, somando 1 dia a mais na contagem.
        const d = new Date(data.getFullYear(), data.getMonth(), data.getDate());
        return Math.round((d - inicio) / 86400000) + 1;
    }

    /** Total de dias do ano. */
    function totalDiasAno(ano) {
        return (ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0)) ? 366 : 365;
    }

    /* ── Estado ────────────────────────────────────────────── */
    const hoje       = new Date();
    const semanaHoje = semanaDoAno(hoje);
    const anoAtual   = hoje.getFullYear();
    const totalSem   = totalSemanasAno(anoAtual);

    let semanaAtiva   = semanaHoje;
    let modoNavegacao = false;
    let valoresProtegidos = null;

    /* ── Referências DOM ───────────────────────────────────── */
    const elNumero = document.getElementById('week-number-value-tab');
    const elInicio = document.getElementById('week-start-date-tab');
    const elFim    = document.getElementById('week-end-date-tab');
    const elDiaTxt = document.getElementById('day-of-year-text');
    const secao    = document.getElementById('semana-do-ano');

    if (!elNumero || !secao) return;

    /* ── Injetar botões de navegação ───────────────────────── */
    const wrapperExistente = elNumero.parentElement;

    const navWrapper = document.createElement('div');
    navWrapper.className = 'sda-nav-wrapper';

    const btnPrev = document.createElement('button');
    btnPrev.className = 'sda-btn-nav';
    btnPrev.id = 'sda-btn-prev';
    btnPrev.title = 'Semana anterior';
    btnPrev.setAttribute('aria-label', 'Semana anterior');
    btnPrev.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';

    const btnNext = document.createElement('button');
    btnNext.className = 'sda-btn-nav';
    btnNext.id = 'sda-btn-next';
    btnNext.title = 'Próxima semana';
    btnNext.setAttribute('aria-label', 'Próxima semana');
    btnNext.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';

    const badge = document.createElement('span');
    badge.className = 'sda-badge-atual';
    badge.textContent = '● SEMANA ATUAL';

    const numWrap = document.createElement('div');
    numWrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;';
    elNumero.parentNode.insertBefore(numWrap, elNumero);
    numWrap.appendChild(elNumero);
    numWrap.appendChild(badge);

    navWrapper.appendChild(btnPrev);
    navWrapper.appendChild(numWrap);
    navWrapper.appendChild(btnNext);
    wrapperExistente.insertBefore(navWrapper, wrapperExistente.firstChild);

    /* ── Injetar barra de progresso do ano ─────────────────── */
    const barraContainer = document.createElement('div');
    barraContainer.innerHTML = `
        <p class="sda-dia-label" id="sda-dia-label">Dia -- de ---</p>
        <div class="sda-ano-barra-container">
            <span class="sda-ano-label" id="sda-ano-label-txt">Ano ${anoAtual}</span>
            <div class="sda-ano-track">
                <div class="sda-ano-fill" id="sda-ano-fill" style="width:0%"></div>
            </div>
            <span class="sda-ano-pct" id="sda-ano-pct">0%</span>
            <span class="sda-ano-icon"><i class="fa-solid fa-calendar-days"></i></span>
        </div>
    `;

    const weekContent = secao.querySelector('.week-of-year-content-tab');
    if (weekContent) weekContent.insertAdjacentElement('afterend', barraContainer);

    /* ── MutationObserver: protege valores em modo consulta ─── */
    let observando = false;

    const observer = new MutationObserver(() => {
        if (!modoNavegacao || !valoresProtegidos) return;
        if (elNumero.textContent !== valoresProtegidos.numero)
            elNumero.textContent = valoresProtegidos.numero;
        if (elInicio && elInicio.textContent !== valoresProtegidos.inicio)
            elInicio.textContent = valoresProtegidos.inicio;
        if (elFim && elFim.textContent !== valoresProtegidos.fim)
            elFim.textContent = valoresProtegidos.fim;
        if (elDiaTxt && elDiaTxt.textContent !== valoresProtegidos.diaTxt)
            elDiaTxt.textContent = valoresProtegidos.diaTxt;
    });

    function ligarObserver() {
        const cfg = { childList: true, characterData: true, subtree: true };
        [elNumero, elInicio, elFim, elDiaTxt].forEach(el => {
            if (el) observer.observe(el, cfg);
        });
        observando = true;
    }

    function desligarObserver() {
        observer.disconnect();
        observando = false;
    }

    /* ── Render principal ───────────────────────────────────── */
    function renderSemana(sem) {
        semanaAtiva   = Math.max(1, Math.min(totalSem, sem));
        modoNavegacao = (semanaAtiva !== semanaHoje);

        desligarObserver();

        const { inicio, fim } = rangeDeUmaSemana(anoAtual, semanaAtiva);

        // Para a barra: usa hoje se for semana atual, senão o início da semana consultada
        const refData   = modoNavegacao ? inicio : hoje;
        const diaRef    = diaDoAno(refData);
        const totalDias = totalDiasAno(anoAtual);
        const pct       = Math.round((diaRef / totalDias) * 100);

        const numStr = String(semanaAtiva).padStart(2, '0');
        const iniStr = fmtDia(inicio);
        const fimStr = fmtDia(fim);
        const diaStr = `${diaRef} de ${totalDias}`;

        // Atualizar DOM
        elNumero.textContent = numStr;
        if (elInicio) elInicio.textContent = iniStr;
        if (elFim)    elFim.textContent    = fimStr;
        if (elDiaTxt) elDiaTxt.textContent = diaStr;

        // Guardar para proteger contra script.js
        valoresProtegidos = { numero: numStr, inicio: iniStr, fim: fimStr, diaTxt: diaStr };

        // Barra do ano
        const fill   = document.getElementById('sda-ano-fill');
        const pctEl  = document.getElementById('sda-ano-pct');
        const label  = document.getElementById('sda-dia-label');
        if (fill)  fill.style.width  = pct + '%';
        if (pctEl) pctEl.textContent = pct + '%';
        if (label) label.textContent = `Dia ${diaRef} de ${totalDias}`;

        // Badge e modo
        badge.classList.toggle('oculto', modoNavegacao);
        secao.classList.toggle('sda-modo-navegacao', modoNavegacao);

        // Botões
        btnPrev.disabled      = semanaAtiva <= 1;
        btnNext.disabled      = semanaAtiva >= totalSem;
        btnPrev.style.opacity = btnPrev.disabled ? '.35' : '1';
        btnNext.style.opacity = btnNext.disabled ? '.35' : '1';

        // Ativar proteção apenas em modo consulta
        if (modoNavegacao) ligarObserver();
    }

    /* ── Eventos ────────────────────────────────────────────── */
    btnPrev.addEventListener('click', () => renderSemana(semanaAtiva - 1));
    btnNext.addEventListener('click', () => renderSemana(semanaAtiva + 1));

    // Clique no número → volta à semana atual
    elNumero.style.cursor = 'pointer';
    elNumero.title = 'Clique para voltar à semana atual';
    elNumero.addEventListener('click', () => {
        if (modoNavegacao) renderSemana(semanaHoje);
    });

    /* ── Init ───────────────────────────────────────────────── */
    setTimeout(() => renderSemana(semanaHoje), 150);

})();
