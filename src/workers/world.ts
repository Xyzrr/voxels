// eslint-disable-next-line no-restricted-globals
const ctx: Worker = self as any;

ctx.addEventListener('message', (e) => {
  console.log('worker', e);
  // let start = Date.now(),
  //   count = 0;
  // while (Date.now() - start < time) count++;
  // return count;
  ctx.postMessage({type: 'received', ev: e.data});
});

ctx.postMessage({foo: 'foo'});

export {};
