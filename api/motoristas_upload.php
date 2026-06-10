<?php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/conexao.php';
headers();
exigirAuth();

$method = $_SERVER['REQUEST_METHOD'];
$acao   = $_GET['acao'] ?? '';
$tipo   = $_GET['tipo'] ?? ($_POST['tipo'] ?? '');
$mot_id = isset($_GET['mot_id'])  ? (int)$_GET['mot_id']  :
          (isset($_POST['mot_id']) ? (int)$_POST['mot_id'] : 0);

// ── UPLOAD DIR ────────────────────────────────────────────────
$_docRoot = rtrim($_SERVER['DOCUMENT_ROOT'], '/');
$_proto   = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$_host    = $_SERVER['HTTP_HOST'];
define('MOT_UPLOAD_DIR', $_docRoot . '/uploads/motoristas/');
define('MOT_UPLOAD_URL', $_proto . '://' . $_host . '/uploads/motoristas/');

if (!is_dir(MOT_UPLOAD_DIR)) mkdir(MOT_UPLOAD_DIR, 0755, true);

const TIPOS_VALIDOS = ['cnh', 'cert'];
const MIME_MOT = [
    'pdf'  => ['application/pdf'],
    'jpg'  => ['image/jpeg'], 'jpeg' => ['image/jpeg'],
    'png'  => ['image/png'],
    'webp' => ['image/webp'],
];
const CAMPOS_DB = ['cnh' => 'doc_cnh', 'cert' => 'doc_tablet'];

// ── POST: upload ──────────────────────────────────────────────
if ($method === 'POST') {
    if (!$mot_id) { http_response_code(400); echo json_encode(['erro' => 'mot_id obrigatório.']); exit; }
    if (!in_array($tipo, TIPOS_VALIDOS, true)) { http_response_code(400); echo json_encode(['erro' => 'Tipo inválido.']); exit; }
    if (empty($_FILES['arquivo']) || $_FILES['arquivo']['error'] !== UPLOAD_ERR_OK) {
        // Sem arquivo — não é erro, apenas retorna sem fazer nada
        echo json_encode(['arquivo' => null, 'status' => 'sem_arquivo']); exit;
    }

    $file = $_FILES['arquivo'];
    if ($file['size'] > 30 * 1024 * 1024) { http_response_code(400); echo json_encode(['erro' => 'Máximo 30MB.']); exit; }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!array_key_exists($ext, MIME_MOT)) { http_response_code(400); echo json_encode(['erro' => 'Tipo não permitido.']); exit; }

    $finfo    = new finfo(FILEINFO_MIME_TYPE);
    $mimeReal = $finfo->file($file['tmp_name']);
    if (!in_array($mimeReal, MIME_MOT[$ext], true)) { http_response_code(400); echo json_encode(['erro' => 'Arquivo inválido.']); exit; }

    // Apagar arquivo antigo se existir
    $stmt = $pdo->prepare('SELECT ' . CAMPOS_DB[$tipo] . ' FROM motoristas WHERE id=?');
    $stmt->execute([$mot_id]);
    $row = $stmt->fetch();
    if ($row) {
        $arqAntigo = $row[CAMPOS_DB[$tipo]] ?? '';
        if ($arqAntigo && str_starts_with($arqAntigo, 'mot_')) {
            $c = realpath(MOT_UPLOAD_DIR . $arqAntigo);
            if ($c && str_starts_with($c, realpath(MOT_UPLOAD_DIR))) @unlink($c);
        }
    }

    $nome = 'mot_' . $mot_id . '_' . $tipo . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
    if (!move_uploaded_file($file['tmp_name'], MOT_UPLOAD_DIR . $nome)) {
        http_response_code(500); echo json_encode(['erro' => 'Falha ao salvar arquivo.']); exit;
    }

    // Atualizar campo no banco
    $pdo->prepare('UPDATE motoristas SET ' . CAMPOS_DB[$tipo] . '=? WHERE id=?')->execute([$nome, $mot_id]);

    echo json_encode(['arquivo' => $nome, 'url' => MOT_UPLOAD_URL . $nome, 'status' => 'salvo']);
    exit;
}

// ── DELETE: remover ───────────────────────────────────────────
if ($method === 'DELETE') {
    if (!$mot_id || !in_array($tipo, TIPOS_VALIDOS, true)) {
        http_response_code(400); echo json_encode(['erro' => 'Parâmetros inválidos.']); exit;
    }

    $stmt = $pdo->prepare('SELECT ' . CAMPOS_DB[$tipo] . ' FROM motoristas WHERE id=?');
    $stmt->execute([$mot_id]);
    $row = $stmt->fetch();
    if ($row) {
        $arq = $row[CAMPOS_DB[$tipo]] ?? '';
        if ($arq && str_starts_with($arq, 'mot_')) {
            $c = realpath(MOT_UPLOAD_DIR . $arq);
            if ($c && str_starts_with($c, realpath(MOT_UPLOAD_DIR))) @unlink($c);
        }
        $pdo->prepare('UPDATE motoristas SET ' . CAMPOS_DB[$tipo] . '=? WHERE id=?')->execute(['', $mot_id]);
        echo json_encode(['status' => 'removido']);
    } else {
        http_response_code(404); echo json_encode(['erro' => 'Motorista não encontrado.']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['erro' => 'Método não permitido.']);
