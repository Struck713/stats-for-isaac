# Builds mod/lib/ssl.dll (LuaSec + static OpenSSL, 32-bit) and copies LuaSec's Lua files and a CA
# bundle next to it. Needs Visual Studio 2022 (C++ workload), CMake and git.
# The output is committed, so this only needs to be re-run to update LuaSec or OpenSSL.
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$vcpkg = Join-Path $here ".vcpkg"
$build = Join-Path $here ".build"
$lib = Join-Path (Split-Path $here -Parent) "lib"

if (-not (Test-Path (Join-Path $vcpkg "vcpkg.exe"))) {
  if (-not (Test-Path (Join-Path $vcpkg "bootstrap-vcpkg.bat"))) {
    if (Test-Path $vcpkg) { Remove-Item -Recurse -Force $vcpkg }
    git clone --depth 1 https://github.com/microsoft/vcpkg.git $vcpkg
    if ($LASTEXITCODE -ne 0) { throw "git clone vcpkg failed" }
  }
  & (Join-Path $vcpkg "bootstrap-vcpkg.bat") -disableMetrics
  if ($LASTEXITCODE -ne 0) { throw "vcpkg bootstrap failed" }
}

cmake -S $here -B $build -A Win32 `
  "-DCMAKE_TOOLCHAIN_FILE=$vcpkg\scripts\buildsystems\vcpkg.cmake" `
  "-DVCPKG_TARGET_TRIPLET=x86-windows-static-md" `
  "-DCMAKE_INSTALL_PREFIX=$lib"
if ($LASTEXITCODE -ne 0) { throw "cmake configure failed" }
cmake --build $build --config Release
if ($LASTEXITCODE -ne 0) { throw "cmake build failed" }
cmake --install $build --config Release
if ($LASTEXITCODE -ne 0) { throw "cmake install failed" }

Invoke-WebRequest -Uri "https://curl.se/ca/cacert.pem" -OutFile (Join-Path $lib "cacert.pem")
Write-Host "Built $lib\ssl.dll"
