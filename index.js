const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const [url, file] = process.argv.slice(2);

if (!url) {
  throw 'Please provide a URL as the first argument.';
}

const fileAsArray =file.split('.');
const fileExt = fileAsArray[fileAsArray.length-1];

const columnDelimiter = fileExt == "csv" ? "," : "";
const rowDelimiter = "\n";

function removeWhitespace(string) {
  return string.replace(/\s/g, "");
}

function hasUpVote(votes) {
  return parseInt(votes) > 0;
}

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(url);
  await page.waitForSelector('.message-list');

  const boardTitle = await page.$eval('.board-name', (node) => node.innerText.trim());

  if (!boardTitle) {
    throw 'Board title does not exist. Please check if provided URL is correct.'
  }

  let parsedText = boardTitle + rowDelimiter + rowDelimiter;

  const columns = await page.$$('.message-list');

  if (fileExt == "csv" ) {
    for (let i = 0; i < columns.length; i++) {
      const columnTitle = await columns[i].$eval('.column-header', (node) => node.innerText.trim());
      const messages = await columns[i].$$('.message-main');
      for (let i = 0; i < messages.length; i++) {
        const messageText = await messages[i].$eval('.message-body .text', (node) => node.innerText.trim());
        const votes = await messages[i].$eval('.votes .vote-area span.show-vote-count', (node) => node.innerText.trim());
        if (hasUpVote(votes)) {
          parsedText +=  columnTitle + columnDelimiter + messageText + columnDelimiter + votes + rowDelimiter;
        }
      }
    }
  } else {
    for (let i = 0; i < columns.length; i++) {
      const columnTitle = await columns[i].$eval('.column-header', (node) => node.innerText.trim());
      const messages = await columns[i].$$('.message-main');
      if (messages.length) {
        parsedText += columnTitle + rowDelimiter;
      }
      for (let i = 0; i < messages.length; i++) {
        const messageText = await messages[i].$eval('.message-body .text', (node) => node.innerText.trim());
        const votes = await messages[i].$eval('.votes .vote-area span.show-vote-count', (node) => node.innerText.trim());
          parsedText +=  messageText + columnDelimiter + `(${votes})` + rowDelimiter;
      }

      if (messages.length) {
        parsedText += '\n';
      }
    }
  }
  return parsedText;
}

function writeToFile(filePath, data) {
  let resolvedPath = fileExt == 'csv' ?
    path.resolve(`../${removeWhitespace(data.split(rowDelimiter)[0].replace('/', ''))}.csv`) :
    path.resolve(filePath || `../${removeWhitespace(data.split(rowDelimiter)[0].replace('/', ''))}.txt`);
  fs.writeFile(resolvedPath, data, (error) => {
    if (error) {
      throw error;
    } else {
      console.log(`Successfully written to file at: ${resolvedPath}`);
    }
    process.exit();
  });
}

function handleError(error) {
  console.error(error);
}

run().then((data) => writeToFile(file, data)).catch(handleError);