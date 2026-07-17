@echo off
setlocal
if defined npm_node_execpath (
  "%npm_node_execpath%" "%~dp0dev.mjs"
  exit /b %ERRORLEVEL%
)
node "%~dp0dev.mjs"
