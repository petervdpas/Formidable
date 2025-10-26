-- Title: Meta data check and modification

function safeMetaString(value)
  if type(value) == "string" then
    return pandoc.MetaString(value)
  elseif type(value) == "table" and value.t == "MetaInlines" then
    return pandoc.MetaString(pandoc.utils.stringify(value))
  elseif type(value) == "number" then
    return pandoc.MetaString(tostring(value))
  else
    return nil
  end
end

-- Function to process and concatenate text from inline elements, removing [[_TOC_]]
function ProcessTextElements(elements)
    local result = {}
    local inCode = false

    for _, elem in ipairs(elements) do
        if elem.t == "Str" then
            -- Detect backticks and toggle the inCode flag
            if elem.text == "`" then
                inCode = not inCode
            elseif inCode then
                -- If inCode, wrap the string in a Code element
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

-- Walk through blocks and process only textual blocks
function WalkBlocks(block)
    if block.t == "Para" or block.t == "Plain" then
        block.content = ProcessTextElements(block.content)
    end
    return block
end

-- Main function to process the entire document
function Pandoc(doc)
    for i, block in ipairs(doc.blocks) do
        doc.blocks[i] = WalkBlocks(block)
    end
    return doc
end

-- Function to check if a file exists
local function file_exists(path)
    local f = io.open(path, "r")
    if f then f:close() end
    return f ~= nil
end

-- Function to search for the logo in predefined directories
local function find_logo()
    local dirs = {
        pandoc.system.get_working_directory() .. "/../../.media/Images",
        pandoc.system.get_working_directory() .. "/../.media/Images",
        pandoc.system.get_working_directory() .. "/.media/Images",
        -- Add more directories if needed
    }
    
    local filename = "fontys-logo.png"
    
    for _, dir in ipairs(dirs) do
        local path = dir .. "/" .. filename
        -- Replace backslashes with forward slashes for LaTeX compatibility
        path = path:gsub("\\", "/")
        if file_exists(path) then
            return path
        end
    end
    return nil -- Return nil if the file is not found
end

function Meta(meta)

    local logo_path = find_logo()
    local image_width = "320pt" -- Set the images width variable

    meta.date = meta.date or os.date("%d %B %Y")

    -- Ensure the title page is enabled
    meta.titlepage = meta.titlepage or true

    -- Set default title page logo if not specified
    meta['titlepage-logo'] = meta['titlepage-logo'] or (logo_path and safeMetaString(logo_path))
    meta['logo-width'] = meta['logo-width'] or safeMetaString("140pt")
    
    -- Set default title page color if not specified
    meta['titlepage-color'] = meta['titlepage-color'] or safeMetaString("F8F8F8")

    -- Overwrite title page text color and rule color
    meta['titlepage-text-color'] = meta['titlepage-text-color'] or safeMetaString("552255")
    meta['titlepage-rule-color'] = meta['titlepage-rule-color'] or safeMetaString("552255")

    -- Check and modify table settings
    meta['table-use-row-colors'] = meta['table-use-row-colors'] or true
    meta['table-row-color'] = meta['table-row-color'] or safeMetaString("FAEBFF")

    -- Set header-includes with logo width variable
    if not meta['header-includes'] then
        meta['header-includes'] = {
            pandoc.MetaInlines({pandoc.RawInline('latex', '\\usepackage{graphicx}')}),
            pandoc.MetaInlines({pandoc.RawInline('latex', '\\setkeys{Gin}{width=' .. image_width .. '}')})
        }
    elseif meta['header-includes'].t == "MetaList" then
        table.insert(meta['header-includes'], pandoc.MetaInlines({pandoc.RawInline('latex', '\\usepackage{graphicx}')}))
        table.insert(meta['header-includes'], pandoc.MetaInlines({pandoc.RawInline('latex', '\\setkeys{Gin}{width=' .. image_width .. '}')}))
    end

    return meta
end