-- ============================================================
-- Sistema de Gestão de Motoristas
-- Script de criação do banco de dados
-- ============================================================

CREATE DATABASE IF NOT EXISTS sistema_motoristas
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE sistema_motoristas;

-- ── TABELA DE USUÁRIOS DO SISTEMA ────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome        VARCHAR(60)  NOT NULL UNIQUE,
    senha_hash  VARCHAR(255) NOT NULL,
    tipo        ENUM('admin','operador') NOT NULL DEFAULT 'operador',
    criado_em   DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── TABELA DE MOTORISTAS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS motoristas (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome                VARCHAR(120) NOT NULL,
    cpf                 VARCHAR(14),
    telefone            VARCHAR(20),
    validade_cnh        DATE,
    login_sascar        VARCHAR(80),
    gr                  VARCHAR(80),
    curso_tablet        ENUM('sim','nao') NOT NULL DEFAULT 'nao',
    doc_cnh             VARCHAR(255),
    doc_tablet          VARCHAR(255),
    val_opentech_dpa    DATE,
    val_opentech_brf    DATE,
    viagens_opentech    INT UNSIGNED,
    doc_comprovante     VARCHAR(255),
    val_comprovante     DATE,
    motorista_novo      ENUM('sim','nao') NOT NULL DEFAULT 'nao',
    cadastros           JSON,
    criado_em           DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nome (nome),
    INDEX idx_cpf  (cpf)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── TABELA DE CONTROLE DE TENTATIVAS DE LOGIN ────────────────
CREATE TABLE IF NOT EXISTS login_tentativas (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    chave               VARCHAR(64) NOT NULL UNIQUE,
    tentativas          INT NOT NULL DEFAULT 1,
    primeira_tentativa  INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── TABELA DE LOG DE ACESSO ──────────────────────────────────
CREATE TABLE IF NOT EXISTS login_log (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id  INT UNSIGNED NOT NULL,
    ip          VARCHAR(45),
    acessado_em DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DADOS INICIAIS
-- ============================================================

-- Usuário admin — senha: admin123
-- Hash gerado com password_hash('admin123', PASSWORD_DEFAULT)
INSERT INTO usuarios (nome, senha_hash, tipo) VALUES
('admin',    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('operador', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'operador');

-- ATENÇÃO: o hash acima é de 'password' (padrão Laravel/PHP)
-- Para gerar o hash correto de 'admin123', execute:
-- php -r "echo password_hash('admin123', PASSWORD_DEFAULT);"
-- e substitua o valor acima

-- ============================================================
-- MOTORISTAS FICTÍCIOS PARA TESTE
-- Todos os dados abaixo são FALSOS — apenas para demonstração
-- ============================================================

INSERT INTO motoristas (nome, cpf, telefone, validade_cnh, login_sascar, gr, curso_tablet, motorista_novo) VALUES
('Carlos Eduardo Lima',    '111.222.333-44', '(51) 99111-0001', '2026-03-15', 'carloslima',   'PL001', 'sim', 'nao'),
('Marcos Antonio Silva',   '222.333.444-55', '(51) 99222-0002', '2025-08-20', 'marcossilva',  'PL002', 'sim', 'nao'),
('José Roberto Ferreira',  '333.444.555-66', '(54) 99333-0003', '2025-06-10', 'joseroberto',  'PL003', 'nao', 'nao'),
('Anderson Luis Souza',    '444.555.666-77', '(51) 99444-0004', '2026-11-05', 'andersonls',   'PL004', 'sim', 'nao'),
('Paulo Henrique Costa',   '555.666.777-88', '(54) 99555-0005', '2024-12-01', 'paulocosta',   'PL005', 'nao', 'nao'),
('Rafael Oliveira Nunes',  '666.777.888-99', '(51) 99666-0006', '2026-07-22', 'rafaeloliveira','PL006', 'sim', 'sim'),
('Leandro Alves Pereira',  '777.888.999-00', '(54) 99777-0007', '2025-09-30', 'leandroapv',   'PL007', 'sim', 'nao'),
('Diego Campos Ribeiro',   '888.999.000-11', '(51) 99888-0008', '2027-01-14', 'diegocampos',  'PL008', 'nao', 'nao'),
('Thiago Martins Borges',  '999.000.111-22', '(54) 99999-0009', '2025-07-03', 'thiagomartins','PL009', 'sim', 'nao'),
('Fabio Rodrigues Santos', '000.111.222-33', '(51) 99000-0010', '2026-04-18', 'fabiords',     'PL010', 'sim', 'sim');
