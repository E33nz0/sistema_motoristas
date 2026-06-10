// ============================================================
//  MOTORISTAS — backend via API REST
// ============================================================

const lista         = document.getElementById('lista');
const painel        = document.getElementById('painel');
const busca         = document.getElementById('busca');
const btnNovo       = document.getElementById('btnNovo');
const filtroPend    = document.getElementById('filtroPendencias');
const diasAlertaEl  = document.getElementById('diasAlerta');

let todosMotoristas = [];
let selecionadoId   = null;
let buscaTimer      = null;

// ── ABAS ─────────────────────────────────────────────────────
document.querySelectorAll('.aba-main').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.aba-main').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    const aba = btn.dataset.aba;
    document.getElementById('tela-cadastros').style.display = aba === 'cadastros' ? '' : 'none';
    document.getElementById('tela-alertas').style.display   = aba === 'alertas'   ? '' : 'none';
    if (aba === 'alertas') renderAlertasTela();
  });
});

const CADASTROS = ['PAMCARY','ANGELLIRA','OPENTECH','ATUA','MULTIS','GALILEU','ADAGIO'];

// ── HELPERS ──────────────────────────────────────────────────
function diasParaVencer(dataISO) {
  if (!dataISO) return null;
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const dt   = new Date(dataISO + 'T00:00:00');
  if (isNaN(dt)) return null;
  return Math.ceil((dt - hoje) / 86400000);
}

function fmt(dataISO) {
  if (!dataISO) return '—';
  const d = new Date(dataISO + 'T00:00:00');
  return d.toLocaleDateString('pt-BR');
}

function statusValidade(dataISO, limite = 30) {
  const d = diasParaVencer(dataISO);
  if (d === null) return { cls: '', chip: '' };
  if (d < 0)       return { cls: 'is-expired', chip: `<span class="chip">Vencida há ${Math.abs(d)}d</span>` };
  if (d <= limite) return { cls: 'is-warning', chip: `<span class="chip">Vence em ${d}d</span>` };
  return { cls: 'is-ok', chip: `<span class="chip">OK — ${fmt(dataISO)}</span>` };
}

