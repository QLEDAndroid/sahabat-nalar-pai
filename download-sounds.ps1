# Script 1-Klik Unduh Backsound Kahoot & Real Game SFX Asli (.mp3) dari Myinstants ke public\sounds\
# Jalankan di PowerShell pada folder proyek:
#   powershell -ExecutionPolicy Bypass -File .\download-sounds.ps1

$ErrorActionPreference = "Continue"
New-Item -ItemType Directory -Force -Path "public\sounds" | Out-Null

$targets = @{
    # Kuis & Proyektor Live
    "lobby-bgm.mp3"     = "https://www.myinstants.com/en/instant/kahoot-lobby-music-70588/"
    "quiz-bgm.mp3"      = "https://www.myinstants.com/en/instant/kahoot-lobby-music-70588/"
    "correct.mp3"       = "https://www.myinstants.com/en/instant/correct-answer-gameshow/"
    "wrong.mp3"         = "https://www.myinstants.com/en/instant/buzzer-89244/"
    "horn.mp3"          = "https://www.myinstants.com/en/instant/dj-airhorn/"
    "applause.mp3"      = "https://www.myinstants.com/en/instant/crowd-cheer-applause-73083/"
    "fanfare.mp3"       = "https://www.myinstants.com/en/instant/victory-fanfare-ffvii-79427/"

    # Real Arcade Game SFX (.mp3)
    "sfx-jump.mp3"      = "https://www.myinstants.com/en/instant/mario-jump/"
    "sfx-coin.mp3"      = "https://www.myinstants.com/en/instant/mario-coin-sound/"
    "sfx-laser.mp3"     = "https://www.myinstants.com/en/instant/laser-pew-pew-67772/"
    "sfx-explosion.mp3" = "https://www.myinstants.com/en/instant/vine-boom-explosion-6399/"
    "sfx-bounce.mp3"    = "https://www.myinstants.com/en/instant/mario-goomba-stomp-69987/"
    "sfx-brick.mp3"     = "https://www.myinstants.com/en/instant/minecraft-critical-hit-13556/"
    "sfx-hit.mp3"       = "https://www.myinstants.com/en/instant/minecraft-damage-6455/"
    "sfx-powerup.mp3"   = "https://www.myinstants.com/en/instant/mario-power-up/"
    "sfx-win.mp3"       = "https://www.myinstants.com/en/instant/super-mario-bros-level-complete-48335/"
    "sfx-gameover.mp3"  = "https://www.myinstants.com/en/instant/mario-bros-game-over/"
}

foreach ($entry in $targets.GetEnumerator()) {
    $outFile = Join-Path "public\sounds" $entry.Key
    $pageUrl = $entry.Value
    Write-Host "Mengambil $($entry.Key) dari $pageUrl ..." -ForegroundColor Cyan
    try {
        $html = (Invoke-WebRequest -Uri $pageUrl -UseBasicParsing -Headers @{ "User-Agent" = "Mozilla/5.0" }).Content
        if ($html -match '(/media/sounds/[^"''\s]+\.mp3)') {
            $mp3Url = "https://www.myinstants.com" + $Matches[1]
            Invoke-WebRequest -Uri $mp3Url -OutFile $outFile -UseBasicParsing -Headers @{ "User-Agent" = "Mozilla/5.0" }
            Write-Host "  OK -> $outFile" -ForegroundColor Green
        } else {
            Write-Host "  Gagal menemukan tautan MP3 pada halaman." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nSelesai! Refresh browser Anda untuk langsung mendengar seluruh Real SFX (.mp3) di game dan kuis." -ForegroundColor Green
