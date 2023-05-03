let keysToExtract = [];
const rows = [];
const loopFinishedEvent = new CustomEvent("loopFinished");
const productsDict = {
  "iPhone1,1": "iPhone",
  "iPhone1,2": "iPhone 3G",
  "iPhone2,1": "iPhone 3GS",
  "iPhone3,1": "iPhone 4",
  "iPhone3,2": "iPhone 4 GSM Rev A",
  "iPhone3,3": "iPhone 4 CDMA",
  "iPhone4,1": "iPhone 4S",
  "iPhone5,1": "iPhone 5 (GSM)",
  "iPhone5,2": "iPhone 5 (GSM+CDMA)",
  "iPhone5,3": "iPhone 5C (GSM)",
  "iPhone5,4": "iPhone 5C (Global)",
  "iPhone6,1": "iPhone 5S (GSM)",
  "iPhone6,2": "iPhone 5S (Global)",
  "iPhone7,1": "iPhone 6 Plus",
  "iPhone7,2": "iPhone 6",
  "iPhone8,1": "iPhone 6s",
  "iPhone8,2": "iPhone 6s Plus",
  "iPhone8,4": "iPhone SE (GSM)",
  "iPhone9,1": "iPhone 7",
  "iPhone9,2": "iPhone 7 Plus",
  "iPhone9,3": "iPhone 7",
  "iPhone9,4": "iPhone 7 Plus",
  "iPhone10,1": "iPhone 8",
  "iPhone10,2": "iPhone 8 Plus",
  "iPhone10,3": "iPhone X Global",
  "iPhone10,4": "iPhone 8",
  "iPhone10,5": "iPhone 8 Plus",
  "iPhone10,6": "iPhone X GSM",
  "iPhone11,2": "iPhone XS",
  "iPhone11,4": "iPhone XS Max",
  "iPhone11,6": "iPhone XS Max Global",
  "iPhone11,8": "iPhone XR",
  "iPhone12,1": "iPhone 11",
  "iPhone12,3": "iPhone 11 Pro",
  "iPhone12,5": "iPhone 11 Pro Max",
  "iPhone12,8": "iPhone SE 2nd Gen",
  "iPhone13,1": "iPhone 12 Mini",
  "iPhone13,2": "iPhone 12",
  "iPhone13,3": "iPhone 12 Pro",
  "iPhone13,4": "iPhone 12 Pro Max",
  "iPhone14,2": "iPhone 13 Pro",
  "iPhone14,3": "iPhone 13 Pro Max",
  "iPhone14,4": "iPhone 13 Mini",
  "iPhone14,5": "iPhone 13",
  "iPhone14,6": "iPhone SE 3rd Gen",
  "iPhone14,7": "iPhone 14",
  "iPhone14,8": "iPhone 14 Plus",
  "iPhone15,2": "iPhone 14 Pro",
  "iPhone15,3": "iPhone 14 Pro Max",
};

const replacer = (value) => (productsDict[value] == null ? value : productsDict[value].replace(",", "_"));

function extractDictContents(str) {
  const dictRegex = /<dict>(.*?)<\/dict>/s;
  const match = str.match(dictRegex);
  if (match) {
    return match[1];
  } else {
    return null;
  }
}

function decodeBase64ToUTF8(encodedText) {
  // Split the encoded text into Base64 and non-Base64 parts
  const parts = encodedText.split(/([^A-Za-z0-9+/=]+)/);

  // Map over the parts, decoding the Base64 parts and leaving the non-Base64 parts as-is
  const decodedParts = parts.map((part) => {
    if (/^[A-Za-z0-9+/=]+$/.test(part)) {
      try {
        return atob(part);
      } catch (error) {
        // console.warn("Failed to decode Base64 string:", part, error);
        return part;
      }
    } else {
      return part;
    }
  });

  // Join the parts back together into a single string
  const decodedText = decodedParts.join("");

  // Convert the decoded text to UTF-8

  return decodedText;
}

function updateKeysToExtract() {
  let keys = document.getElementById("keys").value.split("\n");
  keys = keys.map((key) => key.trim());
  keys = keys.filter((key) => key !== "");
  keysToExtract = keys;
}

async function handleText(e, fname) {
  const text = e.target.result;
  const dictContents = extractDictContents(text);
  if (dictContents) {
    const decoded = decodeBase64ToUTF8(dictContents);
    let row = { filename: fname };
    for (let key of keysToExtract) {
      if (key === "") continue;
      row[key] = getTagValue(key, decoded);
    }
    rows.push(row);
  }
}

function uploadAndDecodeFile() {
  const button = document.getElementById("button");
  const filesInput = document.getElementById("files");
  // disable button and change it to extracting...
  button.disabled = true;
  button.innerHTML = "Extracting...";
  for (let i = 0; i < filesInput.files.length; i++) {
    const reader = new FileReader();
    const fname = filesInput.files[i].name;
    const file = filesInput.files[i];
    reader.onload = async function (e) {
      await handleText(e, fname);
      if (i === filesInput.files.length - 1) {
        window.dispatchEvent(loopFinishedEvent);
      }
    };
    reader.readAsText(file);
  }
}

function getTagValue(keyName, xmlText) {
  xmlText = xmlText.replace(/\s/g, "");
  const regex = new RegExp(`<key>${keyName}<\/key>[\\s\\S]*?<string>(.*?)<\/string>`);
  const match = xmlText.match(regex);
  return replacer(match ? match[1] : "");
}

function convertToCSV(data) {
  const separator = ",";
  const keys = Object.keys(data[0]);
  const csv = [keys.join(separator)];
  data.forEach((item) => {
    const values = keys.map((key) => item[key]);
    csv.push(values.join(separator));
  });
  return csv.join("\n");
}

function downloadCSV(data, filename) {
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

window.addEventListener("loopFinished", function () {
  const button = document.getElementById("button");
  button.disabled = false;
  button.innerText = "Extract";
  console.log(rows);
  downloadCSV(rows, "extracted.csv");
});
