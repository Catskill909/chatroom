<?php
// Proxy script to bypass CORS restrictions for audio streaming

// Enable error logging for debugging
ini_set('log_errors', 1);
error_reporting(E_ALL);
ini_set('error_log', '/path/to/your/error.log'); // Specify the path to your error log file

// Allow unlimited execution time
set_time_limit(0);

// Disable output buffering
if (ob_get_level()) {
    ob_end_clean();
}

// Get the requested stream (e.g., 'OSS-320' or 'OSSlive')
$stream = isset($_GET['stream']) ? $_GET['stream'] : '';

if (!$stream) {
    header('HTTP/1.1 400 Bad Request');
    echo 'Stream not specified.';
    exit;
}

// Define the mapping of streams to their URLs
$streamUrls = [
    'OSS-320' => 'https://supersoul.site:8000/OSS-320',
    'OSSlive' => 'https://supersoul.site:8010/OSSlive',
];

// Check if the requested stream exists
if (!array_key_exists($stream, $streamUrls)) {
    header('HTTP/1.1 404 Not Found');
    echo 'Stream not found.';
    exit;
}

// Get the stream URL
$url = $streamUrls[$stream];

// Initialize cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_HEADER, false);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, false); // Important for streaming
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Adjust as needed
curl_setopt($ch, CURLOPT_USERAGENT, $_SERVER['HTTP_USER_AGENT']);
curl_setopt($ch, CURLOPT_BUFFERSIZE, 8192);
curl_setopt($ch, CURLOPT_TIMEOUT, 0); // No timeout for streaming

// Set the write function to output data as it is received
curl_setopt($ch, CURLOPT_WRITEFUNCTION, function ($ch, $data) {
    echo $data;
    flush();
    return strlen($data);
});

// Set headers to allow cross-origin requests
header('Access-Control-Allow-Origin: *'); // Adjust as per your CORS policy
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept');
header('Access-Control-Allow-Methods: GET, OPTIONS, HEAD');

// Set the appropriate Content-Type header for audio streaming
header('Content-Type: audio/mpeg'); // Adjust based on your stream's actual content type

// Disable caching
header('Cache-Control: no-cache');
header('Pragma: no-cache');

// Execute cURL
if (!curl_exec($ch)) {
    // cURL error occurred
    $error_msg = curl_error($ch);
    header('HTTP/1.1 502 Bad Gateway');
    echo 'Error fetching the stream: ' . $error_msg;
    curl_close($ch);
    exit;
}

curl_close($ch);
