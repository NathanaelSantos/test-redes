# Teste de Redes (SFT)

Aplicação HTML/JS para teste prático de redes: cadastro de equipe, exercícios e painel do instrutor.

## Uso em sala (recomendado) — rede + notebooks

Para o **painel do instrutor ver as equipes de todos os notebooks**, use o servidor local:

```bash
node server.js
```

No terminal aparece algo como:

```
Local:     http://127.0.0.1:3000
Na rede:   http://192.168.x.x:3000
```

| Quem | O que fazer |
|------|-------------|
| **Instrutor** | Abre `http://SEU-IP:3000/painel.html` (senha do painel) |
| **Alunos** | Abrem `http://SEU-IP:3000` nos notebooks (mesmo Wi‑Fi/rede) |

O progresso de **todas** as equipes fica em `data/progress.json` e o painel atualiza sozinho.

### Dicas

1. PC do instrutor e notebooks na **mesma rede** (Wi‑Fi da escola / cabo).
2. Se os alunos não abrirem o link, confira o **Firewall do Windows** (permitir Node na rede privada).
3. Não abra o `index.html` como arquivo (`file://`) nem só por pasta compartilhada — use o link `http://…`.
4. Pare o servidor com `Ctrl+C`.

## GitHub Pages

Site publicado em:

**https://nathanaelsantos.github.io/test-redes/**

> No GitHub Pages **não há sync entre PCs**: cada navegador guarda só o próprio progresso no `localStorage`. Para acompanhar a sala inteira, use `node server.js` na rede local.

### Como ativar o Pages (se ainda não estiver ativo)

1. Abra o repositório: https://github.com/NathanaelSantos/test-redes  
2. **Settings → Pages**  
3. **Source:** Deploy from a branch  
4. **Branch:** `main` · pasta `/ (root)`  
5. Save  

## Uso local (só um PC)

```bash
node server.js
```

Ou abra `index.html` no navegador (sem painel multi‑máquina).

## Painel do instrutor

`painel.html` — acesso com senha (definida em `painel.js`).

Com o servidor ativo, o badge mostra **“Ao vivo na rede (servidor)”**.

## Por que antes não apareciam as equipes?

O app antigo salvava tudo no `localStorage` de **cada** navegador.  
Quando os alunos usavam o notebook deles, o cadastro ficava só no PC deles — o painel do instrutor não via nada.

Agora, com `server.js`, todos falam com o mesmo servidor e o painel lista todas as equipes.
