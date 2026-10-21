-- Minimal non-blocking HTTP/1.1 client over LuaSocket, with LuaSec for https. The game ships
-- LuaSocket without ltn12/mime, so socket.http can't be loaded.
--
-- A request runs in a coroutine that yields whenever the socket would block. Http.step(req) is
-- called once per frame to advance it; req.done is set when it finishes, with either
-- req.status/req.body or req.err.
local Http = {}

local socket, ssl, cafile

-- socket.dns.toip blocks and can't yield, so each host is only looked up once per session.
local resolved = {}

local CONNECT_TIMEOUT = 10
local TOTAL_TIMEOUT = 30

function Http.init(socketModule, sslModule, caPath)
  socket, ssl, cafile = socketModule, sslModule, caPath
end

local function parseUrl(url)
  local scheme, host, port, path = url:match("^(https?)://([^/:]+):?(%d*)(.*)$")
  if not scheme then
    return nil
  end
  port = tonumber(port) or (scheme == "https" and 443 or 80)
  if path == "" then
    path = "/"
  end
  return scheme, host, port, path
end

function Http.isLocalHost(host)
  return host == "localhost" or host == "127.0.0.1"
end

-- LuaSec checks the certificate chain but not that it was issued for this host.
local function hostMatches(pattern, host)
  pattern, host = pattern:lower(), host:lower()
  if pattern == host then
    return true
  end
  local suffix = pattern:match("^%*(%..+)$")
  return suffix ~= nil and host:sub(-#suffix) == suffix and not host:sub(1, -#suffix - 1):find("%.")
end

local function certMatchesHost(cert, host)
  local ext = cert:extensions()
  local san = ext and ext["2.5.29.17"]
  if san and san.dNSName then
    for _, name in ipairs(san.dNSName) do
      if hostMatches(name, host) then
        return true
      end
    end
    return false
  end
  for _, entry in ipairs(cert:subject()) do
    if entry.name == "commonName" and hostMatches(entry.value, host) then
      return true
    end
  end
  return false
end

local function wouldBlock(err)
  return err == "timeout" or err == "wantread" or err == "wantwrite"
end

local function dechunk(body)
  local out, pos = {}, 1
  while true do
    local sizeLine, nextPos = body:match("^([%x]+)[^\r\n]*\r\n()", pos)
    local size = sizeLine and tonumber(sizeLine, 16)
    if not size or size == 0 then
      break
    end
    out[#out + 1] = body:sub(nextPos, nextPos + size - 1)
    pos = nextPos + size + 2
  end
  return table.concat(out)
end

local function run(req)
  local scheme, host, port, path = parseUrl(req.url)
  if not scheme then
    error("bad url: " .. req.url, 0)
  end
  if scheme == "http" and not Http.isLocalHost(host) then
    error("plain http is only allowed for localhost", 0)
  end

  local ip = resolved[host]
  if not ip then
    local dnsErr
    ip, dnsErr = socket.dns.toip(host)
    if not ip then
      error("dns: " .. tostring(dnsErr), 0)
    end
    resolved[host] = ip
  end

  local conn = socket.tcp()
  req.conn = conn
  conn:settimeout(0)
  local ok, err = conn:connect(ip, port)
  if not ok and err ~= "timeout" then
    -- The address may have changed; look it up again next time.
    resolved[host] = nil
    error("connect: " .. tostring(err), 0)
  end
  if not ok then
    local deadline = socket.gettime() + CONNECT_TIMEOUT
    while true do
      local _, writable = socket.select(nil, { conn }, 0)
      if writable[1] then
        break
      end
      if socket.gettime() > deadline then
        resolved[host] = nil
        error("connect: timed out", 0)
      end
      coroutine.yield()
    end
  end

  if scheme == "https" then
    local wrapped, wrapErr = ssl.wrap(conn, {
      mode = "client",
      protocol = "any",
      options = { "all", "no_sslv2", "no_sslv3", "no_tlsv1", "no_tlsv1_1" },
      verify = "peer",
      cafile = cafile,
    })
    if not wrapped then
      error("tls: " .. tostring(wrapErr), 0)
    end
    conn = wrapped
    req.conn = conn
    conn:sni(host)
    conn:settimeout(0)
    while true do
      local done, hsErr = conn:dohandshake()
      if done then
        break
      end
      if not wouldBlock(hsErr) then
        error("tls: " .. tostring(hsErr), 0)
      end
      coroutine.yield()
    end
    local cert = conn:getpeercertificate()
    if not cert or not certMatchesHost(cert, host) then
      error("tls: certificate is not for " .. host, 0)
    end
  end

  local lines = {
    req.method .. " " .. path .. " HTTP/1.1",
    "Host: " .. host,
    "Connection: close",
    "Content-Length: " .. #req.body,
  }
  for name, value in pairs(req.headers) do
    lines[#lines + 1] = name .. ": " .. value
  end
  local data = table.concat(lines, "\r\n") .. "\r\n\r\n" .. req.body
  local sent = 0
  while sent < #data do
    local last, sendErr, partial = conn:send(data, sent + 1)
    if last then
      sent = last
    else
      sent = partial or sent
      if not wouldBlock(sendErr) then
        error("send: " .. tostring(sendErr), 0)
      end
      coroutine.yield()
    end
  end

  -- "Connection: close" means the server closes the socket when the response is complete.
  local chunks = {}
  while true do
    local chunk, recvErr, partial = conn:receive("*a")
    if chunk then
      chunks[#chunks + 1] = chunk
      break
    end
    if partial and partial ~= "" then
      chunks[#chunks + 1] = partial
    end
    if recvErr == "closed" then
      break
    end
    if not wouldBlock(recvErr) then
      error("receive: " .. tostring(recvErr), 0)
    end
    coroutine.yield()
  end
  conn:close()

  local response = table.concat(chunks)
  local head, body = response:match("^(.-)\r\n\r\n(.*)$")
  local status = head and tonumber(head:match("^HTTP/%d%.%d (%d%d%d)"))
  if not status then
    error("bad response", 0)
  end
  if head:lower():find("\ntransfer%-encoding:%s*chunked") then
    body = dechunk(body)
  end
  req.status = status
  req.body = body
end

-- Starts a request. `opts` = { method, url, headers, body }.
function Http.request(opts)
  local req = {
    method = opts.method or "GET",
    url = opts.url,
    headers = opts.headers or {},
    body = opts.body or "",
    done = false,
    deadline = socket.gettime() + TOTAL_TIMEOUT,
  }
  req.co = coroutine.create(run)
  return req
end

local function finish(req, err)
  req.done = true
  req.err = err
  if err and req.conn then
    pcall(req.conn.close, req.conn)
  end
end

-- Advances a request as far as it can go without blocking.
function Http.step(req)
  if req.done then
    return
  end
  if socket.gettime() > req.deadline then
    finish(req, "timed out")
    return
  end
  local ok, err = coroutine.resume(req.co, req)
  if not ok then
    finish(req, tostring(err))
  elseif coroutine.status(req.co) == "dead" then
    finish(req, nil)
  end
end

-- Runs a request to completion, blocking for at most `seconds`. Used when the game is exiting and
-- there won't be any more frames to step it on.
function Http.wait(req, seconds)
  local deadline = socket.gettime() + seconds
  while not req.done do
    if socket.gettime() > deadline then
      finish(req, "timed out")
      break
    end
    Http.step(req)
    if not req.done then
      socket.sleep(0.01)
    end
  end
end

return Http