function parseCadastros(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

function viagensAlerta(m) {
  const v = parseInt(m.viagens_opentech ?? -1);
  return v >= 0 && v < 5;
}

function pendencias(m) {
  const limite  = parseInt(diasAlertaEl.value || 30);
  const diasCnh = diasParaVencer(m.validade_cnh);
  const diasOtDpa = diasParaVencer(m.val_opentech_dpa);
  const diasOtBrf = diasParaVencer(m.val_opentech_brf);
  const diasComp  = diasParaVencer(m.val_comprovante);
  return {
    semCnh:        !(m.doc_cnh && m.doc_cnh.trim()),
    semCert:       !(m.doc_tablet && m.doc_tablet.trim()),
    dias:          diasCnh,
    cnhVencendo:   diasCnh !== null && diasCnh <= limite,
    otDpaVencendo: diasOtDpa !== null && diasOtDpa <= limite,
    otBrfVencendo: diasOtBrf !== null && diasOtBrf <= limite,
    compVencendo:  diasComp !== null && diasComp <= 10,
    diasOtDpa, diasOtBrf, diasComp,
  };
}

function passaFiltro(m) {
  const f = filtroPend.value;
  const p = pendencias(m);
  if (f === 'tudo')         return true;
  if (f === 'pendentes')    return p.semCnh || p.semCert;
  if (f === 'sem_cnh')      return p.semCnh;
  if (f === 'sem_cert')     return p.semCert;
  if (f === 'cnh_vencendo') return p.cnhVencendo;
  if (f === 'motorista_novo') return m.motorista_novo === 'sim';
  return true;
}

function showMsg(text, tipo = 'ok') {
  const el = painel.querySelector('.acoes');
  if (!el) return;
  document.querySelectorAll('.inline-msg').forEach(e => e.remove());
  const msg = document.createElement('span');
  msg.className = 'inline-msg';
  msg.style.cssText = `font-size:12px;font-weight:700;color:${tipo==='ok'?'#1ec8a0':'#e8a020'};margin-left:10px;`;
  msg.textContent = (tipo === 'ok' ? '✓ ' : '⚠ ') + text;
  el.appendChild(msg);
  setTimeout(() => msg.remove(), 3000);
}


// ── ALERTAS ───────────────────────────────────────────────────
function renderAlertasTela() {
  const el = document.getElementById('alertas-tela');
  if (!el) return;
  const limite    = parseInt(diasAlertaEl.value || 10);
  const filtroAtivo   = document.getElementById('filtro-alerta-tipo')?.value || 'tudo';
  const filtroViagens = document.getElementById('filtro-alerta-viagens')?.value || 'todos';

  function fmtDias(d) {
    if (d === null) return 'sem data';
    if (d < 0) return `vencida há ${Math.abs(d)}d`;
    if (d === 0) return 'vence hoje';
    return `vence em ${d}d`;
  }

  function pill(label, txt, tipo, categoria) {
    if (filtroAtivo !== 'tudo' && filtroAtivo !== categoria) return '';
    const cor    = tipo === 'danger' ? 'rgba(231,76,60' : tipo === 'warn' ? 'rgba(240,180,41' : 'rgba(127,147,171';
    const txtCor = tipo === 'danger' ? '#ff5252'        : tipo === 'warn' ? '#f0b429'         : '#7f93ab';
    return `<span class="alerta-pill" style="border-color:${cor},0.5);background:${cor},0.1);color:${txtCor}"><strong>${label}</strong> ${txt}</span>`;
  }

  const cards = [];
  let motoristasAlerta = todosMotoristas;
  if (filtroViagens === 'abaixo5') {
    motoristasAlerta = todosMotoristas.filter(m => {
      const v = parseInt(m.viagens_opentech ?? -1);
      return !isNaN(v) && v >= 0 && v < 5;
    });
  }
  motoristasAlerta.forEach(m => {
    const itens = [];
    const dCnh  = diasParaVencer(m.validade_cnh);
    const dDpa  = diasParaVencer(m.val_opentech_dpa);
    const dBrf  = diasParaVencer(m.val_opentech_brf);
    const dComp = diasParaVencer(m.val_comprovante);

    if (!m.doc_cnh || !m.doc_cnh.trim())
      itens.push(pill('CNH', 'sem documento', 'info', 'cnh'));
    else if (dCnh !== null && dCnh <= limite)
      itens.push(pill('CNH', fmtDias(dCnh), dCnh < 0 ? 'danger' : 'warn', 'cnh'));

    // Alerta viagens opentech
    if (viagensAlerta(m)) {
      const v = parseInt(m.viagens_opentech ?? 0);
      itens.push(pill('Viagens', v + ' viagem(ns)', 'danger', 'email'));
    }

    if (dDpa === null)
      itens.push(pill('Pesquisa DPA', 'sem data', 'info', 'opentech'));
    else if (dDpa <= limite)
      itens.push(pill('Pesquisa DPA', fmtDias(dDpa), dDpa < 0 ? 'danger' : 'warn', 'opentech'));

    if (dBrf === null)
      itens.push(pill('Pesquisa BRF', 'sem data', 'info', 'opentech'));
    else if (dBrf <= limite)
      itens.push(pill('Pesquisa BRF', fmtDias(dBrf), dBrf < 0 ? 'danger' : 'warn', 'opentech'));

    if (dComp === null)
      itens.push(pill('Comprovante', 'sem data', 'info', 'comprovante'));
    else if (dComp <= 10)
      itens.push(pill('Comprovante', fmtDias(dComp), dComp < 0 ? 'danger' : 'warn', 'comprovante'));

    if (!m.doc_tablet || !m.doc_tablet.trim())
      itens.push(pill('Certificado', 'sem documento', 'info', 'certificado'));

    const itensVisiveis = itens.filter(i => i !== '');
    if (itensVisiveis.length)
      cards.push(`<div class="alerta-card-mot"><span class="alerta-nome-mot">${m.nome||'(Sem nome)'}</span><div class="alerta-itens-mot">${itensVisiveis.join('')}</div></div>`);
  });

  if (!cards.length) {
    el.innerHTML = `<div class="alertas-vazio"><div style="font-size:48px;margin-bottom:12px">✅</div><p>Nenhuma pendência encontrada para o filtro selecionado.</p></div>`;
    return;
  }
  el.innerHTML = `
    <div class="alertas-header-mot">
      <h2>🔔 Alertas de Motoristas</h2>
      <span>CNH, pesquisas para carregamento, comprovante e documentos faltando</span>
    </div>
    <div class="alertas-grid">${cards.join('')}</div>`;
}

function renderAlertas() { /* alertas agora na aba dedicada */ }

// ── LISTA ─────────────────────────────────────────────────────
function renderLista() {
  const filtrados = todosMotoristas.filter(passaFiltro)
    .sort((a,b) => (a.nome||'').localeCompare(b.nome||''));

  lista.innerHTML = '';
  if (!filtrados.length) {
    lista.innerHTML = `<div class="item"><strong>Nenhum motorista</strong><small>Sem resultado com os filtros atuais.</small></div>`;
    return;
  }

  const limite = parseInt(diasAlertaEl.value || 30);

  filtrados.forEach(m => {
    const p = pendencias(m);
    const badges = [];
    if (viagensAlerta(m)) badges.push(`<span class="badge danger">✉ Viagens: ${m.viagens_opentech}</span>`);
    if (p.semCnh)  badges.push(`<span class="badge danger">Sem CNH</span>`);
    if (p.dias !== null) {
      if (p.dias < 0)         badges.push(`<span class="badge danger">CNH vencida</span>`);
      else if (p.cnhVencendo) badges.push(`<span class="badge warn">CNH: ${p.dias}d</span>`);
    }
    // Alertas Opentech na lista
    if (p.diasOtDpa !== null) {
      if (p.diasOtDpa < 0)            badges.push(`<span class="badge danger">OT DPA vencida</span>`);
      else if (p.otDpaVencendo)        badges.push(`<span class="badge warn">OT DPA: ${p.diasOtDpa}d</span>`);
    }
    if (p.diasOtBrf !== null) {
      if (p.diasOtBrf < 0)            badges.push(`<span class="badge danger">OT BRF vencida</span>`);
      else if (p.otBrfVencendo)        badges.push(`<span class="badge warn">OT BRF: ${p.diasOtBrf}d</span>`);
    }
    // Alerta comprovante na lista
    if (p.diasComp !== null) {
      if (p.diasComp < 0)             badges.push(`<span class="badge danger">Comp. vencido</span>`);
      else if (p.compVencendo)         badges.push(`<span class="badge warn">Comp.: ${p.diasComp}d</span>`);
    }
    if (m.motorista_novo === 'sim') badges.push(`<span class="badge warn">🆕 Novo</span>`);

    const div = document.createElement('div');
    div.className = 'item' + (m.id == selecionadoId ? ' ativo' : '');
    div.innerHTML = `<strong>${m.nome||'(Sem nome)'}</strong><small>CPF: ${m.cpf||'—'}</small>${badges.length?`<div class="badges">${badges.join('')}</div>`:''}`;
    div.onclick = () => { selecionadoId = m.id; renderLista(); renderPainel(m); };
    lista.appendChild(div);
  });
}

// ── PAINEL ────────────────────────────────────────────────────
function renderPainel(m) {
  painel.classList.remove('vazio');

  const cnhFormatada  = m.validade_cnh        ? m.validade_cnh.substring(0,10)        : '';
  const valOtDpa      = m.val_opentech_dpa    ? m.val_opentech_dpa.substring(0,10)    : '';
  const valOtBrf      = m.val_opentech_brf    ? m.val_opentech_brf.substring(0,10)    : '';
  const valComp       = m.val_comprovante     ? m.val_comprovante.substring(0,10)     : '';
  const ehNovo        = m.motorista_novo === 'sim';
  const cadastros     = parseCadastros(m.cadastros);
  const limite        = parseInt(diasAlertaEl.value || 30);

  const stOtDpa  = statusValidade(m.val_opentech_dpa, limite);
  const stOtBrf  = statusValidade(m.val_opentech_brf, limite);
  const viagensOt = m.viagens_opentech ?? '';
  const stViagens = (() => {
    const v = parseInt(viagensOt);
    if (viagensOt === '' || isNaN(v)) return { cls: 'is-empty', chip: '<span class="chip">Sem info</span>' };
    if (v < 5) return { cls: 'is-expired', chip: '<span class="chip">' + v + ' viagem(ns) ⚠</span>' };
    return { cls: 'is-ok', chip: '<span class="chip">' + v + ' viagens ✓</span>' };
  })();
  const stComp  = statusValidade(m.val_comprovante, 10);

  const secaoCadastros = ehNovo ? `
    <div class="secao" id="secao-cadastros">
      <h3>🆕 Cadastros Pendentes</h3>
      <p class="meta">Marque os sistemas onde o motorista já foi cadastrado.</p>
      <div class="cadastros-lista">
        ${CADASTROS.map(sys => {
          const status = cadastros[sys] || 'pendente';
          const isOk   = status === 'ok';
          return `
            <div class="cadastro-item ${isOk ? 'cad-ok' : 'cad-pend'}" id="cad-${sys}">
              <span class="cad-nome">${sys}</span>
              <button type="button" class="btn-cad ${isOk ? 'btn-cad-ok' : 'btn-cad-pend'}"
                onclick="toggleCadastro('${sys}')">
                ${isOk ? '✅ OK' : '⏳ PENDENTE'}
              </button>
            </div>`;
        }).join('')}
      </div>
    </div>` : '';

  painel.innerHTML = `
    <h2>${m.nome || 'Motorista'}</h2>
    <p class="sub">Cadastro e documentos</p>

    <div class="secao">
      <h3>Dados Pessoais</h3>
      <div class="grid2">
        <div><label>Nome</label><input id="f-nome" value="${m.nome||''}"></div>
        <div><label>CPF</label><input id="f-cpf" value="${m.cpf||''}"></div>
        <div><label>Validade CNH</label><input id="f-validadeCnh" type="date" value="${cnhFormatada}"></div>
        <div><label>Login Tablet</label><input id="f-loginSascar" value="${m.login_sascar||''}" placeholder="Usuário Tablet"></div>
        <div><label>Codigo Para carregamento Nestle</label><input id="f-gr" value="${m.gr||''}" placeholder="Ex: PL..."></div>
        <div><label>Curso Gerenciamento de Risco</label>
          <select id="f-cursoTablet">
            <option value="nao" ${m.curso_tablet==='nao'?'selected':''}>Não</option>
            <option value="sim" ${m.curso_tablet==='sim'?'selected':''}>Sim</option>
          </select>
        </div>
        <div><label>Motorista Novo?</label>
          <select id="f-motoristaNovo" onchange="toggleSecaoCadastros(this.value)">
            <option value="nao" ${!ehNovo?'selected':''}>Não</option>
            <option value="sim" ${ehNovo?'selected':''}>Sim — precisa de cadastros</option>
          </select>
        </div>
      </div>
    </div>

    <div class="secao">
      <h3>Documentos</h3>
      <div class="grid2" style="margin-bottom:0">

        <!-- CNH -->
        <div>
          <label>CNH</label>
          <div class="doc-upload-area" id="area-cnh">
            ${m.doc_cnh ? `
              <div class="doc-upload-preview">
                <a class="doc-btn-file" href="${urlDoc(m.doc_cnh)}" target="_blank" rel="noopener">
                  <span>${isPdfPath(m.doc_cnh) ? '📄' : '🖼️'}</span> Abrir CNH
                </a>
                <button class="btn-doc-remove" onclick="removerDocMot('cnh', ${m.id||'null'})">✕ Remover</button>
              </div>
            ` : `
              <div class="doc-upload-drop" onclick="document.getElementById('up-cnh').click()">
                <span id="up-cnh-txt">📎 Selecionar arquivo (PDF, JPG, PNG)</span>
              </div>
              <input type="file" id="up-cnh" accept=".pdf,.jpg,.jpeg,.png,.webp" style="display:none"
                onchange="previewDocMot('cnh')">
            `}
          </div>
        </div>

        <!-- Certificado Curso GR -->
        <div>
          <label>Certificado Curso GR</label>
          <div class="doc-upload-area" id="area-cert">
            ${m.doc_tablet ? `
              <div class="doc-upload-preview">
                <a class="doc-btn-file" href="${urlDoc(m.doc_tablet)}" target="_blank" rel="noopener">
                  <span>${isPdfPath(m.doc_tablet) ? '📄' : '🖼️'}</span> Abrir Certificado GR
                </a>
                <button class="btn-doc-remove" onclick="removerDocMot('cert', ${m.id||'null'})">✕ Remover</button>
              </div>
            ` : `
              <div class="doc-upload-drop" onclick="document.getElementById('up-cert').click()">
                <span id="up-cert-txt">📎 Selecionar arquivo (PDF, JPG, PNG)</span>
              </div>
              <input type="file" id="up-cert" accept=".pdf,.jpg,.jpeg,.png,.webp" style="display:none"
                onchange="previewDocMot('cert')">
            `}
          </div>
        </div>

      </div>
    </div>

    <div class="secao">
      <h3>Comprovante de Endereço</h3>
      <div class="grid2">
        <div>
          <label>Validade do Comprovante</label>
          <div class="field ${stComp.cls}" style="padding:6px 10px;">
            <input id="f-valComprovante" type="date" value="${valComp}" style="border:none;background:transparent;padding:0;">
            ${stComp.chip}
          </div>
        </div>
      </div>
    </div>

    <div class="secao">
      <h3>Pesquisas para Carregamento</h3>
      <div class="grid2">
        <div>
          <label>Validade Pesquisa DPA/Lactalis</label>
          <div class="field ${stOtDpa.cls}" style="padding:6px 10px;">
            <input id="f-valOtDpa" type="date" value="${valOtDpa}" style="border:none;background:transparent;padding:0;">
            ${stOtDpa.chip}
          </div>
        </div>
        <div>
          <label>Validade Pesquisa BRF</label>
          <div class="field ${stOtBrf.cls}" style="padding:6px 10px;">
            <input id="f-valOtBrf" type="date" value="${valOtBrf}" style="border:none;background:transparent;padding:0;">
            ${stOtBrf.chip}
          </div>
        </div>
        <div>
          <label>Nº de Viagens realizadas</label>
          <div class="field ${stViagens.cls}" style="padding:6px 10px;display:flex;align-items:center;gap:10px;">
            <input id="f-viagensOpentech" type="number" min="0" value="${viagensOt}" placeholder="Ex: 3"
              style="border:none;background:transparent;padding:0;width:70px;font-size:14px;color:var(--text);">
            ${stViagens.chip}
          </div>
        </div>
      </div>
    </div>

    ${secaoCadastros}

    <div class="acoes">
      <button class="btn" id="btnSalvar">Salvar</button>
      <button class="btn btnDanger" id="btnExcluir">Excluir</button>
    </div>
  `;

  // Garantir campos hidden com valores atuais dos docs
  // Isso preserva os docs ao salvar sem novo upload
  setTimeout(function() {
    if (!document.getElementById('f-docCnh-hidden')) {
      const h1 = document.createElement('input');
      h1.type = 'hidden'; h1.id = 'f-docCnh-hidden';
      h1.value = m.doc_cnh || '';
      painel.appendChild(h1);
    } else {
      document.getElementById('f-docCnh-hidden').value = m.doc_cnh || '';
    }
    if (!document.getElementById('f-docTablet-hidden')) {
      const h2 = document.createElement('input');
      h2.type = 'hidden'; h2.id = 'f-docTablet-hidden';
      h2.value = m.doc_tablet || '';
      painel.appendChild(h2);
    } else {
      document.getElementById('f-docTablet-hidden').value = m.doc_tablet || '';
    }
  }, 0);

  const getPayload = () => ({
    nome:           document.getElementById('f-nome').value.trim(),
    cpf:            document.getElementById('f-cpf').value.trim(),
    telefone:       '',
    validadeCnh:    document.getElementById('f-validadeCnh').value,
    loginSascar:    document.getElementById('f-loginSascar').value.trim(),
    gr:             document.getElementById('f-gr').value.trim(),
    cursoTablet:    document.getElementById('f-cursoTablet').value,
    docCnh:         (window._pendingDocMot?.cnh)  ? window._pendingDocMot.cnh  : (document.getElementById('f-docCnh-hidden')?.value  || ''),
    docTablet:      (window._pendingDocMot?.cert) ? window._pendingDocMot.cert : (document.getElementById('f-docTablet-hidden')?.value || ''),
    valOtDpa:       document.getElementById('f-valOtDpa').value,
    viagensOpentech: document.getElementById('f-viagensOpentech')?.value ?? '',
    valOtBrf:       document.getElementById('f-valOtBrf').value,
    docComprovante: '',
    valComprovante: document.getElementById('f-valComprovante').value,
    motoristaNovo:  document.getElementById('f-motoristaNovo').value,
    cadastros:      getCadastrosAtual(),
  });

  document.getElementById('btnSalvar').onclick = async () => {
    const isNovo = !m.id;
    // Inicializa preservando docs existentes
    window._pendingDocMot = {
      cnh:  '',  // será preenchido após upload
      cert: '',  // será preenchido após upload
    };
    const _docCnhAtual  = document.getElementById('f-docCnh-hidden')?.value  || '';
    const _docCertAtual = document.getElementById('f-docTablet-hidden')?.value || '';

    // Se é motorista novo: primeiro cria sem os docs, depois faz upload, depois atualiza
    if (isNovo) {
      const res = await GR_API.criar('motoristas', getPayload());
      if (res?.erro) { showMsg(res.erro, 'warn'); return; }
      const novoId = res.id;
      selecionadoId = novoId;

      // Upload dos docs se houver
      const cnh  = await uploadDocMot('cnh',  novoId);
      const cert = await uploadDocMot('cert', novoId);
      if (cnh || cert) {
        window._pendingDocMot = { cnh: cnh||'', cert: cert||'' }; // novo: não há doc anterior
        await GR_API.atualizar('motoristas', novoId, getPayload());
      }
    } else {
      // Upload primeiro, depois salva com os caminhos novos
      const cnh  = await uploadDocMot('cnh',  m.id);
      const cert = await uploadDocMot('cert', m.id);
      // Se não houve novo upload, mantém o doc existente
      window._pendingDocMot = { cnh: cnh||_docCnhAtual, cert: cert||_docCertAtual };
      const res = await GR_API.atualizar('motoristas', m.id, getPayload());
      if (res?.erro) { showMsg(res.erro, 'warn'); return; }
    }

    showMsg('Salvo com sucesso!');
    await carregarMotoristas();
    const atualizado = todosMotoristas.find(x => x.id == (m.id || selecionadoId));
    if (atualizado) renderPainel(atualizado);
  };

  document.getElementById('btnExcluir').onclick = async () => {
    if (!m.id || !confirm('Excluir este motorista?')) return;
    await GR_API.excluir('motoristas', m.id);
    selecionadoId = null;
    await carregarMotoristas();
    painel.classList.add('vazio');
    painel.innerHTML = 'Selecione um motorista ou clique em <b>Novo motorista</b>.';
  };
}

// ── CADASTROS (toggle OK/Pendente) ───────────────────────────
function getCadastrosAtual() {
  const result = {};
  CADASTROS.forEach(sys => {
    const btn = document.querySelector(`#cad-${sys} .btn-cad`);
    if (btn) result[sys] = btn.classList.contains('btn-cad-ok') ? 'ok' : 'pendente';
  });
  return result;
}

function toggleCadastro(sys) {
  const item = document.getElementById(`cad-${sys}`);
  const btn  = item?.querySelector('.btn-cad');
  if (!btn) return;
  const isOk = btn.classList.contains('btn-cad-ok');
  btn.classList.toggle('btn-cad-ok',  !isOk);
  btn.classList.toggle('btn-cad-pend', isOk);
  item.classList.toggle('cad-ok',   !isOk);
  item.classList.toggle('cad-pend',  isOk);
  btn.textContent = isOk ? '⏳ PENDENTE' : '✅ OK';
}

function toggleSecaoCadastros(val) {
  const secao = document.getElementById('secao-cadastros');
  if (val === 'sim' && !secao) {
    const acoes = painel.querySelector('.acoes');
    const div   = document.createElement('div');
    div.className = 'secao';
    div.id = 'secao-cadastros';
    div.innerHTML = `
      <h3>🆕 Cadastros Pendentes</h3>
      <p class="meta">Marque os sistemas onde o motorista já foi cadastrado.</p>
      <div class="cadastros-lista">
        ${CADASTROS.map(sys => `
          <div class="cadastro-item cad-pend" id="cad-${sys}">
            <span class="cad-nome">${sys}</span>
            <button type="button" class="btn-cad btn-cad-pend" onclick="toggleCadastro('${sys}')">⏳ PENDENTE</button>
          </div>`).join('')}
      </div>`;
    painel.insertBefore(div, acoes);
  } else if (val === 'nao' && secao) {
    secao.remove();
  }
}

// ── CARREGAR ──────────────────────────────────────────────────
async function carregarMotoristas(q = '') {
  lista.innerHTML = '<div class="item"><small>Carregando...</small></div>';
  const data = await GR_API.listar('motoristas', q);
  todosMotoristas = Array.isArray(data) ? data : [];
  renderAlertas();
  renderLista();
}

// ── EVENTOS ───────────────────────────────────────────────────
busca.addEventListener('input', () => {
  clearTimeout(buscaTimer);
  buscaTimer = setTimeout(() => carregarMotoristas(busca.value), 350);
});
filtroPend.addEventListener('change',  () => renderLista());
document.getElementById('filtro-alerta-tipo')?.addEventListener('change', () => renderAlertasTela());
document.getElementById('filtro-alerta-viagens')?.addEventListener('change', () => renderAlertasTela());
diasAlertaEl.addEventListener('input', () => { renderAlertas(); renderLista(); });
btnNovo.addEventListener('click', () => { selecionadoId = null; renderPainel({}); });

// ── INIT ─────────────────────────────────────────────────────
carregarMotoristas();


// ── UPLOAD DE DOCUMENTOS DO MOTORISTA ────────────────────────
const API_MOT_UPLOAD = '../api/motoristas_upload.php';
window._pendingDocMot = { cnh: '', cert: '' };

function isPdfPath(p) {
  return (p||'').toLowerCase().endsWith('.pdf');
}
function urlDoc(p) {
  if (!p) return '#';
  // Caminho legado (docs/xxx.pdf) → relativo; novo (mot_xxx) → absoluto
  return p.startsWith('mot_') ? '/uploads/motoristas/' + p : p;
}

function previewDocMot(tipo) {
  const inputId = tipo === 'cnh' ? 'up-cnh' : 'up-cert';
  const txtId   = inputId + '-txt';
  const input   = document.getElementById(inputId);
  if (!input || !input.files[0]) return;
  const nome = input.files[0].name;
  const txtEl = document.getElementById(txtId);
  if (txtEl) txtEl.textContent = '✅ ' + nome;
}

async function uploadDocMot(tipo, motId) {
  const inputId = tipo === 'cnh' ? 'up-cnh' : 'up-cert';
  const input   = document.getElementById(inputId);
  if (!input || !input.files[0]) return null;

  const fd = new FormData();
  fd.append('arquivo', input.files[0]);
  fd.append('tipo', tipo);
  fd.append('mot_id', motId);

  const token = localStorage.getItem('gr_token') || '';
  const res = await fetch(API_MOT_UPLOAD + '?token=' + encodeURIComponent(token), {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: fd,
  }).then(r => r.json());

  if (res.erro) { showMsg(res.erro, 'warn'); return null; }
  return res.arquivo; // nome do arquivo salvo
}

async function removerDocMot(tipo, motId) {
  if (!motId) { showMsg('Salve o motorista antes de remover documentos.', 'warn'); return; }
  const campo = tipo === 'cnh' ? 'docCnh' : 'docTablet';
  const label = tipo === 'cnh' ? 'a CNH' : 'o certificado';
  if (!confirm('Remover ' + label + ' deste motorista?')) return;

  const token = localStorage.getItem('gr_token') || '';
  const res = await fetch(API_MOT_UPLOAD + '?acao=remover&tipo=' + tipo + '&mot_id=' + motId + '&token=' + encodeURIComponent(token), {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token },
  }).then(r => r.json());

  if (res.erro) { showMsg(res.erro, 'warn'); return; }
  showMsg('Documento removido.');
  await carregarMotoristas();
  const m = todosMotoristas.find(x => x.id == motId);
  if (m) renderPainel(m);
}

// Interceptar o btnSalvar para fazer upload antes de salvar
const _origCarregar = carregarMotoristas;
async function salvarComUpload(motId, isNovo) {
  // Faz upload dos arquivos pendentes e obtém os caminhos
  const cnh  = await uploadDocMot('cnh',  motId);
  const cert = await uploadDocMot('cert', motId);

  // Injeta os valores para o getPayload pegar
  window._pendingDocMot = {
    cnh:  cnh  || '',
    cert: cert || '',
  };
  return { cnh, cert };
}
