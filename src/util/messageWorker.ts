export const messageWorker = (
  worker: Worker,
  message: any,
  transfer?: Transferable[]
): Promise<any> => {
  return new Promise((resolve) => {
    const id = Math.floor(Math.random() * 1000000);
    if (transfer == null) {
      worker.postMessage({id, message});
    } else {
      worker.postMessage({id, message}, transfer);
    }

    const callback = (e: MessageEvent): void => {
      if (e.data.id === id) {
        worker.removeEventListener('message', callback);
        resolve(e.data.message);
      }
    };
    worker.addEventListener('message', callback);
  });
};
