<?php
// Minimal receiver for experiment.js. Expects JSON: { "filename": "...", "filedata": "<csv>" }
// Put this on your server and set SAVE_URL in experiment.js to its address.

// If the survey is hosted on a DIFFERENT domain than this script, uncomment
// and set the allowed origin:
// header("Access-Control-Allow-Origin: https://where-the-survey-is-hosted.com");
// header("Access-Control-Allow-Headers: Content-Type");
// if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { exit; }

$data_dir = __DIR__ . "/data/";  // must exist and be writable by the web server;
                                  // ideally place it outside the public web root

$input = json_decode(file_get_contents("php://input"), true);
if (!$input || !isset($input["filename"], $input["filedata"])) {
    http_response_code(400);
    exit("Bad request");
}

// Sanitize filename so nobody can write outside the data folder
$filename = preg_replace("/[^A-Za-z0-9_\-\.]/", "", basename($input["filename"]));
if (!preg_match("/\.csv$/", $filename)) {
    $filename .= ".csv";
}

if (file_put_contents($data_dir . $filename, $input["filedata"]) === false) {
    http_response_code(500);
    exit("Could not write file");
}

echo "ok";
