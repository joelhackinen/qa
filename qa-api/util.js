import { serviceClient as redis } from "./app.js";

export const cacheMethodCalls = (object, methodsToFlushCacheWith = []) => {
  const handler = {
    get: (module, methodName) => {
      const method = module[methodName];
      return async (...methodArgs) => {
        if (methodsToFlushCacheWith.includes(methodName)) {
          await redis.flushDb();
          return await method.apply(this, methodArgs);
        }

        const cacheKey = `${methodName}-${JSON.stringify(methodArgs)}`;
        const cacheResult = await redis.get(cacheKey);
        if (!cacheResult) {
          const result = await method.apply(this, methodArgs);
          await redis.set(cacheKey, JSON.stringify(result));
          return result;
        }

        return JSON.parse(cacheResult);
      };
    },
  };

  return new Proxy(object, handler);
};
