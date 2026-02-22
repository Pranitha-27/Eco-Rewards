<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get and sanitize input
$username = trim($_POST['username'] ?? '');
$email    = trim($_POST['email']    ?? '');
$password = $_POST['password']             ?? '';

// Validate inputs
if (empty($username) || empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'All fields are required']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email format']);
    exit;
}

if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(['error' => 'Password must be at least 8 characters']);
    exit;
}

// Connect to database — use environment variables, not hardcoded values
$conn = new mysqli(
    getenv('DB_HOST') ?: 'localhost',
    getenv('DB_USER') ?: 'root',
    getenv('DB_PASS') ?: '',
    getenv('DB_NAME') ?: 'EcoRewards'
);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// ✅ SAFE: Check duplicates with prepared statements
$stmt = $conn->prepare("SELECT id FROM Users WHERE username = ? OR email = ?");
$stmt->bind_param("ss", $username, $email);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    http_response_code(409);
    echo json_encode(['error' => 'Username or email already exists']);
    exit;
}
$stmt->close();

// ✅ SAFE: Hash the password (never store plain text)
$hash = password_hash($password, PASSWORD_BCRYPT);

// ✅ SAFE: Insert with prepared statement
$stmt = $conn->prepare(
    "INSERT INTO Users (username, email, password_hash) VALUES (?, ?, ?)"
);
$stmt->bind_param("sss", $username, $email, $hash);

if ($stmt->execute()) {
    http_response_code(201);
    echo json_encode(['message' => 'Registration successful!']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Registration failed. Please try again.']);
}

$stmt->close();
$conn->close();
?>