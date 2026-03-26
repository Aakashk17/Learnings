[CmdletBinding()]
param(
    [string]$ContentRoot = "content",
    [string]$OutputFile = "content/manifest.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RelativePath {
    param(
        [Parameter(Mandatory = $true)][string]$BasePath,
        [Parameter(Mandatory = $true)][string]$TargetPath
    )

    $resolvedBasePath = (Resolve-Path -LiteralPath $BasePath).Path.TrimEnd("\\")
    $resolvedTargetPath = (Resolve-Path -LiteralPath $TargetPath).Path

    if (-not $resolvedTargetPath.StartsWith($resolvedBasePath, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Target path '$resolvedTargetPath' is not inside base path '$resolvedBasePath'."
    }

    $relativePath = $resolvedTargetPath.Substring($resolvedBasePath.Length).TrimStart("\\")

    if ([string]::IsNullOrWhiteSpace($relativePath)) {
        return "."
    }

    return $relativePath
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$resolvedContentRoot = Join-Path $projectRoot $ContentRoot
$resolvedOutputFile = Join-Path $projectRoot $OutputFile

if (-not (Test-Path -LiteralPath $resolvedContentRoot)) {
    throw "Content folder not found: $resolvedContentRoot"
}

$contentFiles = Get-ChildItem -Path $resolvedContentRoot -Filter *.html -Recurse -File |
    Sort-Object FullName

$items = foreach ($file in $contentFiles) {
    $relativePath = (Get-RelativePath -BasePath $projectRoot -TargetPath $file.FullName).Replace("\", "/")
    $segments = (Get-RelativePath -BasePath $resolvedContentRoot -TargetPath $file.DirectoryName) -split "[\\/]" |
        Where-Object { $_ -and $_ -ne "." }

    $html = Get-Content -LiteralPath $file.FullName -Raw
    $titleMatch = [System.Text.RegularExpressions.Regex]::Match($html, "<title>(.*?)</title>", "IgnoreCase, Singleline")
    $defaultTitle = [System.IO.Path]::GetFileNameWithoutExtension($file.Name) -replace "[-_]+", " "
    $defaultTitle = (Get-Culture).TextInfo.ToTitleCase($defaultTitle)
    $title = if ($titleMatch.Success -and $titleMatch.Groups[1].Value.Trim()) {
        $titleMatch.Groups[1].Value.Trim()
    } else {
        $defaultTitle
    }

    [PSCustomObject]@{
        title = $title
        path = $relativePath
        segments = @($segments)
        updatedAt = $file.LastWriteTimeUtc.ToString("o")
    }
}

$manifest = [PSCustomObject]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    itemCount = @($items).Count
    items = @($items)
}

$outputDirectory = Split-Path -Parent $resolvedOutputFile
if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory | Out-Null
}

$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $resolvedOutputFile -Encoding UTF8
Write-Host "Manifest written to $resolvedOutputFile"


