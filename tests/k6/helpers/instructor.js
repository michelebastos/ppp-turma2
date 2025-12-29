import http from 'k6/http';
import { check } from 'k6';
import { getBaseURL } from './config.js';


export function registerInstructor(name, email, password) {
  const baseURL = getBaseURL();
  
  const response = http.post(
    `${baseURL}/instructors/register`,
    JSON.stringify({
      name: name,
      email: email,
      password: password
    }),
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  check(response, {
    'Instructor registration status is 201': (res) => res.status === 201,
  });

  return response;
}

 function instructorLogin(email, password) {
  const baseURL = getBaseURL();
  
  const response = http.post(
    `${baseURL}/instructors/login`,
    JSON.stringify({
      email: email,
      password: password
    }),
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  check(response, {
    'Instructor -  login status is 200': (res) => res.status === 200,
    'Instructor - status text is 200 OK': (res) => res.status_text === '200 OK',
    'Instructor - has token': (res) => !!res.json('token'),
  });

  return {
    response: response,
    token: response.json('token')
  };
}
