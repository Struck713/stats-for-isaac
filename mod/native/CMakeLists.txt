# Builds LuaSec as a single 32-bit ssl.dll that loads into Isaac's Lua (Lua5.3.3r.dll), with
# OpenSSL linked statically so the mod doesn't have to ship any other DLLs. Run build.ps1 rather
# than invoking this directly.
cmake_minimum_required(VERSION 3.24)
project(statsforisaac_ssl C)

if(NOT CMAKE_SIZEOF_VOID_P EQUAL 4)
  message(FATAL_ERROR "Isaac is a 32-bit process; configure with -A Win32")
endif()

include(FetchContent)
FetchContent_Declare(lua
  URL https://www.lua.org/ftp/lua-5.3.3.tar.gz
  URL_HASH SHA256=5113c06884f7de453ce57702abaac1d618307f33f6789fa870e87a59d772aca2
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE)
FetchContent_Declare(luasec
  URL https://github.com/lunarmodules/luasec/archive/refs/tags/v1.3.2.tar.gz
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE)
FetchContent_Populate(lua)
FetchContent_Populate(luasec)

find_package(OpenSSL REQUIRED)

# Import library for the game's Lua DLL, generated from its export list (lua53.def).
set(LUA_IMPLIB ${CMAKE_BINARY_DIR}/Lua5.3.3r.lib)
add_custom_command(OUTPUT ${LUA_IMPLIB}
  COMMAND ${CMAKE_AR} /nologo /machine:x86 /def:${CMAKE_SOURCE_DIR}/lua53.def /out:${LUA_IMPLIB}
  DEPENDS ${CMAKE_SOURCE_DIR}/lua53.def)
add_custom_target(lua_implib DEPENDS ${LUA_IMPLIB})
add_library(lua53 SHARED IMPORTED)
set_target_properties(lua53 PROPERTIES
  IMPORTED_IMPLIB ${LUA_IMPLIB}
  INTERFACE_INCLUDE_DIRECTORIES ${lua_SOURCE_DIR}/src)
add_dependencies(lua53 lua_implib)

set(SEC ${luasec_SOURCE_DIR}/src)
add_library(ssl SHARED
  ${SEC}/config.c ${SEC}/context.c ${SEC}/ec.c ${SEC}/options.c ${SEC}/ssl.c ${SEC}/x509.c
  ${SEC}/luasocket/buffer.c ${SEC}/luasocket/io.c ${SEC}/luasocket/timeout.c
  ${SEC}/luasocket/wsocket.c)
target_include_directories(ssl PRIVATE ${SEC})
target_compile_definitions(ssl PRIVATE
  WIN32 WIN32_LEAN_AND_MEAN _CRT_SECURE_NO_WARNINGS _WINSOCK_DEPRECATED_NO_WARNINGS
  WITH_LUASOCKET LUASOCKET_DEBUG)
target_link_libraries(ssl PRIVATE lua53 OpenSSL::SSL OpenSSL::Crypto ws2_32 crypt32 user32 advapi32)
# Same CRT as the game's socket/core.dll (dynamic VCRUNTIME140).
set_property(TARGET ssl PROPERTY MSVC_RUNTIME_LIBRARY "MultiThreadedDLL")

install(TARGETS ssl RUNTIME DESTINATION .)
install(FILES ${SEC}/ssl.lua DESTINATION .)

# A lua.exe linked against the same Lua5.3.3r.dll as the game, for testing the networking code
# outside of Isaac (see test-http.ps1). Not installed.
add_executable(luatest ${lua_SOURCE_DIR}/src/lua.c)
target_link_libraries(luatest PRIVATE lua53)
set_property(TARGET luatest PROPERTY MSVC_RUNTIME_LIBRARY "MultiThreadedDLL")
