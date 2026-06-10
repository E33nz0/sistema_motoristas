<?php
require_once __DIR__ . '/config.php';

function gerarToken(int $userId, string $nome, string $tipo): string {
    $payload = base64_encode(json_encode([
        'uid'  => $userId,
        'nome' => $nome,
        'tipo' => $tipo,
        'exp'  => time() + SESSION_TTL,
        'iat'  => time(),
    ]));
    $sig = hash_hmac('sha256', $payload, SECRET_KEY);
    return $payload . '.' . $sig;
}

function validarToken(string $token): ?array {
    if (!$token) return null;
    $parts = explode('.', $token);
    if (count($parts) !== 2) return null;
    [$payload, $sig] = $parts;
    $sigEsperada = hash_hmac('sha256', $payload, SECRET_KEY);
    if (!hash_equals($sigEsperada, $sig)) return null;
    $data = json_decode(base64_decode($payload), true);
    if (!$data || $data['exp'] < time()) return null;
    return $data;
}

function getTokenFromRequest(): string {
    // 1. Header Authorization: Bearer xxx (preferido)
    $header = $_SERVER['HTTP_AUTHORIZATION']
           ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
           ?? '';
    if (empty($header) && function_exists('apache_request_headers')) {
        $h = apache_request_headers();
        $header = $h['Authorization'] ?? $h['authorization'] ?? '';
    }
    if (str_starts_with($header, 'Bearer ')) {
        return substr($header, 7);
    }

    // SEGURANÇA: token aceito APENAS via header Authorization:Bearer
    // Fallback via ?token= removido — evita vazamento em logs de servidor

    return '';
}

function exigirAuth(): array {
    $token = getTokenFromRequest();
    $user  = validarToken($token);
    if (!$user) {
        http_response_code(401);
        die(json_encode(['erro' => 'Não autenticado.']));
    }
    return $user;
}

function headers(): void {
    // ── CORS restrito ao domínio do sistema ──────────────────
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === ALLOWED_ORIGIN) {
        header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
    }
    // Nunca mais Access-Control-Allow-Origin: *
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
}

function body(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}
