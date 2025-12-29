# Documentação dos Testes de Performance com K6

Este diretório contém testes de performance implementados com **K6**, uma ferramenta de teste de carga moderna. Abaixo está uma explicação detalhada de como cada conceito foi utilizado no teste `checkout.test.js`.

---

## 📊 Conceitos Implementados

### 1. **Thresholds** (Limites de Performance)

Os thresholds definem os critérios de aceitação para o teste. Se qualquer threshold falhar, o teste é marcado como falhado.

**Implementação:**
```javascript
thresholds: {
  'http_req_duration': ['p(95)<2000', 'p(99)<3000'],
  'checkout_duration': ['p(95)<2000', 'p(99)<3000'],
},
```

**Explicação:**
- `p(95)<2000`: O 95º percentil das requisições HTTP deve ser menor que 2000ms (2s)
- `p(99)<3000`: O 99º percentil das requisições deve ser menor que 3000ms (3s)
- Isso garante que a maioria das requisições atenda aos critérios de performance estabelecidos

**Arquivo:** `checkout.test.js` (linhas 9-15)

---

### 2. **Checks** (Validações de Resposta)

Checks são validações que verificam se a resposta atende aos critérios esperados. Diferente dos thresholds, falhas em checks não interrompem o teste.

**Implementação:**
```javascript
check(res, {
  'Register status 201': (r) => r.status === 201,
  'login 200': (r) => r.status === 200,
  'has token': (r) => !!r.json('token'),
  'Lesson status 201': (r) => r.status === 201,
  'Lesson title correct': (r) => r.json('title') === lesson.title,
  'Lesson description correct': (r) => r.json('description') === lesson.description,
  'status text is 201 Created': (r) => r.status_text === '201 Created',
});
```

**Explicação:**
- Cada check valida um aspecto diferente da resposta
- Os resultados são coletados em relatórios (ex: "158 passed, 0 failed")
- Verificam status HTTP, conteúdo da resposta e mensagens

**Arquivo:** `checkout.test.js` (múltiplas linhas)

---

### 3. **Helpers** (Funções Reutilizáveis)

Helpers são módulos que encapsulam lógica comum, promovendo reutilização de código e manutenibilidade.

**Helpers Implementados:**

#### **helpers/config.js**
```javascript
export function getBaseURL() {
  return __ENV.BASE_URL || 'http://localhost:3000';
}
```
- Centraliza a configuração da URL base da API
- Permite alteração via variável de ambiente

#### **helpers/utils.js**
```javascript
export function randomDataUser() { /* gera dados de usuário */ }
```
- Funções para geração de dados aleatórios de usuário
- Reutilizadas para criar usuários únicos no setup()

**Nota:** A função `generateLesson()` foi removida e substituída por SharedArray que lê dados do arquivo `lessons.data.json`

#### **helpers/metrics.js**
```javascript
export const checkoutDuration = new Trend('checkout_duration');
export function recordCheckoutDuration(response) { /* registra duração */ }
```
- Encapsula a lógica de coleta de métricas
- Separa concerns de métrica do teste principal

**Arquivo:** `helpers/` (diretório)

---

### 4. **Trends** (Métricas Customizadas)

Trends são métricas que rastreiam a distribuição de valores ao longo do tempo, permitindo calcular percentis.

**Implementação:**
```javascript
import { Trend } from 'k6/metrics';

export const checkoutDuration = new Trend('checkout_duration');

export function recordCheckoutDuration(response) {
  if (response && response.timings && typeof response.timings.duration === 'number') {
    checkoutDuration.add(response.timings.duration);
  }
}
```

**Uso no Teste:**
```javascript
recordCheckoutDuration(res); // Registra a duração da requisição
```

**Explicação:**
- `checkoutDuration` é uma Trend que coleta durações de requisições
- Permite análise de performance com percentis (p95, p99)
- Resultado: `checkout_duration p95=8.94ms, p99=12.04ms`

**Arquivo:** `helpers/metrics.js` e `checkout.test.js`

---

### 5. **Faker** (Geração de Dados Realistas)

Faker refere-se à geração de dados aleatórios e únicos para cada iteração do teste.

