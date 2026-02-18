type QueueState = "open" | "closed";

export function createAsyncEventQueue<T>() {
  const values: T[] = [];
  const waiters: Array<(value: IteratorResult<T>) => void> = [];
  let state: QueueState = "open";

  const push = (value: T) => {
    if (state !== "open") return;
    const waiter = waiters.shift();
    if (waiter) {
      waiter({ value, done: false });
      return;
    }
    values.push(value);
  };

  const close = () => {
    state = "closed";
    while (waiters.length > 0) {
      const waiter = waiters.shift();
      waiter?.({ value: undefined as never, done: true });
    }
  };

  const iterable: AsyncIterable<T> = {
    [Symbol.asyncIterator]() {
      return {
        next() {
          if (values.length > 0) {
            const value = values.shift();
            return Promise.resolve({ value: value as T, done: false });
          }
          if (state === "closed") {
            return Promise.resolve({ value: undefined as never, done: true });
          }
          return new Promise<IteratorResult<T>>((resolve) => {
            waiters.push(resolve);
          });
        },
      };
    },
  };

  return { push, close, iterable };
}
