const dbName = 'cordisDB';
const dbVersion = 1;

let db;
let pipe;
let currentQueryEmbedding
let cordis
let rcn_title_teaser

// Open or create an IndexedDB database
const openDBRequest = indexedDB.open(dbName, dbVersion);

openDBRequest.onsuccess = function (event) {
    db = event.target.result;
    const jsonGzUrl = 'filename_mean_embedding_prec_2_records.json.gz';

    loadAndExtractJSON(jsonGzUrl, (jsonObject) => {
        cordis = jsonObject;
        fetchUnzip("rcn_title_teaser.json.gz");
        console.log("successfully loaded");
        activateSubmitButton();
    });
};

openDBRequest.onerror = function (event) {
    console.error('Error opening database:', event.target.error);
};

openDBRequest.onupgradeneeded = function (event) {
    // Create an object store if it doesn't exist
    const database = event.target.result;
    if (!database.objectStoreNames.contains('cordisStore')) {
        const objectStore = database.createObjectStore('cordisStore', { keyPath: 'id' });
    }
};

function fetchUnzip(){
    fetch(url)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.arrayBuffer(); // Get the response as an ArrayBuffer
                })
                .then((gzippedData) => {
                    // Decompress the gzipped data using pako
                    console.log("gzipped file loaded, start decompression");
                    const jsonString = pako.inflate(new Uint8Array(gzippedData), { to: 'string' });

                    // Parse the JSON string into an object
                    const jsonObject = JSON.parse(jsonString);

                    // Cache the unzipped JSON data in IndexedDB
                    const transaction = db.transaction(['cordisStore'], 'readwrite');
                    const objectStore = transaction.objectStore('cordisStore');
                    objectStore.put({ id: 'cachedCordisJSON', data: jsonObject });

                    // Callback with the extracted JSON object
                    callback(jsonObject);
                })
                .catch((error) => {
                    console.error('Error loading or extracting JSON.gz:', error);
                });
}

// Function to load and extract JSON
function loadAndExtractJSON(url, callback) {
    if (!db) {
        console.error('IndexedDB is not yet ready. Please wait for the database to open.');
        return;
    }

    // Check if the JSON data is already cached in IndexedDB
    const transaction = db.transaction(['cordisStore'], 'readonly');
    const objectStore = transaction.objectStore('cordisStore');
    const getRequest = objectStore.get('cachedCordisJSON');

    getRequest.onsuccess = function (event) {
        const cachedData = event.target.result;
        if (cachedData) {
            callback(cachedData.data);
        } else {
            // Fetch the .json.gz file if not cached
            fetch(url)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.arrayBuffer(); // Get the response as an ArrayBuffer
                })
                .then((gzippedData) => {
                    // Decompress the gzipped data using pako
                    console.log("gzipped file loaded, start decompression");
                    const jsonString = pako.inflate(new Uint8Array(gzippedData), { to: 'string' });

                    // Parse the JSON string into an object
                    const jsonObject = JSON.parse(jsonString);

                    // Cache the unzipped JSON data in IndexedDB
                    const transaction = db.transaction(['cordisStore'], 'readwrite');
                    const objectStore = transaction.objectStore('cordisStore');
                    objectStore.put({ id: 'cachedCordisJSON', data: jsonObject });

                    // Callback with the extracted JSON object
                    callback(jsonObject);
                })
                .catch((error) => {
                    console.error('Error loading or extracting JSON.gz:', error);
                });
        }

    };

    getRequest.onerror = function (event) {
        console.error('Error retrieving data from IndexedDB:', event.target.error);
    };
}

function fetchUnzip(url){
    fetch(url=url)
        .then((response) => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.arrayBuffer(); // Get the response as an ArrayBuffer
        })
        .then((gzippedData) => {
            // Decompress the gzipped data using pako
            console.log("rcn info file loaded, start decompression");
            const jsonString = pako.inflate(new Uint8Array(gzippedData), { to: 'string' });

            // Parse the JSON string into an object
            const jsonObject = JSON.parse(jsonString);

            // Callback with the extracted JSON object
            console.log("rcn info file decompressed");
            rcn_title_teaser = jsonObject
            return jsonObject;
        })
        .catch((error) => {
            console.error('Error loading or extracting JSON.gz:', error);
        });
}

////////////////////////////////////////////////////

function downloadPage() {
    var url = window.location.href;
    var a = document.createElement('a');
    a.download = 'download.html';
    a.href = url;
    a.click();
}

function activateSubmitButton() {
    // get references to the loading element and submit button
    const loadingElement = document.getElementById("loading");
    const submitButton = document.getElementById("submit_button");

    // remove the loading element and enable the submit button
    if (loadingElement) {
        loadingElement.remove();
    }

    if (submitButton) {
        submitButton.removeAttribute("disabled");
        submitButton.textContent = "Submit";
    }
}

async function main() {
    pipe = await pipeline("embeddings", "sentence-transformers/all-MiniLM-L6-v2");
}

main();

