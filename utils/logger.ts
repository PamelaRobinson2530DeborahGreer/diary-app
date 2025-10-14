// utils/logger.ts
/**
 * 开发环境日志工具
 * 生产环境下会被优化掉，不会输出到控制台
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  },

  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  error: (...args: any[]) => {
    // 错误始终输出，即使在生产环境
    console.error(...args);
  },

  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args);
    }
  }
};
