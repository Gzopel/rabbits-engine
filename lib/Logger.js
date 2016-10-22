export const getLogger = (context) => {
  return new Logger(context);
};

let logger = console;
export const setLogger = (newLogger) => logger = newLogger;

class Logger {
  constructor(context) {
    this.context = context;
  }

  log(msg) {
    logger && logger.info(`${this.context}: ${msg}`);
  }

  info(msg) {
    logger && logger.info(`${this.context}: ${msg}`);
  }

  debug(msg) {
    logger && logger.debug(`${this.context}: ${msg}`);
  }

  error(msg) {
    logger && logger.error(`${this.context}: ${msg}`);
  }
}

export default getLogger;