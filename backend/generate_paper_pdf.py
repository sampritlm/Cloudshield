import os
import sys
import subprocess
import shutil

def generate_paper_pdf():
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    html_path = os.path.join(project_root, "CloudShield_Research_Paper.html")
    pdf_path = os.path.join(project_root, "CloudShield_Research_Paper.pdf")

    if not os.path.exists(html_path):
        print(f"Error: HTML paper source not found at: {html_path}")
        sys.exit(1)

    print(f"Reading research paper source: {html_path}")
    print(f"Target PDF destination: {pdf_path}")

    # Locate Edge or Chrome browser
    possible_browsers = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
    ]

    browser_exe = None
    for path in possible_browsers:
        if os.path.exists(path):
            browser_exe = path
            break

    if not browser_exe:
        browser_exe = shutil.which("msedge") or shutil.which("chrome")

    if not browser_exe:
        print("Error: Headless browser (Microsoft Edge or Google Chrome) could not be located.")
        sys.exit(1)

    print(f"Using browser rendering engine: {browser_exe}")

    file_url = f"file:///{html_path.replace(os.sep, '/')}"
    cmd = [
        browser_exe,
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path}",
        file_url
    ]

    print("Compiling research paper to IEEE/ACM Publication Quality PDF...")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"Browser compilation failed: {result.stderr}")
        sys.exit(result.returncode)

    if os.path.exists(pdf_path):
        size_kb = os.path.getsize(pdf_path) / 1024
        print(f"Success! Research paper PDF compiled successfully.")
        print(f"Location: {pdf_path} ({size_kb:.1f} KB)")
    else:
        print("Error: Target PDF was not generated.")
        sys.exit(1)

if __name__ == "__main__":
    generate_paper_pdf()
