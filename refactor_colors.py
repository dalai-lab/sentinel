import os
import re

# We will read index.css first to find existing variables
index_css_path = 'src/index.css'

with open(index_css_path, 'r', encoding='utf-8') as f:
    index_css_content = f.read()

# Find existing css variables in :root
# Format: --var-name: value;
existing_vars = {}
root_match = re.search(r':root\s*\{([^}]+)\}', index_css_content)
if root_match:
    root_content = root_match.group(1)
    for line in root_content.split('\n'):
        line = line.strip()
        if line.startswith('--'):
            parts = line.split(':')
            if len(parts) >= 2:
                var_name = parts[0].strip()
                # rejoin the rest in case of colons in the value
                val = ':'.join(parts[1:]).strip().rstrip(';')
                existing_vars[val] = var_name

color_pattern = re.compile(r'(#[0-9a-fA-F]{3,6}|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\))', re.IGNORECASE)

new_vars = {}
new_vars_count = 0

def color_to_var_name(color_str):
    c = color_str.lower().replace(' ', '')
    if c.startswith('#'):
        return f"--color-hex-{c[1:]}"
    elif c.startswith('rgb'):
        nums = re.findall(r'[\d.]+', c)
        return f"--color-rgb-{'-'.join(nums).replace('.', '-')}"
    return "--color-unknown"

files_to_process = []
for root, _, files in os.walk('src'):
    for f in files:
        if f.endswith(('.jsx', '.css')) and f != 'index.css':
            files_to_process.append(os.path.join(root, f))

replacements_made = 0
for filepath in files_to_process:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    def replacer(match):
        global new_vars_count, replacements_made
        color = match.group(1)
        norm_color = color.lower().replace(' ', '')
        
        var_name = None
        for val, name in existing_vars.items():
            if val.lower().replace(' ', '') == norm_color:
                var_name = name
                break
        
        if not var_name:
            for val, name in new_vars.items():
                if val.lower().replace(' ', '') == norm_color:
                    var_name = name
                    break
                    
        if not var_name:
            var_name = color_to_var_name(color)
            new_vars[color] = var_name
            new_vars_count += 1
            
        replacements_made += 1
        return f"var({var_name})"
        
    new_content = color_pattern.sub(replacer, content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)

if new_vars:
    insert_str = "\n  /* Automatically Extracted Colors */\n"
    for val, name in new_vars.items():
        insert_str += f"  {name}: {val};\n"
        
    root_end_match = re.search(r':root\s*\{[^}]*(\})', index_css_content)
    if root_end_match:
        idx = root_end_match.start(1)
        new_index_css = index_css_content[:idx] + insert_str + index_css_content[idx:]
        with open(index_css_path, 'w', encoding='utf-8') as f:
            f.write(new_index_css)
            
print(f"Processed {len(files_to_process)} files.")
print(f"Replacements made: {replacements_made}")
print(f"New variables created: {new_vars_count}")
