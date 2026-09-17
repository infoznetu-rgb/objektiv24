(() => {
  function boot(tries = 0) {
    const api = window.objektiv24MotionBroll;
    if (!api) {
      if (tries < 120) setTimeout(() => boot(tries + 1), 120);
      return;
    }
    if (api.__saveQueueWrapped) return;

    let queue = Promise.resolve();
    const serialize = name => {
      const original = api[name];
      if (typeof original !== 'function') return;
      api[name] = (...args) => {
        const task = queue.then(() => original.apply(api, args));
        queue = task.catch(() => {});
        return task;
      };
    };

    serialize('addItem');
    serialize('setItem');
    api.whenIdle = () => queue.catch(() => {});
    api.__saveQueueWrapped = true;
  }

  boot();
})();
