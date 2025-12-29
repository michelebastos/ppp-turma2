import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { SharedArray } from 'k6/data';
import { randomDataUser } from './helpers/utils.js';
import { getBaseURL } from './helpers/config.js';
import { checkoutDuration, recordCheckoutDuration } from './helpers/metrics.js';

// Carrega dados de lições compartilhados entre VUs
const lessonsData = new SharedArray('lessons', function () {
  return JSON.parse(open('./lessons.data.json'));
});

// Trend de métricas para POST /checkout (via helper)

export let options = {
  stages: [
    { duration: '5s', target: 10 },   // Ramp-up: 0 a 10 VUs em 5s
    { duration: '10s', target: 10 },  // Estabilização: mantém 10 VUs por 10s
    { duration: '5s', target: 0 },    // Ramp-down: 10 para 0 VUs em 5s
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000', 'p(99)<3000'],
    'checkout_duration': ['p(95)<2000', 'p(99)<3000'],
  },
};

export function setup() {
  const baseURL = getBaseURL();
  const user = randomDataUser();
  let token;

  group('Register Instructor', function () {
    const res = http.post(
      `${baseURL}/instructors/register`,
      JSON.stringify({ name: user.name, email: user.email, password: user.password }),
      { headers: { 'Content-Type': 'application/json' } },
    );
    check(res, {
      'Register status 201': (r) => r.status === 201,
    });
  });

  group('Instructor Login (setup)', function () {
    const res = http.post(
      `${baseURL}/instructors/login`,
      JSON.stringify({ email: user.email, password: user.password }),
      { headers: { 'Content-Type': 'application/json' } },
    );
    check(res, {
      'login 200': (r) => r.status === 200,
      'has token': (r) => !!r.json('token'),
    });
    token = res.json('token');
  });
  return { token };
}

export default function (data) {
  const baseURL = getBaseURL();
  
  group('Performance Test Flow', function () {
    group('Create Lesson', function () {
      // Seleciona uma lição aleatória do SharedArray
      const lesson = lessonsData[Math.floor(Math.random() * lessonsData.length)];
      
      const res = http.post(
        `${baseURL}/lessons`,
        JSON.stringify({ title: lesson.title, description: lesson.description }),
        {
          headers: {
            Authorization: `Bearer ${data.token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      // Usa a Trend de checkout para registrar duração (mapeando ao fluxo de checkout)
      recordCheckoutDuration(res);
      check(res, {
        'Lesson status 201': (r) => r.status === 201,
        'Lesson title correct': (r) => r.json('title') === lesson.title,
        'Lesson description correct': (r) => r.json('description') === lesson.description,    
        'status text is 201 Created': (r) => r.status_text === '201 Created',
      });
    });
    
    sleep(1);
  });
}
