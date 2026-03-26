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

    $resolvedBasePath = (Resolve-Path -LiteralPath $BasePath).Path.TrimEnd([char[]]@('\', '/'))
    $resolvedTargetPath = (Resolve-Path -LiteralPath $TargetPath).Path

    if (-not $resolvedTargetPath.StartsWith($resolvedBasePath, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Target path '$resolvedTargetPath' is not inside base path '$resolvedBasePath'."
    }

    $relativePath = $resolvedTargetPath.Substring($resolvedBasePath.Length).TrimStart([char[]]@('\', '/'))

    if ([string]::IsNullOrWhiteSpace($relativePath)) {
        return "."
    }

    return $relativePath
}

function Get-DefaultTitle {
    param(
        [Parameter(Mandatory = $true)][string]$Name
    )

    $title = $Name -replace "[-_]+", " "
    return (Get-Culture).TextInfo.ToTitleCase($title)
}

function Get-Segments {
    param(
        [Parameter(Mandatory = $true)][string]$DirectoryPath,
        [Parameter(Mandatory = $true)][string]$ResolvedContentRoot
    )

    return @(
        (Get-RelativePath -BasePath $ResolvedContentRoot -TargetPath $DirectoryPath) -split "[\\/]" |
            Where-Object { $_ -and $_ -ne "." }
    )
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$resolvedContentRoot = Join-Path $projectRoot $ContentRoot
$resolvedOutputFile = Join-Path $projectRoot $OutputFile

if (-not (Test-Path -LiteralPath $resolvedContentRoot)) {
    throw "Content folder not found: $resolvedContentRoot"
}

$htmlFiles = Get-ChildItem -Path $resolvedContentRoot -Filter *.html -Recurse -File
$externalLinkFiles = Get-ChildItem -Path $resolvedContentRoot -Filter *.link.json -Recurse -File

$items = @()

foreach ($file in ($htmlFiles | Sort-Object FullName)) {
    $relativePath = (Get-RelativePath -BasePath $projectRoot -TargetPath $file.FullName).Replace("\", "/")
    $segments = Get-Segments -DirectoryPath $file.DirectoryName -ResolvedContentRoot $resolvedContentRoot

    $html = Get-Content -LiteralPath $file.FullName -Raw
    $titleMatch = [System.Text.RegularExpressions.Regex]::Match($html, "<title>(.*?)</title>", "IgnoreCase, Singleline")
    $defaultTitle = Get-DefaultTitle -Name ([System.IO.Path]::GetFileNameWithoutExtension($file.Name))
    $title = if ($titleMatch.Success -and $titleMatch.Groups[1].Value.Trim()) {
        $titleMatch.Groups[1].Value.Trim()
    } else {
        $defaultTitle
    }

    $items += [PSCustomObject]@{
        title = $title
        path = $relativePath
        displayPath = $relativePath
        kind = "file"
        target = "_self"
        segments = @($segments)
        updatedAt = $file.LastWriteTimeUtc.ToString("o")
    }
}

foreach ($file in ($externalLinkFiles | Sort-Object FullName)) {
    $relativePath = (Get-RelativePath -BasePath $projectRoot -TargetPath $file.FullName).Replace("\", "/")
    $segments = Get-Segments -DirectoryPath $file.DirectoryName -ResolvedContentRoot $resolvedContentRoot
    $linkData = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json

    if (-not $linkData.url) {
        throw "External link file is missing 'url': $relativePath"
    }

    $defaultTitle = Get-DefaultTitle -Name (($file.BaseName -replace "\.link$", ""))
    $title = if ($linkData.title) { [string]$linkData.title } else { $defaultTitle }
    $description = if ($linkData.description) { [string]$linkData.description } else { "Hosted externally" }

    $items += [PSCustomObject]@{
        title = $title
        path = [string]$linkData.url
        displayPath = $description
        kind = "external"
        target = "_blank"
        sourceFile = $relativePath
        segments = @($segments)
        updatedAt = $file.LastWriteTimeUtc.ToString("o")
    }
}

$items = @($items | Sort-Object { $_.segments -join "/" }, title)

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
