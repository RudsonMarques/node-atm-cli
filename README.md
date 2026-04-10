# Projeto Contas — Sistema Bancário em CLI

## O que é isso?

O primeiro projeto completo do curso. Um sistema bancário interativo no terminal: cria contas, deposita, consulta saldo e saca — tudo salvo em arquivos JSON no disco.

## Metáfora geral

Imagine um caixa eletrônico de terminal. Cada conta é um arquivo JSON (tipo um cartão no banco de dados). Você interage pelo teclado, o programa lê e grava esses arquivos, e as operações são refletidas nos dados.

---

## Como rodar

```bash
npm install
npm start
```

---

## Tecnologias usadas

| Pacote | Para que serve |
|---|---|
| `inquirer@9.2.23` | Menu interativo no terminal |
| `chalk` | Cores no output (verde = sucesso, vermelho = erro) |
| `fs` (nativo) | Ler e gravar os arquivos JSON das contas |

> **Por que `inquirer@9.2.23` e não a versão mais nova?** A versão 13+ teve breaking changes na API. A 9.x ainda usa a sintaxe `.then()` que o curso ensina. É um exemplo real de como versões de pacotes importam.

---

## Como os dados são guardados

Não tem banco de dados aqui — cada conta é um arquivo `.json` dentro da pasta `accounts/`:

```
accounts/
├── Rudson.json     → {"balance": 250}
├── Ana.json        → {"balance": 1000}
└── teste.json      → {"balance": 0}
```

É um "banco de dados de arquivo". Funciona para aprender, mas em produção você usaria MySQL, PostgreSQL, etc.

---

## Mapa de funções — quem faz o quê

```
operation()
  ├── Criar conta → createAccount() → buildAccount()
  ├── Depositar   → deposit() → addAmount()
  ├── Saldo       → getAccountBalance()
  ├── Sacar       → withdraw() → removeAmount()
  └── Sair        → (encerra)
```

---

## Explicação detalhada de cada função

### `operation()` — o menu principal

```js
function operation() {
  inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'O que você deseja fazer?',
    choices: ['Criar conta', 'Consultar saldo', 'Depositar', 'Sacar', 'Sair']
  }])
  .then((answer) => {
    const action = answer['action'];
    if (action === 'Criar conta') createAccount();
    else if (action === 'Depositar') deposit();
    // ...
  });
}
```

**O que ela faz:** Exibe o menu e direciona para a função certa.

**Padrão importante:** Toda função de ação chama `operation()` no final — isso cria o **loop do menu**. É como a tela inicial de um app: depois de cada ação, você volta para o menu.

---

### `createAccount()` + `buildAccount()` — criar conta

```js
function createAccount() {
  console.log(chalk.bgGreen.black('Parabéns por escolher o nosso banco!'));
  buildAccount(); // delega para buildAccount fazer o trabalho
}

function buildAccount() {
  inquirer.prompt([{ name: 'accountName', message: 'Nome da conta:' }])
  .then((answer) => {
    const accountName = answer['accountName'];

    // Cria a pasta 'accounts' se não existir
    if (!fs.existsSync('accounts')) {
      fs.mkdirSync('accounts');
    }

    // Conta já existe? Avisa e pede outro nome (recursão)
    if (fs.existsSync(`accounts/${accountName}.json`)) {
      console.log(chalk.bgRed.black('Esta conta já existe!'));
      buildAccount(); // ← chama a si mesma de novo
      return;
    }

    // Cria o arquivo JSON com saldo zero
    fs.writeFileSync(`accounts/${accountName}.json`, '{"balance": 0}');
    console.log(chalk.green('Conta criada com sucesso!'));
    operation(); // volta ao menu
  });
}
```

**Conceito chave — Recursão:** Quando o nome já existe, `buildAccount()` chama ela mesma de novo. É como um formulário que te manda preencher de novo se você errar o campo. Isso evita precisar de um loop `while`.

**O que o arquivo criado parece:**
```
accounts/Rudson.json → {"balance": 0}
```

---

### `checkAccount()` — verificar se a conta existe

```js
function checkAccount(accountName) {
  if (!fs.existsSync(`accounts/${accountName}.json`)) {
    console.log(chalk.bgRed.black('Esta conta não existe!'));
    return false;
  }
  return true;
}
```

**O que ela faz:** Verifica se o arquivo JSON da conta existe no disco. Usada por `deposit`, `getAccountBalance` e `withdraw` antes de qualquer operação.

**Padrão importante:** Validar antes de operar. Se a conta não existe, retorna `false` e a função que chamou decide o que fazer (geralmente pede o nome de novo).

