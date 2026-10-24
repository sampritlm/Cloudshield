import os
import sys

def main():
    root_dir = os.path.abspath(r"d:\acc\Cloudsheild")
    output_txt = os.path.join(root_dir, "CloudShield_Full_Codebase.txt")
    output_md = os.path.join(root_dir, "CloudShield_Full_Codebase.md")

    skip_dirs = {
        '.git', 'node_modules', 'venv', '.venv', '__pycache__',
        '.pytest_cache', 'dist', 'build', '.idea', '.vscode'
    }
    skip_files = {
        'package-lock.json', 'CloudShield_Research_Paper.pdf',
        'CloudShield_Research_Paper.html', 'CHAT_EXPORT.md',
        'CloudShield_Full_Codebase.txt', 'CloudShield_Full_Codebase.md',
        'export_codebase.py'
    }
    valid_exts = {
        '.py', '.ts', '.tsx', '.js', '.jsx', '.css', '.html',
        '.json', '.ini', '.bat', '.ps1', '.sql', '.yaml', '.yml',
        '.md', '.txt', '.sh', '.toml'
    }
    special_files = {'.gitignore', 'Dockerfile', 'pytest.ini', '.env.example'}

    collected_files = []

    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Exclude skip directories in place
        dirnames[:] = [d for d in dirnames if d not in skip_dirs]
        for f in sorted(filenames):
            if f in skip_files:
                continue
            ext = os.path.splitext(f)[1].lower()
            if ext in valid_exts or f in special_files:
                rel_path = os.path.relpath(os.path.join(dirpath, f), root_dir).replace('\\', '/')
                full_path = os.path.join(dirpath, f)
                collected_files.append((rel_path, full_path, ext))

    collected_files.sort(key=lambda x: x[0])

    print(f"Found {len(collected_files)} source files to export.")

    total_lines = 0

    with open(output_txt, 'w', encoding='utf-8') as out_f, open(output_md, 'w', encoding='utf-8') as out_md:
        header_text = f"""# CLOUDSHIELD: FULL REPOSITORY CODEBASE EXPORT
Export Generated: Complete Source Code for LLM / GPT Prompting
Root Path: {root_dir}
Total Files Included: {len(collected_files)}

================================================================================
TABLE OF CONTENTS:
================================================================================
"""
        out_f.write(header_text)
        out_md.write(header_text)

        for idx, (rel_path, full_path, _) in enumerate(collected_files, 1):
            out_f.write(f"{idx:02d}. {rel_path}\n")
            out_md.write(f"- [`{rel_path}`](#{rel_path.replace('/', '-').replace('.', '-')})\n")

        out_f.write("\n" + "=" * 80 + "\n\n")
        out_md.write("\n\n---\n\n")

        for idx, (rel_path, full_path, ext) in enumerate(collected_files, 1):
            try:
                with open(full_path, 'r', encoding='utf-8', errors='replace') as sf:
                    content = sf.read()
                    lines = content.count('\n') + 1
                    total_lines += lines

                    # TXT format
                    out_f.write("=" * 80 + "\n")
                    out_f.write(f"FILE [{idx}/{len(collected_files)}]: {rel_path} ({lines} lines)\n")
                    out_f.write("=" * 80 + "\n")
                    out_f.write(content)
                    if not content.endswith('\n'):
                        out_f.write('\n')
                    out_f.write("\n\n")

                    # Markdown format
                    lang = 'python' if ext == '.py' else 'typescript' if ext in ('.ts', '.tsx') else 'json' if ext == '.json' else 'css' if ext == '.css' else 'html' if ext == '.html' else 'bash' if ext in ('.sh', '.bat', '.ps1') else ''
                    out_md.write(f"## {idx}. `{rel_path}` ({lines} lines)\n\n")
                    out_md.write(f"```{lang}\n")
                    out_md.write(content)
                    if not content.endswith('\n'):
                        out_md.write('\n')
                    out_md.write("```\n\n---\n\n")

            except Exception as e:
                print(f"Error reading {rel_path}: {e}")

    size_mb_txt = os.path.getsize(output_txt) / (1024 * 1024)
    size_mb_md = os.path.getsize(output_md) / (1024 * 1024)
    print(f"Export Complete!")
    print(f"Total Lines of Code: {total_lines:,}")
    print(f"TXT Export: {output_txt} ({size_mb_txt:.2f} MB)")
    print(f"MD Export: {output_md} ({size_mb_md:.2f} MB)")

if __name__ == '__main__':
    main()
