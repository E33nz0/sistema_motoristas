sistema de gestão de motoristas
projeto feito pra disciplina de LP4 no IFRS ibiruba

sobre
esse sistema eu fiz baseado num sistema real que eu uso no trabalho. basicamente é um cadastro de motoristas onde da pra controlar os documentos deles, ver quem ta com CNH vencida, quem ta sem certificado, etc...
os dados que tem no banco.sql sao todos inventados, o sistema original tem dados reais mas nao da pra colocar isso aqui

tecnologias que usei
PHP
MySQL
JavaScript puro (sem jquery nem nada)
Bootstrap 5
fiz um sistema de login com token JWT na mao

o que da pra fazer

cadastrar, editar e excluir motoristas
buscar pelo nome ou cpf em tempo real
ver alertas de quem ta com documento vencendo ou faltando
fazer upload da CNH e certificado
a API responde em JSON

como rodar
tem que ter o XAMPP

clona dentro do htdocs
cria um banco chamado sistema_motoristas no phpMyAdmin
importa o api/banco.sql
copia o api/config.example.php pra api/config.php e coloca os dados do banco
abre no navegador http://localhost/sistema-motoristas/login.html

usuario: admin
senha: admin123

estrutura das pastas

api/         -> aqui fica o PHP, conexao com banco, autenticacao e os endpoints

motoristas/  -> o modulo principal, HTML + JS

uploads/     -> onde ficam os arquivos enviados

login.html   -> tela de login

index.html   -> pagina inicial com o menu

tentei seguir o padrao MVC que a gente viu em aula, o PHP faz o papel de controller/model e o HTML com JS faz a view consumindo a API
