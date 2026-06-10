<?php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/conexao.php';
headers();

$user   = exigirAuth();
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

if ($method === 'GET') {
    if ($id) {
        $stmt = $pdo->prepare('SELECT * FROM motoristas WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        echo json_encode($row ?: ['erro' => 'Não encontrado.']);
    } else {
        $busca = '%' . trim($_GET['q'] ?? '') . '%';
        $stmt  = $pdo->prepare(
            'SELECT * FROM motoristas
             WHERE nome LIKE ? OR cpf LIKE ? OR telefone LIKE ?
             ORDER BY nome ASC'
        );
        $stmt->execute([$busca, $busca, $busca]);
        echo json_encode($stmt->fetchAll());
    }
    exit;
}

if ($method === 'POST') {
    $d = body();
    $stmt = $pdo->prepare(
        'INSERT INTO motoristas
         (nome, cpf, telefone, validade_cnh, login_sascar, gr, curso_tablet,
          doc_cnh, doc_tablet,
          val_opentech_dpa, val_opentech_brf, viagens_opentech,
          doc_comprovante, val_comprovante,
          motorista_novo, cadastros)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    );
    $stmt->execute([
        $d['nome']           ?? '',
        $d['cpf']            ?? '',
        $d['telefone']       ?? '',
        $d['validadeCnh']    ?: null,
        $d['loginSascar']    ?? '',
        $d['gr']             ?? '',
        $d['cursoTablet']    ?? 'nao',
        $d['docCnh']         ?? '',
        $d['docTablet']      ?? '',
        $d['valOtDpa']       ?: null,
        $d['valOtBrf']       ?: null,
        isset($d['viagensOpentech']) ? (int)$d['viagensOpentech'] : null,
        $d['docComprovante'] ?? '',
        $d['valComprovante'] ?: null,
        $d['motoristaNovo']  ?? 'nao',
        isset($d['cadastros']) ? json_encode($d['cadastros']) : null,
    ]);
    echo json_encode(['id' => $pdo->lastInsertId(), 'status' => 'criado']);
    exit;
}

if ($method === 'PUT' && $id) {
    $d = body();
    $stmt = $pdo->prepare(
        'UPDATE motoristas SET
         nome=?, cpf=?, telefone=?, validade_cnh=?,
         login_sascar=?, gr=?, curso_tablet=?,
         doc_cnh=?, doc_tablet=?,
         val_opentech_dpa=?, val_opentech_brf=?,
         viagens_opentech=?,
         doc_comprovante=?, val_comprovante=?,
         motorista_novo=?, cadastros=?,
         atualizado_em=NOW()
         WHERE id=?'
    );
    $stmt->execute([
        $d['nome']           ?? '',
        $d['cpf']            ?? '',
        $d['telefone']       ?? '',
        $d['validadeCnh']    ?: null,
        $d['loginSascar']    ?? '',
        $d['gr']             ?? '',
        $d['cursoTablet']    ?? 'nao',
        $d['docCnh']         ?? '',
        $d['docTablet']      ?? '',
        $d['valOtDpa']       ?: null,
        $d['valOtBrf']       ?: null,
        isset($d['viagensOpentech']) ? (int)$d['viagensOpentech'] : null,
        $d['docComprovante'] ?? '',
        $d['valComprovante'] ?: null,
        $d['motoristaNovo']  ?? 'nao',
        isset($d['cadastros']) ? json_encode($d['cadastros']) : null,
        $id,
    ]);
    echo json_encode(['status' => 'atualizado']);
    exit;
}

if ($method === 'DELETE' && $id) {
    $pdo->prepare('DELETE FROM motoristas WHERE id=?')->execute([$id]);
    echo json_encode(['status' => 'excluído']);
    exit;
}

http_response_code(405);
echo json_encode(['erro' => 'Método não permitido.']);
