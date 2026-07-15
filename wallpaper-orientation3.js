/* ============================================================
   wallpaper-orientation.js
   Faz o protetor de tela de papel de parede (#flip-clock-screensaver)
   abrir automaticamente em modo paisagem (horizontal) quando
   ativado em um celular.

   Não modifica script.js nem nenhuma outra função existente —
   apenas escuta o clique no botão que já existe
   (#activate-screensaver-btn) e observa quando o overlay
   (#flip-clock-screensaver) é mostrado/escondido.

   Estratégia (nessa ordem, com fallback):
   1) Screen Orientation API — screen.orientation.lock('landscape')
      Funciona na maioria dos navegadores Android (Chrome, etc.),
      geralmente exigindo modo tela cheia primeiro.
   2) Fallback via CSS — para navegadores que não suportam a API
      de travar orientação (ex: Safari no iPhone), gira o overlay
      90° por CSS para simular a horizontal.
   ============================================================ */

(function () {
    'use strict';

    var OVERLAY_ID = 'flip-clock-screensaver';
    var TRIGGER_BTN_ID = 'activate-screensaver-btn';
    var ROTATE_CLASS = 'force-landscape-rotate';

    var weRequestedFullscreen = false;

    function isMobileDevice() {
        var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        var narrow = Math.min(window.innerWidth, window.innerHeight) <= 900;
        return !!coarse && narrow;
    }

    function getFullscreenElement() {
        return document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement ||
            null;
    }

    function requestFS(el) {
        var req = el.requestFullscreen || el.webkitRequestFullscreen ||
            el.mozRequestFullScreen || el.msRequestFullscreen;
        if (!req) return Promise.reject(new Error('Fullscreen API indisponível'));
        return req.call(el);
    }

    function exitFS() {
        var exit = document.exitFullscreen || document.webkitExitFullscreen ||
            document.mozCancelFullScreen || document.msExitFullscreen;
        if (exit) {
            try { exit.call(document); } catch (e) { /* silencioso */ }
        }
    }

    function tryOrientationLock() {
        try {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(function () {
                    /* não suportado/permitido — o fallback de CSS cobre isso */
                });
            } else if (screen.lockOrientation) {
                screen.lockOrientation('landscape');
            }
        } catch (e) { /* silencioso */ }
    }

    function unlockOrientation() {
        try {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            } else if (screen.unlockOrientation) {
                screen.unlockOrientation();
            }
        } catch (e) { /* silencioso */ }

        if (weRequestedFullscreen && getFullscreenElement()) {
            exitFS();
        }
        weRequestedFullscreen = false;
    }

    function hasNativeLandscapeLock() {
        return !!(screen.orientation && screen.orientation.type &&
            screen.orientation.type.indexOf('landscape') !== -1);
    }

    function updateCssFallback(overlayEl) {
        var isPortrait = window.innerHeight > window.innerWidth;
        if (isPortrait && isMobileDevice() && !hasNativeLandscapeLock()) {
            overlayEl.classList.add(ROTATE_CLASS);
        } else {
            overlayEl.classList.remove(ROTATE_CLASS);
        }
    }

    function applyCssFallback(overlayEl) {
        var handler = function () { updateCssFallback(overlayEl); };
        overlayEl.__orientationUpdateHandler = handler;
        window.addEventListener('resize', handler);
        window.addEventListener('orientationchange', handler);
        handler();
    }

    function removeCssFallback(overlayEl) {
        overlayEl.classList.remove(ROTATE_CLASS);
        if (overlayEl.__orientationUpdateHandler) {
            window.removeEventListener('resize', overlayEl.__orientationUpdateHandler);
            window.removeEventListener('orientationchange', overlayEl.__orientationUpdateHandler);
            overlayEl.__orientationUpdateHandler = null;
        }
    }

    function lockLandscape(overlayEl) {
        if (!isMobileDevice()) return;

        if (!getFullscreenElement()) {
            requestFS(document.documentElement).then(function () {
                weRequestedFullscreen = true;
                tryOrientationLock();
            }).catch(function () {
                // alguns navegadores permitem travar a orientação mesmo sem tela cheia
                tryOrientationLock();
            });
        } else {
            tryOrientationLock();
        }

        applyCssFallback(overlayEl);
    }

    function init() {
        var overlay = document.getElementById(OVERLAY_ID);
        var btn = document.getElementById(TRIGGER_BTN_ID);
        if (!overlay || !btn) return;

        btn.addEventListener('click', function () {
            // pequeno atraso para deixar o script.js exibir o overlay primeiro
            setTimeout(function () {
                if (overlay.style.display !== 'none') {
                    lockLandscape(overlay);
                }
            }, 50);
        });

        var wasVisible = overlay.style.display !== 'none';
        var observer = new MutationObserver(function () {
            var isVisible = overlay.style.display !== 'none';
            if (wasVisible && !isVisible) {
                unlockOrientation();
                removeCssFallback(overlay);
            }
            wasVisible = isVisible;
        });
        observer.observe(overlay, { attributes: true, attributeFilter: ['style'] });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
