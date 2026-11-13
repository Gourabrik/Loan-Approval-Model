import re, os

for root, dirs, files in os.walk(r'c:\Users\goura\OneDrive\Desktop\Loan-Approval-Model'):
    dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', '.venv', '__pycache__', '.gemini')]
    for file in files:
        if file.endswith(('.py', '.jsx', '.js', '.ts', '.tsx', '.html', '.css', '.json', '.md')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    for idx, line in enumerate(f, 1):
                        if re.search(r'USD|dollar', line, re.IGNORECASE):
                            print(f'{os.path.relpath(path)}:{idx}: {line.strip()[:120]}')
            except:
                pass
