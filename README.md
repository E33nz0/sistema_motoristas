# Sistema de Gestão de Motoristas

Projeto desenvolvido para a disciplina de **Linguagem de Programação IV** — IFRS Campus Ibirubá.

## Sobre

Aplicação web para gerenciamento de cadastros de motoristas, incluindo controle de documentos, validades de CNH e alertas automáticos de pendências.

## Tecnologias utilizadas

- **PHP** — backend e API REST
- **MySQL** — banco de dados
- **JavaScript** — interação e consumo da API no frontend
- **Bootstrap 5** — layout responsivo
- **CSS** — estilização customizada

## Funcionalidades

- Cadastro, edição e exclusão de motoristas (CRUD completo)
- Busca em tempo real por nome ou CPF
- Filtros por tipo de pendência
- Alertas automáticos de CNH vencendo ou vencida
- Upload de documentos (CNH e Certificado)
- Autenticação com token JWT
- API REST com respostas em JSON

## Estrutura do projeto (padrão MVC)

```
/
├── api/                  ← Controllers + Models (PHP)
│   ├── config.php        ← Configurações (não commitado — use .env)
│   ├── conexao.php       ← Conexão PDO com o banco
│   ├── auth.php          ← Autenticação JWT
│   ├── login.php         ← Endpoint de login
│   ├── motoristas.php    ← CRUD de motoristas
│   ├── motoristas_upload.php ← Upload de documentos
│   └── banco.sql         ← Script de criação do banco
├── motoristas/           ← View do módulo de motoristas
│   ├── index.html
│   ├── motoristas.js
│   └── style.css
├── uploads/              ← Arquivos enviados pelos usuários
├── login.html            ← Tela de login
└── index.html            ← Menu principal
```

## Como rodar localmente (XAMPP)

1. Clone o repositório dentro de `xampp/htdocs/`:
```bash
git clone https://github.com/seu-usuario/sistema-motoristas.git
```

2. Importe o banco de dados:
   - Abra o phpMyAdmin
   - Crie um banco chamado `sistema_motoristas`
   - Importe o arquivo `api/banco.sql`

3. Configure a conexão:
   - Copie `api/config.example.php` para `api/config.php`
   - Preencha os dados do seu banco local

4. Acesse `http://localhost/sistema-motoristas/login.html`

**Credenciais de teste:**

| Usuário | Senha |
|---------|-------|
| `admin` | `admin123` |

## API REST — Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/login.php` | Autenticar e obter token |
| GET | `/api/motoristas.php` | Listar todos os motoristas |
| GET | `/api/motoristas.php?id=1` | Buscar motorista por ID |
| POST | `/api/motoristas.php` | Cadastrar novo motorista |
| PUT | `/api/motoristas.php?id=1` | Atualizar motorista |
| DELETE | `/api/motoristas.php?id=1` | Excluir motorista |

Todas as rotas (exceto login) exigem o header:
```
Authorization: Bearer {token}
```
