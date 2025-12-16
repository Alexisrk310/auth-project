
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../src/components/LanguageProvider.tsx');
const outputDir = path.join(__dirname, '../src/locales');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const content = fs.readFileSync(inputPath, 'utf8');

// Find the translations object
// Look for "const translations: Translations = {"
const startMarker = "const translations: Translations = {";
const endMarker = "};";

const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
    console.error("Could not find start of translations object");
    process.exit(1);
}

// We need to find the matching closing bracket for the object
// Simple counter approach
let bracketCount = 0;
let foundStart = false;
let objectContent = "";
let i = startIndex + startMarker.length - 1; // start at the {

// Adjust i to point to the opening brace
while (content[i] !== '{' && i < content.length) i++;

const objStartIndex = i;

for (; i < content.length; i++) {
    const char = content[i];
    if (char === '{') {
        bracketCount++;
        foundStart = true;
    } else if (char === '}') {
        bracketCount--;
    }

    if (foundStart && bracketCount === 0) {
        // We found the end
        objectContent = content.substring(objStartIndex, i + 1);
        break;
    }
}

// Evaluate the object content to get the JS object
// We might need to handle comments which are not valid in JS object literals if we use JSON.parse, 
// but eval handles comments fine.
try {
    const translations = eval('(' + objectContent + ')');

    // Write each language to a file
    for (const [lang, trans] of Object.entries(translations)) {
        const filePath = path.join(outputDir, `${lang}.json`);
        fs.writeFileSync(filePath, JSON.stringify(trans, null, 2));
        console.log(`Wrote ${lang}.json to ${filePath}`);
    }

} catch (e) {
    console.error("Error parsing translations object:", e);
    // Fallback: Use string replacement to make it eval-able if TS types are interfering?
    // There are no types inside the object literal usually.
    // Ensure comments don't break it? eval might choke on some TS syntax if present inside, but here it looks like pure strings.
}
