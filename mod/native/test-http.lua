-- Exercises statsforisaac/http.lua with the game's LuaSocket and the bundled ssl.dll, outside of
-- the game. Run through test-http.ps1, which sets up package.path/cpath.
local socket = require("socket")
local ssl = require("ssl")
local Http = require("statsforisaac.http")
Http.init(socket, ssl, os.getenv("SFI_MOD_LIB") .. "cacert.pem")

local function fetch(url)
  local req = Http.request({ method = "GET", url = url })
  while not req.done do
    Http.step(req)
    socket.sleep(0.005)
  end
  return req
end

local failures = 0
local function check(name, ok, detail)
  print((ok and "PASS " or "FAIL ") .. name .. (detail and ("  (" .. detail .. ")") or ""))
  if not ok then
    failures = failures + 1
  end
end

local good = fetch("https://example.com/")
check("https GET example.com", good.status == 200 and good.body:find("Example Domain") ~= nil,
  good.err or ("status " .. tostring(good.status)))

local wrongHost = fetch("https://wrong.host.badssl.com/")
check("rejects wrong host", wrongHost.err ~= nil, wrongHost.err)

local expired = fetch("https://expired.badssl.com/")
check("rejects expired cert", expired.err ~= nil, expired.err)

local plain = fetch("http://example.com/")
check("rejects plain http to a remote host", plain.err ~= nil, plain.err)

os.exit(failures == 0 and 0 or 1)
