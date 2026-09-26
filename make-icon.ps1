$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$size = 256
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::Transparent)

# --- rounded square, gray-blue gradient ---
$radius = 54
$d = $radius * 2
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddArc(0, 0, $d, $d, 180, 90)
$path.AddArc($size - $d, 0, $d, $d, 270, 90)
$path.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
$path.AddArc(0, $size - $d, $d, $d, 90, 90)
$path.CloseFigure()

$rect = [System.Drawing.Rectangle]::new(0, 0, $size, $size)
$from = [System.Drawing.Color]::FromArgb(255, 143, 163, 189)
$to = [System.Drawing.Color]::FromArgb(255, 43, 66, 92)
$grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $from, $to, 45)
$g.FillPath($grad, $path)

# --- soft light in the top-left corner ---
$light = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  [System.Drawing.Rectangle]::new(0, 0, $size, $size),
  [System.Drawing.Color]::FromArgb(46, 255, 255, 255),
  [System.Drawing.Color]::FromArgb(0, 255, 255, 255),
  45
)
$g.FillPath($light, $path)

# --- abstract mark: open ring (gap at the top) + center dot + satellite dot in the gap ---
$ink = [System.Drawing.Color]::FromArgb(242, 255, 255, 255)
$ringPen = New-Object System.Drawing.Pen($ink, 21)
$ringPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$ringPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$arc = [System.Drawing.RectangleF]::new(56, 56, 144, 144)
$g.DrawArc($ringPen, $arc, 350, 280)

$brush = New-Object System.Drawing.SolidBrush($ink)
$g.FillEllipse($brush, [System.Drawing.RectangleF]::new(96, 96, 64, 64))
$g.FillEllipse($brush, [System.Drawing.RectangleF]::new(161, 60, 26, 26))

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
