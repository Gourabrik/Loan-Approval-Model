with open(r'c:\Users\goura\OneDrive\Desktop\Loan-Approval-Model\frontend\src\App.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for idx, l in enumerate(lines):
        if 'function NumberField' in l or 'const NumberField' in l:
            for j in range(max(0, idx - 2), min(len(lines), idx + 25)):
                print(f"{j+1}: {lines[j].strip()}")

