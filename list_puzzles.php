<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$puzzles = array();
foreach (glob("data/*.json") as $file) {
    $puzzles[] = basename($file, '.json');
}

echo json_encode(array("puzzles" => $puzzles));
?> 