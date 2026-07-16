<?php
// Database configuration
$host = 'localhost';
$dbname = 'grocery_store';
$username = 'root'; // Change this to your database username
$password = ''; // Change this to your database password

try {
    // Create a PDO instance
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    
    // Set the PDO error mode to exception
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Set default fetch mode to associative array
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    
} catch(PDOException $e) {
    // Display error message
    echo "Connection failed: " . $e->getMessage();
    die();
}
?> 