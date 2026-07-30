# Teste de Redes (SFT)

Aplicação estática (HTML/JS) para teste prático de redes: cadastro de equipe, exercícios e painel do instrutor.

## GitHub Pages

Site publicado em:

**https://nathanaelsantos.github.io/test-redes/**

A página inicial é o `index.html` (cadastro da equipe e lista de questões).

### Como ativar o Pages (se ainda não estiver ativo)

1. Abra o repositório: https://github.com/NathanaelSantos/test-redes  
2. **Settings → Pages**  
3. **Source:** Deploy from a branch  
4. **Branch:** `main` · pasta `/ (root)`  
5. Save  

Aguarde 1–2 minutos e abra o link acima.

## Uso local

Abra `index.html` no navegador (ou sirva a pasta com um servidor estático simples).

## Painel do instrutor

`painel.html` — acesso com senha (definida no projeto).

## Observação sobre “só o index”

No GitHub Pages **todos os arquivos HTML ficam públicos** se alguém souber a URL  
(ex.: `/questao-01.html`). Não há login de servidor.

O fluxo do teste **obriga o cadastro no `index.html`** antes das questões  
(as páginas redirecionam se a equipe não estiver cadastrada). O painel continua protegido por senha.
