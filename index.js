// ─────────────────────────────────────────────
// PROJETO  ATM — Sistema bancário em CLI
// Tecnologias: inquirer (menu), chalk (cores), fs (arquivos como banco de dados)
// ─────────────────────────────────────────────

// Pacotes externos (instalados via npm)
import inquirer from 'inquirer'; // menus interativos no terminal
import chalk from 'chalk';       // cores no output do terminal

// Módulo nativo do Node.js — lê e grava arquivos
import fs from 'fs';

// Inicia o programa exibindo o menu principal
operation();

// ─────────────────────────────────────────────
// MENU PRINCIPAL
// Exibe as opções e direciona para a função certa.
// Chamada no início e ao final de cada operação — cria o loop do menu.
// ─────────────────────────────────────────────
function operation() {
  inquirer.prompt([
    {
      type: 'list',       // tipo "lista" — usuário navega com seta e confirma com Enter
      name: 'action',     // chave que usaremos para ler a resposta
      message: 'O que você deseja fazer?',
      choices: [
        'Criar conta',
        'Consultar saldo',
        'Depositar',
        'Sacar',
        'Sair'
      ]
    }
  ])
    .then((answer) => {
      // answer = { action: 'Depositar' } — objeto com a escolha do usuário
      const action = answer['action'];

      if (action === 'Criar conta') {
        createAccount();
      } else if (action === 'Depositar') {
        deposit();
      } else if (action === 'Consultar saldo') {
        getAccountBalance();
      } else if (action === 'Sacar') {
        withdraw();
      } else if (action === 'Sair') {
        // Não chama operation() de novo → programa encerra naturalmente
      }
    })
    .catch((error) => {
      console.log(error);
    });
}

// ─────────────────────────────────────────────
// CRIAR CONTA
// Exibe mensagem de boas-vindas e delega para buildAccount()
// ─────────────────────────────────────────────
function createAccount() {
  console.log(chalk.bgGreen.black('Parabéns por escolher o nosso banco!'));
  console.log(chalk.green('Defina as opções da sua conta a seguir:'));
  buildAccount();
}

// Pede o nome da conta, valida e cria o arquivo JSON no disco.
// Se o nome já existir, chama a si mesma de novo (recursão como loop).
function buildAccount() {
  inquirer.prompt([
    {
      name: 'accountName',
      message: 'Digite um nome para a sua conta:'
    }
  ])
    .then((answer) => {
      const accountName = answer['accountName'];

      console.info(accountName);

      // Cria a pasta 'accounts/' caso ainda não exista
      if (!fs.existsSync('accounts')) {
        fs.mkdirSync('accounts');
      }

      // Conta duplicada? Avisa e pede outro nome (chama a si mesma de novo)
      if (fs.existsSync(`accounts/${accountName}.json`)) {
        console.log(
          chalk.bgRed.black('Esta conta já existe, escolha outro nome!'),
        );
        buildAccount(); // ← recursão: tenta de novo sem precisar de while/for
        return;
      }

      // Cria o arquivo JSON com saldo inicial zero
      // Ex: accounts/Rudson.json → {"balance": 0}
      fs.writeFileSync(`accounts/${accountName}.json`, '{"balance": 0}',
        function (err) {
          console.log(err);
        }
      );

      console.log(chalk.green('Conta criada com sucesso!'));
      operation(); // volta ao menu principal
    })
    .catch((error) => {
      console.log(error);
    });
}

// ─────────────────────────────────────────────
// DEPOSITAR
// Pede o nome da conta e o valor, depois chama addAmount() para salvar.
// ─────────────────────────────────────────────
function deposit() {
  inquirer.prompt([
    {
      name: 'accountName',
      message: 'Digite o nome da conta:'
    }
  ])
    .then((answer) => {
      const accountName = answer['accountName'];

      // Conta não existe? Volta para deposit() e pede o nome de novo
      if (!checkAccount(accountName)) {
        return deposit();
      }

      inquirer.prompt([
        {
          name: 'amount',
          message: 'Quanto você deseja depositar?'
        }
      ])
        .then((answer) => {
          const amount = answer['amount'];

          addAmount(accountName, amount);
          operation(); // volta ao menu
        })
        .catch((error) => {
          console.log(error);
        });
    })
    .catch((error) => {
      console.log(error);
    });
}

// ─────────────────────────────────────────────
// HELPER: verificar se a conta existe
// Retorna true se o arquivo .json existir, false caso contrário.
// Usado por deposit, getAccountBalance e withdraw antes de qualquer operação.
// ─────────────────────────────────────────────
function checkAccount(accountName) {
  if (!fs.existsSync(`accounts/${accountName}.json`)) {
    console.log(chalk.bgRed.black('Esta conta não existe, escolha outro nome!'));
    return false;
  }
  return true;
}

