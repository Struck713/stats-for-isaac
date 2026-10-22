-- Uploads finished runs to the Stats for Isaac website. Needs the game to be launched with
-- --luadebug (for LuaSocket, io and loading the bundled LuaSec ssl.dll); without it this stays
-- disabled and runs are only recorded locally.
local json = require("json")
local State = require("statsforisaac.state")

local Upload = {}

local BASE_URL = "https://isaac.nstruck.dev"
local BATCH_SIZE = 25
local EXIT_WAIT_SECONDS = 3

local Http
local modDir
local config = {}
local req, batch

Upload.available = false
Upload.reason = nil
Upload.last = nil

-- The mod folder, worked out from where this file was loaded from.
local function findModDir()
  local source = debug.getinfo(1, "S").source:gsub("^@", "")
  return source:match("^(.*)[/\\]statsforisaac[/\\]upload%.lua$") or "."
end

local function configPath()
  return modDir .. "/sfi-config.json"
end

local function loadConfig()
  local file = io.open(configPath(), "r")
  if not file then
    return
  end
  local ok, decoded = pcall(json.decode, file:read("*a"))
  file:close()
  if ok and type(decoded) == "table" then
    config = decoded
    -- Older versions let the URL be changed; it's fixed now.
    config.url = nil
  end
end

local function saveConfig()
  local file, err = io.open(configPath(), "w")
  if not file then
    return false, err
  end
  file:write(json.encode(config))
  file:close()
  return true
end

function Upload.init()
  if not (debug and io and package and package.loadlib) then
    Upload.reason = "launch the game with --luadebug to enable uploads"
    return
  end
  modDir = findModDir()
  local lib = modDir .. "/lib/"
  package.path = lib .. "?.lua;" .. package.path
  package.cpath = lib .. "?.dll;" .. package.cpath
  local okSocket, socket = pcall(require, "socket")
  if not okSocket then
    Upload.reason = "couldn't load socket: " .. tostring(socket)
    return
  end
  local okSsl, ssl = pcall(require, "ssl")
  if not okSsl then
    Upload.reason = "couldn't load ssl: " .. tostring(ssl)
    return
  end
  Http = require("statsforisaac.http")
  Http.init(socket, ssl, lib .. "cacert.pem")
  loadConfig()
  Upload.available = true
end

-- Finished runs waiting to upload. They're only held in memory, so whatever is left when the game
-- closes is lost.
function Upload.pendingRuns()
  return State.data and State.data.runs or {}
end

-- Each run's JSON, encoded one run per frame so a batch never costs one long frame.
local encoded = setmetatable({}, { __mode = "k" })
local wanted = false

