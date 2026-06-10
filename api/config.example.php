<?php
// ============================================================
// CONFIGURAÇÃO DO SISTEMA — ARQUIVO DE EXEMPLO
// Copie este arquivo para config.php e preencha com seus dados
// NUNCA commite o config.php com credenciais reais
// ============================================================

define('DB_HOST',    'localhost');
define('DB_NAME',    'sistema_motoristas');   // nome do seu banco
define('DB_USER',    'root');                 // usuário do MySQL
define('DB_PASS',    '');                     // senha do MySQL
define('DB_CHARSET', 'utf8mb4');

define('SECRET_KEY',  'troque-por-uma-chave-secreta-forte-aqui');
define('SESSION_TTL', 28800); // 8 horas em segundos

define('ALLOWED_ORIGIN', 'http://localhost');