// Lê o arquivo JSON, soma o novo valor ao saldo atual e salva de volta.
function addAmount(accountName, amount) {
  const accountData = getAccount(accountName); // lê o arquivo → { balance: 250 }

  if (!amount) {
    console.log(chalk.bgRed.black('Valor inválido!'));
    return deposit();
  }

  // parseFloat converte string para número — sem isso "250" + "100" = "250100" (bug!)
  accountData.balance = parseFloat(accountData.balance) + parseFloat(amount);

  // JSON.stringify converte o objeto JS de volta para string antes de gravar
  fs.writeFileSync(`accounts/${accountName}.json`, JSON.stringify(accountData),
    function (err) {
      console.log(err);
    });

  console.log(chalk.green('Depósito realizado com sucesso!'));
}

// ─────────────────────────────────────────────
// HELPER: ler os dados de uma conta
// Lê o arquivo .json e converte (JSON.parse) para objeto JavaScript.
// Fluxo: arquivo {"balance":250} → string → objeto { balance: 250 }
// ─────────────────────────────────────────────
function getAccount(accountName) {
  const accountJSON = fs.readFileSync(`accounts/${accountName}.json`, {
    encoding: 'utf8', // garante que o conteúdo vem como string, não como Buffer
    flag: 'r'         // 'r' = read only (só leitura)
  });
  return JSON.parse(accountJSON); // converte string JSON → objeto JS
}

// ─────────────────────────────────────────────
// CONSULTAR SALDO
// Lê o arquivo da conta e exibe o saldo formatado como R$.
// ─────────────────────────────────────────────
function getAccountBalance(accountName) {
  inquirer.prompt([
    {
      name: 'accountName',
      message: 'Qual o nome da conta?'
    }
  ])
    .then((answer) => {
      const accountName = answer['accountName'];

      if (!checkAccount(accountName)) {
        return getAccountBalance(); // conta não existe → tenta de novo
      }

      const accountData = getAccount(accountName); // { balance: 350 }

      console.log(
        chalk.bgBlue.black(
          `O saldo da sua conta é: ${formatCurrency(accountData.balance)}`
          // formatCurrency(350) → 'R$ 350,00'
        )
      );
      operation();
    })
    .catch((error) => {
      console.log(error);
    });
}

// ─────────────────────────────────────────────
// SACAR
// Pede conta e valor, depois chama removeAmount() para validar e subtrair.
// ─────────────────────────────────────────────
function withdraw() {
  inquirer.prompt([
    {
      name: 'accountName',
      message: 'Qual o nome da conta?'
    }
  ])
    .then((answer) => {
      const accountName = answer['accountName']

      if (!checkAccount(accountName)) {
        return withdraw(); // conta não existe → tenta de novo
      }

      inquirer.prompt([
        {
          name: 'amount',
          message: 'Qual o valor deseja sacar?'
        }
      ])
        .then((answer) => {
          const amount = answer['amount'];

          removeAmount(accountName, amount);
        })
        .catch((error) => {
          console.log(error);
        });

    })
    .catch((error) => {
      console.log(error);
    });
}

// ─────────────────────────────────────────────
// HELPER: formatar número como moeda brasileira
// Usa Intl.NumberFormat — API nativa do JS para internacionalização.
// Ex: formatCurrency(1250.5) → 'R$ 1.250,50'
// ─────────────────────────────────────────────
function formatCurrency(value) {
  value = parseFloat(value);

  // isNaN = "is Not a Number" — se o valor não for um número válido, retorna zero
  if (isNaN(value)) {
    return 'R$0,00';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', // formata como moeda
    currency: 'BRL'    // Real Brasileiro
  }).format(value);
}

// Lê o arquivo, valida saldo e subtrai o valor solicitado.
function removeAmount(accountName, amount) {
  const accountData = getAccount(accountName);

  if (!amount) {
    console.log(chalk.red('Ocorreu um erro, tente novamente mais tarde!'));
    return withdraw();
  }

  // Saldo insuficiente? Avisa e volta para withdraw()
  if (accountData.balance < amount) {
    console.log(chalk.bgRed.black('Saldo insuficiente!'));
    return withdraw();
  }

  // Subtrai o valor e salva no arquivo
  accountData.balance = parseFloat(accountData.balance) - parseFloat(amount);
  fs.writeFileSync(`accounts/${accountName}.json`, JSON.stringify(accountData),
    function (err) {
      console.log(err);
    }
  );

  console.log(
    chalk.bgGreen.black(`O saque de ${formatCurrency(amount)} foi realizado com sucesso!`)
  );

  operation(); // volta ao menu
}
