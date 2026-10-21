# Runs test-http.lua with the test lua.exe from build.ps1, loading Lua5.3.3r.dll and LuaSocket from
# the game install, the same way the mod does in game.
param(
  [string]$GameDir = "C:\Program Files (x86)\Steam\steamapps\common\The Binding of Isaac Rebirth"
)
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$mod = (Split-Path $here -Parent) -replace "\\", "/"
$scripts = (Join-Path $GameDir "resources\scripts") -replace "\\", "/"
$exe = Join-Path $here ".build\Release\luatest.exe"
if (-not (Test-Path $exe)) { throw "Run build.ps1 first" }

$env:PATH = "$GameDir;$env:PATH"
$env:LUA_PATH = "$mod/?.lua;$mod/lib/?.lua;$scripts/?.lua"
$env:LUA_CPATH = "$mod/lib/?.dll;$scripts/?.dll"
$env:SFI_MOD_LIB = "$mod/lib/"
& $exe (Join-Path $here "test-http.lua")
exit $LASTEXITCODE
