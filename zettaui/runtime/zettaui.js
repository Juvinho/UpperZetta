/**
 * ZettaUI — runtime oficial da UpperZetta para UI web.
 * Vanilla JS, zero dependências, zero frameworks.
 *
 * API:
 *   ZettaUI.dad(className)        → cria container (div)
 *   ZettaUI.child(tag, content)   → cria filho (h1, p, button, ...)
 *   ZettaUI.mount(node, target)   → monta componente no DOM
 *   node.hug(child)               → appendChild + registra pai, retorna this
 *   node.mood(name)               → classList.add (happy | shy | sleepy)
 *   node.unmood(name)             → classList.remove
 *   node.sleep(ms)                → Promise, suspende visualmente
 *   node.wake()                   → encerra sleep
 *   node.onClick(fn)              → addEventListener click
 *   node.on(evento, fn)           → addEventListener genérico
 *
 *   ZettaAnim.appear(node)        → fadeIn suave
 *   ZettaAnim.leave(node)         → fadeOut suave
 *   ZettaAnim.breath(node)        → pulso suave, loop
 *   ZettaAnim.bounce(node)        → quica uma vez
 *   ZettaAnim.blink(node)         → pisca uma vez
 *   ZettaAnim.apply(node, name, ms) → animação por nome
 */

(function (global) {
  'use strict';

  // ── CSS injection ─────────────────────────────────────────────────────────

  function _injectCSS() {
    if (document.getElementById('__zettaui__')) return;
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const self    = scripts.find(s => s.src.includes('zettaui.js'));
    const base    = self ? self.src.replace(/zettaui\.js(\?.*)?$/, '') : '';

    const link = document.createElement('link');
    link.id   = '__zettaui__';
    link.rel  = 'stylesheet';
    link.href = base + 'zettaui.css';
    document.head.appendChild(link);
  }

  // ── Error helpers ─────────────────────────────────────────────────────────

  function _err(msg) {
    const text = `✗ Erro ZettaUI: ${msg}`;
    console.error(text);
    throw new Error(text);
  }

  function _warn(msg) {
    console.warn(`⚠ ZettaUI: ${msg}`);
  }

  // Forces a layout reflow so removing + re-adding an animation class works.
  function _reflow(el) { void el.offsetWidth; }

  // ── ZettaNode ─────────────────────────────────────────────────────────────

  class ZettaNode {
    constructor(el) {
      this._el         = el;
      this._dad        = null;   // set by hug()
      this._sleeping   = false;
      this._sleepTimer = null;
    }

    /**
     * Abriga um filho. Retorna this para encadeamento.
     * Após hug(), o child também pode receber filhos — todo abraçado vira lar.
     */
    hug(child) {
      if (!(child instanceof ZettaNode)) {
        _err(
          `${child} não tem pai.\n` +
          `Dica: todo filho precisa de um abraço.`
        );
      }
      this._el.appendChild(child._el);
      child._dad = this;
      return this;
    }

    /**
     * Aplica um humor. Humores válidos: happy, shy, sleepy.
     */
    mood(name) {
      const valid = ['happy', 'shy', 'sleepy'];
      if (!valid.includes(name)) {
        _warn(
          `mood("${name}") não reconhecido.\n` +
          `Dica: humores válidos são happy, shy e sleepy.`
        );
      }
      this._el.classList.add(name);
      return this;
    }

    unmood(name) {
      this._el.classList.remove(name);
      return this;
    }

    /**
     * Suspende visualmente por ms milissegundos.
     * Retorna Promise<ZettaNode> — use await ou .then().
     * Todo mundo que dorme, acorda.
     */
    sleep(ms) {
      this._sleeping = true;
      this._el.classList.add('zetta-sleeping');
      return new Promise(resolve => {
        this._sleepTimer = setTimeout(() => {
          this._sleeping   = false;
          this._sleepTimer = null;
          this._el.classList.remove('zetta-sleeping');
          resolve(this);
        }, ms);
      });
    }

    /**
     * Acorda antes do timer (cancela sleep pendente).
     */
    wake() {
      if (this._sleepTimer) {
        clearTimeout(this._sleepTimer);
        this._sleepTimer = null;
      }
      this._sleeping = false;
      this._el.classList.remove('zetta-sleeping');
      return this;
    }

    onClick(fn) {
      this._el.addEventListener('click', fn);
      return this;
    }

    on(event, fn) {
      this._el.addEventListener(event, fn);
      return this;
    }
  }

  // ── ZettaUI ───────────────────────────────────────────────────────────────

  const ZettaUI = {

    /**
     * Cria um container (div) com a classe fornecida.
     */
    dad(className) {
      _injectCSS();
      const el = document.createElement('div');
      if (className) el.className = className;
      return new ZettaNode(el);
    },

    /**
     * Cria um elemento filho com tag e conteúdo.
     * Um child que recebe .hug() passa a se comportar como dad.
     */
    child(tag, content) {
      _injectCSS();
      const el = document.createElement(tag);
      if (content !== undefined) el.textContent = String(content);
      return new ZettaNode(el);
    },

    /**
     * Monta um componente no DOM.
     * target: string (CSS selector) | HTMLElement | null → body
     */
    mount(node, target) {
      if (!(node instanceof ZettaNode)) {
        _err(
          `render() não retornou um dad.\n` +
          `Dica: todo componente precisa de um lar.`
        );
      }
      const root =
        typeof target === 'string' ? document.querySelector(target) :
        target instanceof HTMLElement ? target :
        document.body;
      root.appendChild(node._el);
    },

    // Exposed for transpiler-generated runtime checks
    ZettaNode,
    _err,
    _warn,
  };

  // ── ZettaAnim ─────────────────────────────────────────────────────────────

  const ZettaAnim = {

    /** fadeIn suave + sobe levemente */
    appear(node) {
      if (!node._dad) {
        _warn(
          `ZettaAnim.appear() em elemento sem pai.\n` +
          `Dica: como animar algo que ainda não existe pra ninguém?`
        );
      }
      _reflow(node._el);
      node._el.classList.add('zetta-appear');
    },

    /** fadeOut suave + desce levemente */
    leave(node) {
      _reflow(node._el);
      node._el.classList.add('zetta-leave');
    },

    /** Pulso suave em loop — o elemento respira */
    breath(node) {
      node._el.classList.add('zetta-breath');
    },

    /** Uma quicada rápida — atenção sem ansiedade */
    bounce(node) {
      node._el.classList.remove('zetta-bounce');
      _reflow(node._el);
      node._el.classList.add('zetta-bounce');
      node._el.addEventListener(
        'animationend',
        () => node._el.classList.remove('zetta-bounce'),
        { once: true }
      );
    },

    /** Pisca uma vez */
    blink(node) {
      node._el.classList.remove('zetta-blink');
      _reflow(node._el);
      node._el.classList.add('zetta-blink');
      node._el.addEventListener(
        'animationend',
        () => node._el.classList.remove('zetta-blink'),
        { once: true }
      );
    },

    /**
     * Aplica animação por nome com duração customizada.
     * apply(node, "bounce", 600) — nome sem prefixo "zetta-"
     */
    apply(node, name, durationMs) {
      node._el.style.animationDuration = `${durationMs}ms`;
      node._el.classList.remove(`zetta-${name}`);
      _reflow(node._el);
      node._el.classList.add(`zetta-${name}`);
    },
  };

  // ── Export ────────────────────────────────────────────────────────────────

  global.ZettaUI   = ZettaUI;
  global.ZettaAnim = ZettaAnim;

})(typeof window !== 'undefined' ? window : globalThis);