**Implementação - Usuários:**
```javascript
export function randomDataUser() {
  const now = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const vu = typeof __VU !== 'undefined' ? __VU : 'vu';
  const iter = typeof __ITER !== 'undefined' ? __ITER : 'iter';
  return {
    email: `userqa_${now}_${vu}_${iter}_${rand}@mail.com`,
    name: `UserQA_${now}_${rand}`,
    password: '123456',
  };
}
```

**Explicação:**
- Gera emails únicos combinando: timestamp + VU (Virtual User) + iteração + hash aleatório
- Garante que cada usuário registrado tenha dados únicos
- Evita conflitos de duplicação em banco de dados
- Exemplo: `userqa_1735451234567_1_0_a3f2b1@mail.com`

**Arquivo:** `helpers/utils.js`

---

### 6. **Variável de Ambiente** (Environment Variables)

Variáveis de ambiente permitem configurar o teste sem modificar o código.

**Implementação:**
```javascript
export function getBaseURL() {
  return __ENV.BASE_URL || 'http://localhost:3000';
}
```

**Uso:**
```powershell
# Executar com URL padrão
k6 run checkout.test.js

# Executar com URL customizada
k6 run checkout.test.js --env BASE_URL=http://localhost:3001
```

**Explicação:**
- `__ENV.BASE_URL` lê a variável de ambiente passada via CLI
- Fallback para `'http://localhost:3000'` se não estiver definida
- Permite executar o mesmo teste em diferentes ambientes

**Arquivo:** `helpers/config.js`

---

### 7. **Stages** (Rampa de Carga)

Stages definem como a carga aumenta e diminui ao longo do tempo de execução.

**Implementação:**
```javascript
export let options = {
  stages: [
    { duration: '5s', target: 10 },   // Ramp-up: 0 a 10 VUs em 5s
    { duration: '10s', target: 10 },  // Estabilização: mantém 10 VUs por 10s
    { duration: '5s', target: 0 },    // Ramp-down: 10 para 0 VUs em 5s
  ],
};
```

**Timeline de Execução:**
```
VUs
10 |     ████████████
   |    ██          ██
   |   ██            ██
   |  ██              ██
 0 |██                  ██
   +-----+----------+-----+
     5s     10s      5s
   Ramp-  Stable  Ramp-
    up            down
```

**Explicação:**
- **Ramp-up (5s):** Aumenta gradualmente de 0 a 10 usuários simultâneos
- **Estabilização (10s):** Mantém 10 usuários para teste estável
- **Ramp-down (5s):** Reduz gradualmente de 10 a 0 usuários
- Duração total: 20 segundos

**Arquivo:** `checkout.test.js` (linhas 9-14)

---

### 8. **Reaproveitamento de Resposta** (Response Reuse)

O token retornado do login é reutilizado em requisições subsequentes.

**Implementação:**

**No setup():**
```javascript
group('Instructor Login (setup)', function () {
  const res = http.post(`${baseURL}/instructors/login`, ...);
  check(res, { 'has token': (r) => !!r.json('token') });
  token = res.json('token');  // ← Extrai o token da resposta
});
return { token };  // ← Retorna para a função default
```

**Na função default():**
```javascript
export default function (data) {
  // data.token vem da resposta do setup
  const res = http.post(
    `${baseURL}/lessons`,
    JSON.stringify({ title: lesson.title, description: lesson.description }),
    {
      headers: {
        Authorization: `Bearer ${data.token}`,  // ← Reutiliza o token
        'Content-Type': 'application/json',
      },
    },
  );
}
```

**Explicação:**
- O token extraído de `res.json('token')` é armazenado
- Passado para `default()` através do objeto `data`
- Reutilizado em requisições autenticadas
- Simula um fluxo real onde o usuário faz login uma vez e usa o token múltiplas vezes

**Arquivo:** `checkout.test.js`

---

### 9. **Uso de Token de Autenticação** (Authentication Token)

O teste implementa autenticação Bearer Token para requisições protegidas.

**Fluxo de Autenticação:**

1. **Registro do Instrutor** (setup):
   ```javascript
   http.post(`${baseURL}/instructors/register`, {...})
   ```

