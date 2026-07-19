import sys

with open(r'c:\Users\Jerwin titus\Desktop\Radix\frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'setcompanies' in line.lower() or 'const [companies' in line.lower():
        sys.stdout.buffer.write(f"Line {i+1}: {line.strip()}\n".encode('utf-8'))
