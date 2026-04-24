import React from "react";
import { ZettaLogo } from "../../assets/logo";

interface WelcomeScreenProps {
  onOpenFolder: () => void;
  onNewFile: () => void;
  onLoadExamples: () => void;
}

export function WelcomeScreen(props: WelcomeScreenProps): React.ReactElement {
  return (
    <section className="welcome-screen">
      <div className="welcome-header">
        <ZettaLogo />
        <h1>ZettaSource</h1>
        <p>Ambiente oficial de desenvolvimento da linguagem Upperzetta (Uzet).</p>
      </div>

      <div className="welcome-actions">
        <button className="action-button emphasis" onClick={props.onOpenFolder}>
          Abrir Pasta
        </button>
        <button className="action-button" onClick={props.onNewFile}>
          Novo Arquivo Uzet
        </button>
        <button className="action-button" onClick={props.onLoadExamples}>
          Carregar Exemplos
        </button>
      </div>

      <div className="welcome-grid">
        <article className="welcome-card">
          <h3>Extensoes Suportadas</h3>
          <p>.uz, .up e .upz</p>
        </article>
        <article className="welcome-card">
          <h3>Atalhos</h3>
          <p>Ctrl/Cmd+S salvar, Ctrl/Cmd+P quick open, Ctrl/Cmd+B compilar</p>
        </article>
        <article className="welcome-card">
          <h3>Linguagem MVP</h3>
          <p>let, var, const, fun, class, component, if/else, for, while, return, import, print</p>
        </article>
      </div>
    </section>
  );
}
