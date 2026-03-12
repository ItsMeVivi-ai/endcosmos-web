from pathlib import Path

root = Path('public')
needle = '/js/senior-mode.js'
script = '<script src="/js/senior-mode.js" defer></script>'
files = sorted(root.glob('**/index.html'))

patch = ['*** Begin Patch']
updated = before_html = appended = 0

for f in files:
    text = f.read_text(encoding='utf-8', errors='ignore')
    if needle in text:
        continue

    lines = text.splitlines()
    target_idx = None
    for i in range(len(lines)-1, -1, -1):
        if '</html>' in lines[i].lower():
            target_idx = i
            break

    f_abs = f.resolve().as_posix()
    patch.append(f'*** Update File: {f_abs}')
    patch.append('@@')

    if target_idx is not None:
        old = lines[target_idx]
        patch.append('-' + old)
        patch.append('+' + script)
        patch.append('+' + old)
        before_html += 1
    else:
        if lines:
            patch.append(' ' + lines[-1])
        patch.append('+' + script)
        appended += 1

    updated += 1

patch.append('*** End Patch')
Path('tmp_senior_patch.txt').write_text('\n'.join(patch), encoding='utf-8')
print(f'updated_candidates={updated} before_html={before_html} appended_end={appended}')
