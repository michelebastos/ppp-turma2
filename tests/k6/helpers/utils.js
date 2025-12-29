
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

export function generateLesson() {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return {
    title: `Lesson ${timestamp}`,
    description: `Performance test lesson ${random}`
  };
}
