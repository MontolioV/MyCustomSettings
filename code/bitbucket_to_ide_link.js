// node code/bitbucket_to_ide_link.js
// only for windows powershell
import {execSync} from "child_process";

// Get input from clipboard using PowerShell
const getClipboardCommand = 'powershell -command "Get-Clipboard"';
const clipboardOutput = execSync(getClipboardCommand, { encoding: 'utf-8' });
console.log(clipboardOutput)
const input = clipboardOutput.trim();
const output = parseAndReformat(input);

// Writing output to clipboard using PowerShell
const command = `echo ${output.trim()}| clip`;
try {
  execSync(command);
  console.log('Output copied to clipboard.');
} catch (error) {
  console.error('Failed to copy output to clipboard:', error);
}

function parseAndReformat(input) {
  // Regular expression to extract file path and line number
  const regex = /#L(.*)T(\d+)/;

  // Executing the regex to extract file path and line number
  const match = input.match(regex);

  if (match) {
    // Extracting file path and line number from the matched groups
    const filePath = match[1];
    const lineNumber = match[2];

    // Reformatting the output
    return filePath + ':' + lineNumber;
  } else {
    return "Invalid input format";
  }
}

