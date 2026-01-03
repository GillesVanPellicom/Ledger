import chalk from 'chalk';


const LINE_WIDTH = 100;

function printLine(label, ms, keyword) {
  const line =
    label +
    '.'.repeat(
      Math.max(5, LINE_WIDTH - label.length - ms.length - 3 - keyword.length)) + // -3 for space + "ms"
    ' ' + ms + 'ms ' +
    keyword;
  console.log(line);
}

export async function task(label, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    const ms = (Date.now() - start).toFixed(2);
    let keyword = chalk.green.bold('DONE');

    if (result === 'EXISTS') keyword = chalk.yellow.bold('EXISTS');
    if (result === 'CREATED') keyword = chalk.green.bold('CREATED');
    if (result === 'SKIPPED') keyword = chalk.gray.bold('SKIPPED');
    if (result === 'CLEARED') keyword = chalk.green.bold('CLEARED');

    printLine(label, ms, keyword);
    return result;
  } catch (err) {
    const ms = (Date.now() - start).toFixed(2);
    const keyword = chalk.red.bold('ERROR');
    printLine(label, ms, keyword);
    console.error(chalk.red(err.message));
    throw err;
  }
}

export function info(msg) {
  console.log(chalk.cyan.bold('INFO'), msg);
}

export function success(msg) {
  console.log('\n' + chalk.green.bold('SUCCESS'), msg);
}

export function done(msg) {
  console.log('\n' + chalk.green.bold('DONE'), msg);
}

export function warn(msg) {
  console.log('\n' + chalk.yellow.bold('WARNING'), msg);
}
