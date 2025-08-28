-- Utility: coerce various meta values to a MetaString
local function safeMetaString(value)
  if value == nil then return nil end
  local t = type(value)
  if t == "string" then
    return pandoc.MetaString(value)
  elseif t == "number" then
    return pandoc.MetaString(tostring(value))
  elseif t == "boolean" then
    return pandoc.MetaString(value and "true" or "false")
  elseif t == "table" then
    -- Works for MetaString/MetaInlines/MetaBlocks
    return pandoc.MetaString(pandoc.utils.stringify(value))
  else
    return nil
  end
end

-- Normalize hex color for Eisvogel (strip a leading #)
local function normalize_hex(hex)
  if type(hex) ~= "string" then return hex end
  return (hex:gsub("^#", "")) -- " #F8F8F8 " -> "F8F8F8"
end

-- Function to process and concatenate text from inline elements
local function ProcessTextElements(elements)
  local result, inCode = {}, false
  for _, elem in ipairs(elements) do
    if elem.t == "Str" then
      if elem.text == "`" then
        inCode = not inCode
      elseif inCode then
        table.insert(result, pandoc.Code(elem.text))
      else
        table.insert(result, elem)
      end
    elseif elem.t == "Space" then
      table.insert(result, pandoc.Space())
    else
      table.insert(result, elem)
    end
  end
  return result
end

local function WalkBlocks(block)
  if block.t == "Para" or block.t == "Plain" then
    block.content = ProcessTextElements(block.content)
  end
  return block
end

function Pandoc(doc)
  for i, block in ipairs(doc.blocks) do
    doc.blocks[i] = WalkBlocks(block)
  end
  return doc
end

-- Filesystem helpers for logo probing
local function file_exists(path)
  local f = io.open(path, "r")
  if f then f:close() end
  return f ~= nil
end

local function find_logo()
  local wd = pandoc.system.get_working_directory()
  local dirs = {
    wd .. "/../../.media/Images",
    wd .. "/../.media/Images",
    wd .. "/.media/Images",
  }
  local filename = "fontys-logo.png"
  for _, dir in ipairs(dirs) do
    local path = (dir .. "/" .. filename):gsub("\\", "/")
    if file_exists(path) then return path end
  end
  return nil
end

function Meta(meta)
  -- 1) Date default (only if not provided)
  meta.date = meta.date or os.date("%d %B %Y")

  -- 2) Title page toggles / defaults
  if meta.titlepage == nil then meta.titlepage = true end

  -- Normalize Eisvogel colors (strip '#')
  if meta["titlepage-color"] then
    meta["titlepage-color"] = safeMetaString(normalize_hex(pandoc.utils.stringify(meta["titlepage-color"])))
  else
    meta["titlepage-color"] = safeMetaString("F8F8F8")
  end

  if meta["titlepage-text-color"] then
    meta["titlepage-text-color"] = safeMetaString(normalize_hex(pandoc.utils.stringify(meta["titlepage-text-color"])))
  else
    meta["titlepage-text-color"] = safeMetaString("552255")
  end

  if meta["titlepage-rule-color"] then
    meta["titlepage-rule-color"] = safeMetaString(normalize_hex(pandoc.utils.stringify(meta["titlepage-rule-color"])))
  else
    meta["titlepage-rule-color"] = safeMetaString("552255")
  end

  -- 3) Logo defaults (keep your existing 'logo-width' handling)
  if meta["titlepage-logo"] == nil then
    local logo = find_logo()
    if logo then meta["titlepage-logo"] = safeMetaString(logo) end
  end
  meta["logo-width"] = meta["logo-width"] or safeMetaString("140pt")

  -- 4) Tables (defaults)
  if meta["table-use-row-colors"] == nil then meta["table-use-row-colors"] = true end
  meta["table-row-color"] = meta["table-row-color"] or safeMetaString("FAEBFF")

  -- 5) NEW: Global image width from front matter
  --    Front matter key: image-width (examples: "320pt", "120mm", "0.8\\linewidth")
  local image_width = "320pt"
  if meta["image-width"] ~= nil then
    image_width = pandoc.utils.stringify(meta["image-width"])
  end

  -- 6) Ensure header-includes contains our LaTeX directives
  -- Use MetaList of MetaBlocks (canonical for header-includes)
  local hi = meta["header-includes"]
  if hi == nil then
    hi = pandoc.MetaList({})
  elseif hi.t ~= "MetaList" then
    -- Coerce scalar to list
    hi = pandoc.MetaList({ hi })
  end

  -- 7) Global font size from front matter
  if meta["fontsize"] ~= nil then
    local fs = pandoc.utils.stringify(meta["fontsize"])
    table.insert(hi, pandoc.MetaBlocks({ pandoc.RawBlock("latex", "\\fontsize{" .. fs .. "}{" .. tonumber(fs:match("%d+"))+2 .. "}\\selectfont") }))
  end

  -- Always load graphicx and set default Gin width from image-width
  table.insert(hi, pandoc.MetaBlocks({ pandoc.RawBlock("latex", "\\usepackage{graphicx}") }))
  table.insert(hi, pandoc.MetaBlocks({ pandoc.RawBlock("latex", "\\setkeys{Gin}{width=" .. image_width .. "}") }))

  meta["header-includes"] = hi

  return meta
end