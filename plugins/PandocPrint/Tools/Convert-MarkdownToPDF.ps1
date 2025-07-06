# Script: Convert-MarkdownToPDF.ps1
# Author: Peter van de Pas
# Description: A PowerShell script to convert Markdown files to PDF using Pandoc.
# Usage: Convert-MarkdownToPDF.ps1 -InputPath "path\to\markdown\file.md" -UseCurrentDate "true" -TemplatePath "path\to\template.tex" -OutputPath "path\to\output\directory"

param(
    [string]$InputPath,
    [string]$UseCurrentDate,
    [string]$TemplatePath = "..\Templates\eisvogel.latex",
    [string]$OutputPath = "."
)

if (-not $UseCurrentDate -or $UseCurrentDate -eq "") {
    $UseCurrentDate = $false
} else {
    $UseCurrentDate = [System.Convert]::ToBoolean($UseCurrentDate)
}

if (-not $InputPath) {
    Write-Error "Please provide a directory path or a Markdown file path."
    exit 1
}
if (-not (Test-Path $InputPath)) {
    Write-Error "The path `'$InputPath`' does not exist."
    exit 1
}
if (-not (Test-Path $TemplatePath)) {
    Write-Error "The specified template `'$TemplatePath`' does not exist."
    exit 1
}
if (-not (Test-Path $OutputPath)) {
    Write-Error "The specified output path `'$OutputPath`' does not exist."
    exit 1
}

$TemplatePath = Resolve-Path $TemplatePath
Write-Host "Using template path: $TemplatePath"

$pandocPath = "pandoc"

# Get the directory of the current script
$scriptDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent

# General image folder (relative to script)
$ImagesPath = Resolve-Path (Join-Path $scriptDir "..\.media\Images")
$ImagesPath = $ImagesPath -replace '\\', '/'

# Lua filter path
$luaFilterPath = Join-Path -Path $scriptDir -ChildPath "meta-check.lua"

if (-not (Get-Command "pandoc" -ErrorAction SilentlyContinue)) {
    Write-Error "Pandoc is not installed or not in the PATH."
    exit 1
}

$MarkdownFiles = @()

# Determine if the input is a directory or a specific file
if (Test-Path -Path $InputPath -PathType Container) {
    $MarkdownFiles += Get-ChildItem -Path $InputPath -Filter "*.md" -Recurse
    $MarkdownFiles += Get-ChildItem -Path $InputPath -Filter "*.markdown" -Recurse
} elseif (Test-Path -Path $InputPath -PathType Leaf) {
    $MarkdownFiles += Get-Item $InputPath
}

foreach ($MarkdownFile in $MarkdownFiles) {
    $PdfFileName = $MarkdownFile.Name -replace '\.(md|markdown)$', '.pdf'
    $PdfPath = Join-Path -Path $OutputPath -ChildPath $PdfFileName

    try {
        $markdownDir = Split-Path $MarkdownFile.FullName -Parent
        $resourcePaths = "$ImagesPath;$markdownDir"

        $commandArgs = @(
            $MarkdownFile.FullName,
            '-o', $PdfPath,
            '--template', $TemplatePath,
            '--listing',
            "--resource-path=$resourcePaths"
        )

        if ($UseCurrentDate) {
            $commandArgs += '--lua-filter'
            $commandArgs += $luaFilterPath
        }

        & $pandocPath @commandArgs
        Write-Host "Successfully created PDF: $PdfPath"
    } catch {
        Write-Error "Failed to create PDF from Markdown file `'$($MarkdownFile.Name)`'. Error: $_"
    }
}
