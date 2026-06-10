<?php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/conexao.php';
headers();

$ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$ip = explode(',', $ip)[0];

// ── LIMITE DE TENTATIVAS ──────────────────────────────────────
// Máximo 5 tentativas em 10 minutos por IP
$janela   = 600; // 10 minutos em segundos
$maxTent  = 5;
$agora    = time();
$chaveIP  = 'login_attempts_' . md5($ip);

// Buscar tentativas no banco
$stmt = $pdo->prepare(
    'SELECT tentativas, primeira_tentativa FROM login_tentativas WHERE chave = ? LIMIT 1'
);
$stmt->execute([$chaveIP]);
$registro = $stmt->fetch();

if ($registro) {
    $dentroJanela = ($agora - $registro['primeira_tentativa']) < $janela;
    if ($dentroJanela && $registro['tentativas'] >= $maxTent) {
        $restante = $janela - ($agora - $registro['primeira_tentativa']);
        $minutos  = ceil($restante / 60);
        http_response_code(429);
        echo json_encode([
            'erro'    => "Muitas tentativas. Aguarde {$minutos} minuto(s) e tente novamente.",
            'bloqueado' => true,
        ]);
        exit;
    }
    // Resetar janela se já passou o tempo
    if (!$dentroJanela) {
        $pdo->prepare('DELETE FROM login_tentativas WHERE chave = ?')->execute([$chaveIP]);
        $registro = null;
    }
}

// ── AUTENTICAÇÃO ─────────────────────────────────────────────
$body    = body();
$usuario = trim($body['usuario'] ?? '');
$senha   = trim($body['senha']   ?? '');

if (!$usuario || !$senha) {
    http_response_code(400);
    echo json_encode(['erro' => 'Usuário e senha são obrigatórios.']);
    exit;
}

$stmt = $pdo->prepare('SELECT id, nome, senha_hash, tipo FROM usuarios WHERE nome = ? LIMIT 1');
$stmt->execute([$usuario]);
$user = $stmt->fetch();

if (!$user || !password_verify($senha, $user['senha_hash'])) {
    // Registrar tentativa falha
    if ($registro) {
        $pdo->prepare('UPDATE login_tentativas SET tentativas = tentativas + 1 WHERE chave = ?')
            ->execute([$chaveIP]);
    } else {
        $pdo->prepare('INSERT INTO login_tentativas (chave, tentativas, primeira_tentativa) VALUES (?,1,?)')
            ->execute([$chaveIP, $agora]);
    }

    // Calcular tentativas restantes
    $stmt2 = $pdo->prepare('SELECT tentativas FROM login_tentativas WHERE chave = ?');
    $stmt2->execute([$chaveIP]);
    $atual    = $stmt2->fetchColumn();
    $restantes = max(0, $maxTent - $atual);

    http_response_code(401);
    echo json_encode([
        'erro'      => 'Usuário ou senha incorretos.',
        'restantes' => $restantes,
    ]);
    exit;
}

// ── LOGIN OK — limpar tentativas e gerar token ────────────────
$pdo->prepare('DELETE FROM login_tentativas WHERE chave = ?')->execute([$chaveIP]);

// Registrar acesso no log
$pdo->prepare(
    'INSERT INTO login_log (usuario_id, ip, acessado_em) VALUES (?,?,NOW())'
)->execute([$user['id'], $ip]);

$token = gerarToken($user['id'], $user['nome'], $user['tipo']);
echo json_encode([
    'status'  => 'ok',
    'token'   => $token,
    'usuario' => $user['nome'],
    'tipo'    => $user['tipo'],
]);