---

### `getAccount()` — ler os dados da conta

```js
function getAccount(accountName) {
  const accountJSON = fs.readFileSync(`accounts/${accountName}.json`, {
    encoding: 'utf8',
    flag: 'r'
  });
  return JSON.parse(accountJSON);
}
```

**O que ela faz:** Lê o arquivo JSON do disco e transforma em objeto JavaScript.

**Fluxo:**
```
arquivo: {"balance": 250}
    ↓ fs.readFileSync → string
'{"balance": 250}'
    ↓ JSON.parse → objeto JS
{ balance: 250 }
```

**Por que `readFileSync` aqui?** Neste projeto é aceitável — é um script CLI com um usuário por vez. Em servidores que atendem múltiplos usuários, use sempre `readFile` (assíncrono).

---

### `deposit()` + `addAmount()` — depositar

```js
function deposit() {
  inquirer.prompt([{ name: 'accountName', message: 'Nome da conta:' }])
  .then((answer) => {
    const accountName = answer['accountName'];

    if (!checkAccount(accountName)) {
      return deposit(); // conta não existe → tenta de novo
    }

    inquirer.prompt([{ name: 'amount', message: 'Quanto depositar?' }])
    .then((answer) => {
      addAmount(accountName, answer['amount']);
      operation();
    });
  });
}

function addAmount(accountName, amount) {
  const accountData = getAccount(accountName); // lê o JSON

  accountData.balance = parseFloat(accountData.balance) + parseFloat(amount);
  // ↑ soma o valor atual com o novo depósito

  fs.writeFileSync(`accounts/${accountName}.json`, JSON.stringify(accountData));
  // ↑ salva o JSON atualizado de volta no arquivo

  console.log(chalk.green('Depósito realizado com sucesso!'));
}
```

**Fluxo completo de um depósito:**
```
1. Usuário digita "Rudson"
2. checkAccount("Rudson") → arquivo existe? ✅
3. Usuário digita "100"
4. getAccount("Rudson") → { balance: 250 }
5. 250 + 100 = 350
6. writeFileSync → salva {"balance": 350} no arquivo
```

**`parseFloat`:** Converte a string que o usuário digitou para número decimal. Sem isso, `"250" + "100"` seria `"250100"` (concatenação de string), não `350`.

---

### `getAccountBalance()` — consultar saldo

```js
function getAccountBalance() {
  inquirer.prompt([{ name: 'accountName', message: 'Qual o nome da conta?' }])
  .then((answer) => {
    const accountName = answer['accountName'];

    if (!checkAccount(accountName)) return getAccountBalance();

    const accountData = getAccount(accountName);
    console.log(chalk.bgBlue.black(
      `O saldo da sua conta é: ${formatCurrency(accountData.balance)}`
    ));
    operation();
  });
}
```

**Simples:** lê o arquivo → pega o `balance` → formata como moeda → exibe.

---

### `withdraw()` + `removeAmount()` — sacar

```js
function removeAmount(accountName, amount) {
  const accountData = getAccount(accountName);

  if (accountData.balance < amount) {
    console.log(chalk.bgRed.black('Saldo insuficiente!'));
    return withdraw(); // volta para tentar de novo
  }

  accountData.balance = parseFloat(accountData.balance) - parseFloat(amount);
  fs.writeFileSync(`accounts/${accountName}.json`, JSON.stringify(accountData));
  console.log(chalk.bgGreen.black(`Saque de ${formatCurrency(amount)} realizado!`));
  operation();
}
```

**Igual ao depósito, mas subtrai.** O detalhe é a validação de saldo insuficiente antes de operar.

---

### `formatCurrency()` — formatar como R$

```js
function formatCurrency(value) {
  value = parseFloat(value);
  if (isNaN(value)) return 'R$0,00';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}
```

**`Intl.NumberFormat`** é uma API nativa do JavaScript para formatar números no padrão local. Com `'pt-BR'` e `'BRL'` ela gera `R$ 1.250,00` automaticamente — com ponto para milhar e vírgula para decimal.

---

## Fluxo completo de uma sessão

```
npm start
    ↓
operation() — exibe menu
    ↓
"Criar conta" → buildAccount() → cria accounts/Rudson.json
    ↓ volta ao menu
"Depositar" → deposit() → addAmount() → atualiza Rudson.json
    ↓ volta ao menu
"Consultar saldo" → getAccountBalance() → lê Rudson.json → exibe R$ 100,00
    ↓ volta ao menu
"Sair" → encerra
```

---

