<?php
/**
 * TMMS AI Training Monitor — API
 * Reads results.csv + training log to expose live training data as JSON.
 * Includes CPU usage (Windows) and epoch time estimates.
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$CSV_PATH     = 'C:/xampp/htdocs/GOVSERVE/tmms/apps/ai-service/models/tl_violation_runs/rtl_v1/results.csv';
$LOG_PATH     = 'C:/Users/USER/.gemini/antigravity-ide/brain/437a6b97-5de4-4594-bbe3-7919d66b93ad/.system_generated/tasks/task-1134.log';
$TIMING_PATH  = __DIR__ . '/epoch_timing.json';

// ── Parse results.csv ──────────────────────────────────────────────────────
$epochs = [];
if (file_exists($CSV_PATH)) {
    $lines = file($CSV_PATH, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    // first line is header
    for ($i = 1; $i < count($lines); $i++) {
        $cols = array_map('trim', str_getcsv($lines[$i]));
        if (count($cols) < 8 || !is_numeric($cols[0])) continue;
        $epochs[] = [
            'epoch'     => (int)$cols[0],
            'box_loss'  => (float)$cols[1],
            'cls_loss'  => (float)$cols[2],
            'dfl_loss'  => (float)$cols[3],
            'precision' => round((float)$cols[4] * 100, 2),
            'recall'    => round((float)$cols[5] * 100, 2),
            'map50'     => round((float)$cols[6] * 100, 2),
            'map50_95'  => round((float)$cols[7] * 100, 2),
        ];
    }
}

// ── Parse live progress from log ──────────────────────────────────────────
$live = [
    'current_epoch' => count($epochs),
    'batch'         => 0,
    'total_batches' => 1061,
    'pct'           => 0,
    'status'        => 'idle',
    'eta'           => '',
];

if (file_exists($LOG_PATH)) {
    // Read last 8 KB of log to find latest progress line
    $fh   = fopen($LOG_PATH, 'rb');
    $size = filesize($LOG_PATH);
    fseek($fh, max(0, $size - 8192));
    $tail = fread($fh, 8192);
    fclose($fh);

    // Match pattern like:  6/60         0G      1.168     0.9403      1.495          9        640:   0%|          | 1/62 [...]
    $pattern = '/(\d+)\/60\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+(\d+)%\|[^\|]*\|\s*(\d+)\/(\d+)\s+\[([^\]]+)\]/';
    if (preg_match_all($pattern, $tail, $m)) {
        $last = count($m[0]) - 1;
        $live['current_epoch'] = (int)$m[1][$last];
        $live['pct']           = (int)$m[2][$last];
        $live['batch']         = (int)$m[3][$last];
        $live['total_batches'] = (int)$m[4][$last];
        $live['eta']           = $m[5][$last];
        $live['status']        = 'training';
    }

    // Check if in validation phase
    if (preg_match('/Box\(P\s+R\s+mAP50/', $tail)) {
        $live['status'] = 'validating';
        $live['current_epoch'] = count($epochs) + 1;
        $val_pattern = '/:\s+(\d+)%\|[^\|]*\|\s*(\d+)\/(\d+)\s+\[([^\]]+)\]/';
        if (preg_match_all($val_pattern, $tail, $vm)) {
            $last = count($vm[0]) - 1;
            $live['pct']           = (int)$vm[1][$last];
            $live['batch']         = (int)$vm[2][$last];
            $live['total_batches'] = (int)$vm[3][$last];
            $live['eta']           = $vm[4][$last];
        }
    }
}

// ── Determine if done ────────────────────────────────────────────────────
$live['completed'] = count($epochs) >= 60;
$live['total_completed'] = count($epochs);

function get_server_cpu_usage(){
    $cmd = "wmic cpu get loadpercentage";
    @exec($cmd, $output);
    if($output){
        foreach($output as $line){
            if($line && preg_match("/^[0-9]+$/", trim($line))){
                return (int)trim($line);
            }
        }
    }
    return 0;
}
$live['cpu'] = get_server_cpu_usage();

echo json_encode([
    'epochs' => $epochs,
    'live'   => $live,
    'target' => 60,
    'updated_at' => date('Y-m-d H:i:s'),
]);