-- Encodes the first run in the next batch that isn't encoded yet. Returns false once there's none.
local function encodeNext()
  local pending = Upload.pendingRuns()
  for i = 1, math.min(BATCH_SIZE, #pending) do
    local run = pending[i]
    if not encoded[run] then
      local ok, text = pcall(json.encode, run)
      if ok then
        encoded[run] = text
      else
        table.remove(pending, i)
        Upload.last = "dropped a run that couldn't be encoded: " .. tostring(text)
        Isaac.DebugString("[Stats for Isaac] " .. Upload.last)
      end
      return true
    end
  end
  return false
end

local function handleResponse(done)
  local sent = batch
  req, batch = nil, nil
  if done.err then
    Upload.last = "upload failed: " .. done.err
    return false
  end
  local ok, decoded = pcall(json.decode, done.body or "")
  if done.status ~= 200 or not ok or type(decoded) ~= "table" then
    local message = ok and type(decoded) == "table" and decoded.error or ("HTTP " .. tostring(done.status))
    Upload.last = "upload failed: " .. tostring(message)
    return false
  end
  -- The site has seen every run in the batch. Rejected ones wouldn't do better on a retry, so they
  -- are dropped along with the accepted ones.
  local sentSet = {}
  for _, run in ipairs(sent) do
    sentSet[run] = true
  end
  local pending = Upload.pendingRuns()
  for i = #pending, 1, -1 do
    if sentSet[pending[i]] then
      table.remove(pending, i)
    end
  end
  local accepted = #(decoded.accepted or {})
  local rejected = #(decoded.rejected or {})
  Upload.last = "uploaded " .. accepted .. " run(s)" .. (rejected > 0 and (", " .. rejected .. " rejected") or "")
  Isaac.DebugString("[Stats for Isaac] " .. Upload.last)
  return #sent > 0
end

-- Sends the next batch if every run in it has been encoded.
local function start()
  if not Upload.available or req or not config.token then
    return
  end
  local pending = Upload.pendingRuns()
  if #pending == 0 then
    wanted = false
    return
  end
  local parts = {}
  batch = {}
  for i = 1, math.min(BATCH_SIZE, #pending) do
    local text = encoded[pending[i]]
    if not text then
      batch = nil
      return
    end
    batch[i] = pending[i]
    parts[i] = text
  end
  wanted = false
  req = Http.request({
    method = "POST",
    url = BASE_URL .. "/api/runs",
    headers = {
      ["Authorization"] = "Bearer " .. config.token,
      ["Content-Type"] = "application/json",
    },
    body = '{"schemaVersion":' .. State.data.schemaVersion .. ',"runs":[' .. table.concat(parts, ",") .. "]}",
  })
end

-- Uploads the runs that haven't been uploaded yet, a batch at a time, over the next frames.
function Upload.sync()
  wanted = true
  start()
end

-- Called every frame to advance the request in flight, or to encode one more run for the next.
function Upload.tick()
  if req then
    Http.step(req)
    if req.done and handleResponse(req) then
      wanted = true
    end
  elseif wanted and Upload.available and config.token then
    if not encodeNext() then
      start()
    end
  end
end

-- The game is exiting, so there won't be frames to step a request on. Finishes the request in
-- flight (or sends one batch) within a few seconds. Runs still waiting after that are lost.
function Upload.flush()
  if Upload.available and config.token then
    if not req then
      while encodeNext() do
      end
      start()
    end
    if req then
      local current = req
      Http.wait(current, EXIT_WAIT_SECONDS)
      handleResponse(current)
    end
  end
  local lost = #Upload.pendingRuns()
  if lost > 0 then
    Isaac.DebugString("[Stats for Isaac] " .. lost .. " run(s) were not uploaded and are lost")
  end
end

local function maskToken(token)
  return token and (token:sub(1, 8) .. "...") or "not set"
end

-- Console subcommands: "token <token>", "upload" and "status".
function Upload.command(params)
  local sub, arg = params:match("^(%S+)%s*(.-)%s*$")
  if sub == "status" then
    local lines = {
      "Uploads: " .. (Upload.available and "available" or ("disabled (" .. tostring(Upload.reason) .. ")")),
    }
    if Upload.available then
      lines[#lines + 1] = "Mod folder: " .. modDir
      lines[#lines + 1] = "URL: " .. BASE_URL
      lines[#lines + 1] = "Token: " .. maskToken(config.token)
      lines[#lines + 1] = "Runs waiting to upload: " .. (State.data and #Upload.pendingRuns() or "?")
        .. " (lost if the game closes first)"
      lines[#lines + 1] = "In flight: " .. (req and "yes" or "no")
      lines[#lines + 1] = "Last result: " .. (Upload.last or "none")
    end
    return table.concat(lines, "\n")
  end
  if not Upload.available then
    return "Stats for Isaac: uploads are disabled (" .. tostring(Upload.reason) .. ")"
  end
  if sub == "token" then
    if not arg:match("^sfi_%w+$") then
      return "Usage: sfi token sfi_xxxxxxxx (copy it from your account page)"
    end
    config.token = arg
  elseif sub == "upload" then
    if not config.token then
      return "Set a token first: sfi token <token>"
    end
    Upload.sync()
    return #Upload.pendingRuns() > 0 and "Uploading..." or "Nothing to upload"
  else
    return nil
  end
  local ok, err = saveConfig()
  if not ok then
    return "Couldn't save " .. configPath() .. ": " .. tostring(err)
  end
  Upload.sync()
  return "Saved. Runs waiting to upload: " .. (State.data and #Upload.pendingRuns() or 0)
end

return Upload
