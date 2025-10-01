import * as fs from 'fs/promises';

function prependZero(number) {
  if (number > 99) {
    throw 'Unexpected value to prepend with zero';
  }
  return `${number < 10 ? '0' : ''}${number}`;
}

const json = JSON.parse((await fs.readFile('./package.json')).toString());
const stableVersion = json.version.match(/(\d+)\.(\d+)\.(\d+)/);
const major = stableVersion[1];
const minor = stableVersion[2];
const date = new Date();
const month = date.getMonth() + 1;
const day = date.getDate();
const hours = date.getHours();
const patch = `${date.getFullYear()}${prependZero(month)}${prependZero(day)}${prependZero(hours)}`;
const insiderPackageJson = Object.assign(json, {
  version: `${major}.${minor}.${patch}`,
});
await fs.writeFile('./package.json', JSON.stringify(insiderPackageJson, null, 2));