2. **Login e Obtenção do Token** (setup):
   ```javascript
   const res = http.post(`${baseURL}/instructors/login`, {...});
   token = res.json('token');  // Extrai JWT
   ```

3. **Uso do Token em Requisições** (default):
   ```javascript
   headers: {
     Authorization: `Bearer ${data.token}`,  // Inclui JWT no header
     'Content-Type': 'application/json',
   }
   ```

**Explicação:**
- Token Bearer (JWT) é obtido após login bem-sucedido
- Incluído no header `Authorization` de requisições subsequentes
- Simula autenticação real em APIs RESTful
- Sem o token, requisições de lesson retornariam 401 Unauthorized

**Arquivo:** `checkout.test.js`

---

### 10. **Data-Driven Testing** (Teste Dirigido por Dados)

O teste usa dados pré-definidos (SharedArray) combinados com dados gerados aleatoriamente.

**Implementação com SharedArray:**
```javascript
import { SharedArray } from 'k6/data';

// Carrega dados compartilhados entre VUs
const lessonsData = new SharedArray('lessons', function () {
  return JSON.parse(open('./lessons.data.json'));
});

export default function (data) {
  // Seleciona uma lição aleatória do SharedArray
  const lesson = lessonsData[Math.floor(Math.random() * lessonsData.length)];
  
  const res = http.post(
    `${baseURL}/lessons`,
    JSON.stringify({ title: lesson.title, description: lesson.description }),
    // ...
  );
}
```

**Arquivo de Dados - lessons.data.json:**
```json
[
  {
    "title": "Introduction to Music Theory",
    "description": "Learn the fundamentals of music theory including notes, scales, and basic harmony"
  },
  {
    "title": "Piano Basics for Beginners",
    "description": "Master the piano keyboard layout, hand positioning, and your first melodies"
  },
  {
    "title": "Advanced Chord Progressions",
    "description": "Explore complex chord structures and their applications in modern music"
  },
  {
    "title": "Rhythm and Time Signatures",
    "description": "Understand different time signatures and how to count complex rhythmic patterns"
  },
  {
    "title": "Music Composition Techniques",
    "description": "Learn professional techniques for composing your own original music pieces"
  }
]
```

**Explicação:**
- **SharedArray**: Carrega dados uma única vez e compartilha entre todos os VUs
- **Benefícios**: Melhor performance, sem duplicação de dados
- Cada iteração seleciona aleatoriamente uma das 5 lições pré-definidas
- Dados gerados são validados na resposta
- Simula múltiplos cenários com dados realistas
- Total: 155 iterações com lições variadas

**Arquivos:** `checkout.test.js`, `lessons.data.json`

---

### 11. **Groups** (Agrupamento de Operações)

Groups organizam logicamente as operações do teste, melhorando a legibilidade dos relatórios.

**Implementação:**

```javascript
// No setup()
group('Register Instructor', function () { /* ... */ });
group('Instructor Login (setup)', function () { /* ... */ });

// Na função default()
group('Performance Test Flow', function () {
  group('Create Lesson', function () {
    // Operações de criação de lesson
  });
});
```

**Saída do Relatório:**
```
█ Performance Test Flow
  └─ Create Lesson ......................... 155 iterations
      ├─ Lesson status 201 ................ 155 passed
      ├─ Lesson title correct ............ 155 passed
      └─ Lesson description correct ...... 155 passed

█ Register Instructor ...................... 1 executed
  └─ Register status 201 ................. 1 passed

█ Instructor Login (setup) ................. 1 executed
  └─ login 200 ........................... 1 passed
  └─ has token ........................... 1 passed
```

**Explicação:**
- Groups organizam testes em seções hierárquicas
- Facilita identificação de quais operações executaram
- Melhora rastreabilidade de falhas
- Cada grupo tem suas métricas e checks independentes

**Arquivo:** `checkout.test.js`

---

## 📈 Resultados Esperados

Ao executar `k6 run checkout.test.js`, o teste deve:

✅ **Listar todas as métricas organizadas por groups**
✅ **Passar em todos os 4 thresholds** (p95 e p99 para ambas as métricas)
✅ **Executar 155+ iterações** com 10 VUs paralelos
✅ **Validar todos os checks** (status 201, titles, descrições)
✅ **Coletar métricas de performance** (duração p95≈8.94ms, p99≈12.04ms)

