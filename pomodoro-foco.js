/* ==========================================================================
   Pomodoro Foco — módulo isolado
   Adiciona um campo de "tarefa em foco" opcional ao Pomodoro, com um atalho
   para escolher uma tarefa da Agenda Diária de hoje.

   IMPORTANTE: este arquivo NUNCA escreve em localStorage nem no Firestore
   da Agenda — apenas LÊ a chave "ashoras_agenda_tarefas" (a mesma que o
   agenda-sync.js já mantém sincronizada). A lógica original da Agenda e do
   Pomodoro (script.js / agenda.js) não é tocada em nenhum momento.
   ========================================================================== */
(function () {
    const AG_CHAVE_TAREFAS = "ashoras_agenda_tarefas";
    const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

    function pfDiaAtual() {
        return DIAS_SEMANA[new Date().getDay()];
    }

    // Lê (somente leitura) as tarefas em aberto do dia atual na Agenda
    function pfTarefasDeHoje() {
        try {
            const raw = localStorage.getItem(AG_CHAVE_TAREFAS);
            if (!raw) return [];
            const dados = JSON.parse(raw);
            const dia = pfDiaAtual();
            const lista = Array.isArray(dados[dia]) ? dados[dia] : [];
            return lista.filter(function (t) { return t && t.feita === false; });
        } catch (e) {
            console.warn("Pomodoro Foco: não foi possível ler as tarefas da Agenda:", e);
            return [];
        }
    }

    function pfAbrirModal() {
        const overlay = document.getElementById("pf-modal-overlay");
        const listaEl = document.getElementById("pf-modal-lista");
        const vazioEl = document.getElementById("pf-modal-vazio");
        if (!overlay || !listaEl || !vazioEl) return;

        const tarefas = pfTarefasDeHoje();
        listaEl.innerHTML = "";

        if (tarefas.length === 0) {
            const logado = window.firebase && firebase.auth && firebase.auth().currentUser;
            vazioEl.textContent = logado
                ? "Nenhuma tarefa em aberto para hoje. Crie na Agenda Diária."
                : "Conecte-se com o Google na Agenda Diária ou nos Lembretes para ver suas tarefas aqui.";
            vazioEl.style.display = "block";
        } else {
            vazioEl.style.display = "none";
            tarefas.forEach(function (t) {
                const item = document.createElement("button");
                item.type = "button";
                item.className = "pf-modal-item";
                item.textContent = t.texto || "(sem descrição)";
                item.addEventListener("click", function () {
                    pfMostrarNoLED(t.texto || "");
                    pfFecharModal();
                });
                listaEl.appendChild(item);
            });
        }

        overlay.style.display = "flex";
    }

    function pfFecharModal() {
        const overlay = document.getElementById("pf-modal-overlay");
        if (overlay) overlay.style.display = "none";
    }

    function pfMostrarNoLED(texto) {
        const painel = document.getElementById("pf-led-painel");
        const textoEl = document.getElementById("pf-led-texto");
        if (painel && textoEl) {
            textoEl.textContent = texto;
            painel.classList.add("pf-visivel");
        }
    }

    function pfLimparCampo() {
        const painel = document.getElementById("pf-led-painel");
        const textoEl = document.getElementById("pf-led-texto");
        if (painel) painel.classList.remove("pf-visivel");
        if (textoEl) textoEl.textContent = "";
    }

    function pfConectarEventos() {
        const btnAgenda = document.getElementById("pf-btn-agenda");
        const btnFechar = document.getElementById("pf-modal-fechar");
        const overlay = document.getElementById("pf-modal-overlay");
        const btnReset = document.getElementById("pomodoro-reset-btn");

        if (btnAgenda) btnAgenda.addEventListener("click", pfAbrirModal);
        if (btnFechar) btnFechar.addEventListener("click", pfFecharModal);
        if (overlay) {
            overlay.addEventListener("click", function (e) {
                if (e.target === overlay) pfFecharModal();
            });
        }
        // Escuta o botão de reset do Pomodoro JÁ EXISTENTE, apenas para limpar
        // o campo de foco junto — não substitui nem altera o listener original
        // do script.js, que continua funcionando normalmente.
        if (btnReset) btnReset.addEventListener("click", pfLimparCampo);
    }

    document.addEventListener("DOMContentLoaded", pfConectarEventos);
})();