async function sendRequest() {
    const table = document.getElementById("results-table");

    // Clear the existing table content
    while (table.rows.length > 0) {
        table.deleteRow(0);
    }

    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => setTimeout(resolve, 0));

    let checkbox = document.getElementById("earth-observation-checkbox");

    // Get the input text value
    let inputText = document.getElementById("input-text").value.trim();

    // Check if the checkbox is checked
    if (checkbox.checked) {
        // Append "test" to the input text
        inputText += " Earth Observation";
    }
    console.log(inputText)

    if (inputText !== "") {
        let output = await pipe(inputText);
        currentQueryEmbedding = output.data
        const topResults = calculateSimilarity(currentQueryEmbedding, cordis);

        // Make the table visible
        table.style.display = "table";

        // Create table header
        const headerRow = table.insertRow(0);
        const headerCells = ["No", "Type", "RCN", "RCN Title", "RCN Teaser", "ID", "Cordis Link", "Document Weblink", "Score"];

        for (let i = 0; i < headerCells.length; i++) {
            const cell = document.createElement("th"); // Use <th> for table headers
            cell.textContent = headerCells[i];
            headerRow.appendChild(cell);
        }

        // Populate the table with the top N entries
        for (let i = 0; i < topResults.length; i++) {
            const tableBody = document.getElementById("results-table-body");
            const row = tableBody.insertRow(i + 1);
            const entry = topResults[i];

            // Split the filename and extract relevant information
            const filenameParts = entry.filename.replace("_pdf", "").split("_");
            const type = filenameParts[0];
            const rcn = filenameParts[2];
            const id = filenameParts[filenameParts.length - 1].split(".")[0];
            let weblink;

            // Check the type and construct the appropriate weblink
            if (type === "project") {
                weblink = `Link not available - go to RCN results section`;
            } else if (type === "article") {
                weblink = `https://op.europa.eu/en/publication-detail/-/publication/${id}`;
            } else if (type === "result") {
                weblink = `https://ec.europa.eu/research/participants/documents/downloadPublic?documentIds=${id}&appId=PPGMS`;
            } else {
                // Handle the case when the type is not recognized
                weblink = "Type not recognized";
            }

            const score = entry.similarity.toFixed(3);

            // Create Cordis Link based on document type
            let cordisLink = "";
            if (type === "result") {
                cordisLink = `https://cordis.europa.eu/project/rcn/${rcn}`;
            } else if (type === "article") {
                cordisLink = `https://cordis.europa.eu/article/rcn/${rcn}`;
            } else if (type === "project") {
                cordisLink = `https://cordis.europa.eu/project/rcn/${rcn}`;

            } else if (type === "programme") {
                cordisLink = `https://cordis.europa.eu/programme/${rcn}`;
            }

            const this_rcn_title_teaser = rcn_title_teaser[parseInt(rcn)] || {};

            let rcn_title = this_rcn_title_teaser.Title || "";
            let rcn_teaser = this_rcn_title_teaser.Teaser || "";

            // Insert data into table cells
            const cells = [i + 1, type, rcn,rcn_title,rcn_teaser, id, cordisLink, weblink, score];
            for (let j = 0; j < cells.length; j++) {
                const cell = row.insertCell(j);
                cell.textContent = cells[j];
            }

            // Get all td elements within the table
            const tdElements = document.querySelectorAll('table td');

            // Loop through each td element
            tdElements.forEach(td => {
                const text = td.textContent;

                // Check if the content of the td element looks like a URL
                if (isURL(text)) {
                    // Create an anchor element
                    const anchor = document.createElement('a');
                    anchor.href = text;
                    anchor.textContent = text;
                    anchor.target = "_blank";

                    // Replace the td content with the anchor element
                    td.innerHTML = '';
                    td.appendChild(anchor);
                }
            });

            // Function to check if a string looks like a URL
            function isURL(str) {
                const urlPattern = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
                return urlPattern.test(str);
            }
        }
    }
}

const logTimestamp = () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ') + '.' + String(new Date().getMilliseconds()).padStart(3, '0');
    console.log(timestamp);
  };
  
let currentQueryEmbeddingMagnitude

// Calculate cosine similarity between two vectors
function cosineSimilarity(vectorA, vectorB) {
    const dotProduct = vectorA.reduce((acc, val, i) => acc + val * vectorB[i], 0);
    const magnitudeB = Math.sqrt(vectorB.reduce((acc, val) => acc + val ** 2, 0));
    return dotProduct / (currentQueryEmbeddingMagnitude * magnitudeB);
}
  
function calculateSimilarity(currentQueryEmbedding, jsonData) {
    logTimestamp()

    currentQueryEmbeddingMagnitude = Math.sqrt(currentQueryEmbedding.reduce((acc, val) => acc + val ** 2, 0));

    // Calculate similarity scores for each entry in jsonData
    const similarityScores = jsonData.map(entry => ({
        filename: entry.filename,
        similarity: cosineSimilarity(currentQueryEmbedding, entry.mean_embedding),
    }));

    logTimestamp()

    // Sort the entries by similarity in descending order
    similarityScores.sort((a, b) => b.similarity - a.similarity);

    logTimestamp()

    // Return the top N entries
    const numResultsInput = document.getElementById("num-results").value;
    const numResults = parseInt(numResultsInput);
    const topResults = similarityScores.slice(0, numResults);

    // Log the top N entries to the console
    console.log(topResults);

    return topResults;
}