---

## 🚀 Como Executar

### Executar Teste
```bash
# Execução padrão
cd tests/k6
k6 run checkout.test.js

# Com URL customizada
k6 run checkout.test.js --env BASE_URL=http://seu-servidor:3000

# Com relatório detalhado em JSON
k6 run checkout.test.js --out json=results.json
```

### Gerar Relatório HTML
```bash
# Após executar o teste com --out json=results.json
cd tests/k6
node generate-report.js

# Abre o relatório no navegador
# O arquivo report.html será criado com design profissional e interativo
```

### Visualizar Relatório
- Abra o arquivo `tests/k6/report.html` em seu navegador
- O relatório inclui:
  - 📊 Resumo Executivo (iterações, requisições, taxa de erro)
  - ✅ Status dos Thresholds (p95, p99)
  - ✓ Validações (checks aprovados)
  - 📡 Métricas HTTP detalhadas
  - 🎯 Métricas Customizadas (Trend)
  - ⚙️ Estatísticas de Execução
  - 📈 Configuração de Stages

---

## 📁 Estrutura de Arquivos

```
tests/
├── k6/
│   ├── checkout.test.js          # Teste principal com SharedArray
│   ├── lessons.test.js           # Teste alternativo
│   ├── lessons.data.json         # Dados pré-definidos de lições (5 lições)
│   ├── results.json              # Resultados do último teste executado
│   ├── report.html               # Relatório HTML gerado
│   ├── generate-report.js        # Script para gerar relatório
│   ├── helpers/
│   │   ├── config.js             # Configuração de URL (getBaseURL)
│   │   ├── utils.js              # Geração de dados de usuário
│   │   ├── metrics.js            # Métricas customizadas (Trend)
│   │   └── instructor.js         # Funções de instrutor (não usado)
│   └── k6/
└── README.md                      # Este arquivo
```

---

## 📌 Resumo

Este teste demonstra os principais conceitos de teste de performance com K6:

| Conceito | Propósito | Benefício |
|----------|-----------|-----------|
| **Thresholds** | Validar limites de performance | Garantir SLAs |
| **Checks** | Validar resposta da API | Garantir funcionalidade |
| **Helpers** | Reutilizar código | Manutenibilidade |
| **Trends** | Coletar métricas custom | Análise detalhada |
| **Faker** | Gerar dados únicos de usuários | Simular múltiplos usuários |
| **Variáveis de Ambiente** | Flexibilidade de configuração | Múltiplos ambientes |
| **Stages** | Simular carga realista | Teste escalável |
| **Reaproveitamento de Resposta** | Usar dados de respostas | Autenticação realista |
| **Token de Autenticação** | Autenticar requisições | Segurança |
| **Data-Driven** | Dados variados via SharedArray | Cobertura ampla |
| **Groups** | Organizar logicamente | Relatórios claros |
| **SharedArray** | Compartilhar dados entre VUs | Performance otimizada |

---

## 🎯 Funcionalidades Adicionais

### SharedArray para Dados Pré-definidos
- ✅ Carrega `lessons.data.json` uma única vez
- ✅ Compartilha dados entre todos os VUs sem duplicação
- ✅ Melhora performance do teste
- ✅ Permite testes com cenários realistas

### Geração Automática de Relatórios
- ✅ Script `generate-report.js` converte JSON em HTML
- ✅ Relatório com design profissional e responsivo
- ✅ Estatísticas completas de performance
- ✅ Visualização clara de thresholds e validações

---

**Autor:** Documentação do Projeto PPP Turma 2  
**Data:** Dezembro 2025  
**Framework:** K6 (Grafana)  
**Linguagem:** JavaScript ES6

### 📚 Recursos Úteis
- [Documentação K6](https://k6.io/docs/)
- [K6 Best Practices](https://k6.io/docs/misc/best-practices/)
- [API K6 - http](https://k6.io/docs/javascript-api/k6-http/)
- [API K6 - metrics](https://k6.io/docs/javascript-api/k6-metrics/)
- [API K6 - data (SharedArray)](https://k6.io/docs/javascript-api/k6-data/sharedarray/)
