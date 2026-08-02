$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$size = 256
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::Transparent)

# --- rounded rect background with gradient (green -> blue) ---
$radius = 54
$d = $radius * 2
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddArc(0, 0, $d, $d, 180, 90)
$path.AddArc($size - $d, 0, $d, $d, 270, 90)
$path.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
$path.AddArc(0, $size - $d, $d, $d, 90, 90)
$path.CloseFigure()

$rect = [System.Drawing.Rectangle]::new(0, 0, $size, $size)
$grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, [System.Drawing.Color]::FromArgb(255, 46, 125, 50), [System.Drawing.Color]::FromArgb(255, 21, 101, 192), 55)
$g.FillPath($grad, $path)

# --- coin ---
$coin = [System.Drawing.RectangleF]::new(70, 46, 116, 116)
$white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
$g.FillEllipse($white, $coin)
$gold = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 198, 156, 44), 9)
$g.DrawEllipse($gold, $coin)

# --- ruble sign ---
$font = New-Object System.Drawing.Font('Segoe UI', 66, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = [System.Drawing.StringAlignment]::Center
$fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
$blue = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 21, 101, 192))
$textRect = [System.Drawing.RectangleF]::new(70, 52, 116, 104)
$g.DrawString([char]0x20BD, $font, $blue, $textRect, $fmt)

# --- growth / forecast line ---
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(235, 255, 255, 255), 11)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$line = @(
  [System.Drawing.Point]::new(58, 212),
  [System.Drawing.Point]::new(96, 194),
  [System.Drawing.Point]::new(128, 204),
  [System.Drawing.Point]::new(168, 174),
  [System.Drawing.Point]::new(202, 142)
)
$g.DrawLines($pen, $line)
$head = @(
  [System.Drawing.Point]::new(202, 142),
  [System.Drawing.Point]::new(182, 138),
  [System.Drawing.Point]::new(202, 142),
  [System.Drawing.Point]::new(198, 160)
)
$g.DrawLines($pen, $head)

$g.Dispose()

$pngPath = Join-Path $PSScriptRoot 'fin.png'
$icoPath = Join-Path $PSScriptRoot 'fin.ico'
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

# --- build .ico from PNG entries ---
$sizes = @(256, 64, 48, 32, 16)
$images = @()
foreach ($s in $sizes) {
  $src = [System.Drawing.Image]::FromFile($pngPath)
  $dst = New-Object System.Drawing.Bitmap($s, $s)
  $g2 = [System.Drawing.Graphics]::FromImage($dst)
  $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g2.Clear([System.Drawing.Color]::Transparent)
  $g2.DrawImage($src, 0, 0, $s, $s)
  $ms = New-Object System.IO.MemoryStream
  $dst.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $images += , $ms.ToArray()
  $g2.Dispose(); $dst.Dispose(); $src.Dispose(); $ms.Dispose()
}

$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)
$bw.Write([UInt16]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]$images.Count)
$offset = 6 + 16 * $images.Count
for ($i = 0; $i -lt $images.Count; $i++) {
  $s = $sizes[$i]
  $b = if ($s -ge 256) { 0 } else { $s }
  $bw.Write([Byte]$b)
  $bw.Write([Byte]$b)
  $bw.Write([Byte]0)
  $bw.Write([Byte]0)
  $bw.Write([UInt16]1)
  $bw.Write([UInt16]32)
  $bw.Write([UInt32]$images[$i].Length)
  $bw.Write([UInt32]$offset)
  $offset += $images[$i].Length
}
foreach ($img in $images) { $bw.Write($img) }
$bw.Flush()
[System.IO.File]::WriteAllBytes($icoPath, $ms.ToArray())
$bw.Dispose(); $ms.Dispose()

Remove-Item -LiteralPath $pngPath -Force
Write-Output "ICO: $icoPath ($([math]::Round((Get-Item -LiteralPath $icoPath).Length / 1024, 1)) KB)"
