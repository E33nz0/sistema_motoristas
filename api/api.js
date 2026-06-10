// api.js — cliente compartilhado do Sistema GR
// Segurança: token enviado APENAS via header Authorization:Bearer (nunca na URL)
const GR_API = (() => {

  function token() {
    return localStorage.getItem('gr_token') || '';
  }

  // Decodifica o payload do JWT sem validar assinatura (feito no servidor)
  function decodePayload(tk) {
    try {
      const payload = tk.split('.')[0];
      var b64 = payload.replace(/-/g,'+').replace(/_/g,'/');
      while(b64.length%4)b64+='=';
      return JSON.parse(atob(b64));
    } catch { return null; }
  }

  // Verifica se o token existe e não está expirado
  function tokenValido() {
    const tk = token();
    if (!tk) return false;
    const data = decodePayload(tk);
    if (!data || !data.exp) return false;
    return data.exp > Math.floor(Date.now() / 1000);
  }

  function redirectLogin() {
    localStorage.removeItem('gr_token');
    localStorage.removeItem('gr_usuario');
    localStorage.removeItem('gr_tipo');
    const login = window.location.pathname.startsWith('/api') ? '../login.html' : '../login.html';
    window.location.href = login;
  }

  function baseUrl() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length >= 1) return '../api';
    return 'api';
  }

  // SEGURANÇA: token NÃO vai mais na URL — apenas no header Authorization
  function buildUrl(endpoint, params = {}) {
    const p = new URLSearchParams(params);
    const qs = p.toString();
    return `${baseUrl()}/${endpoint}.php${qs ? '?' + qs : ''}`;
  }

  function headers(extra = {}) {
    return {
      'Authorization': 'Bearer ' + token(),
      'Content-Type': 'application/json',
      ...extra
    };
  }

  function checkAuth(res) {
    if (res.status === 401) {
      redirectLogin();
      return false;
    }
    return true;
  }

  async function req(endpoint, method = 'GET', body = null, params = {}) {
    // Verificar expiração antes de cada requisição
    if (!tokenValido()) { redirectLogin(); return null; }
    const url = buildUrl(endpoint, params);
    const opts = { method, headers: headers() };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!checkAuth(res)) return null;
    return res.json();
  }

  return {
    listar:     (ep, q = '')    => req(ep, 'GET', null, q ? { q } : {}),
    buscar:     (ep, id)        => req(ep, 'GET', null, { id }),
    criar:      (ep, dados)     => req(ep, 'POST', dados),
    atualizar:  (ep, id, dados) => req(ep, 'PUT', dados, { id }),
    excluir:    (ep, id)        => req(ep, 'DELETE', null, { id }),
    req,
    tokenValido,
    decodePayload,
    // Guard para usar no início de cada módulo
    verificarAuth() {
      if (!tokenValido()) redirectLogin();
    }
  };
})();
