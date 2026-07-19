import sys

with open(r'c:\Users\Jerwin titus\Desktop\Radix\frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx in range(2320, 2355):
    if idx < len(lines):
        sys.stdout.buffer.write(f"{idx+1}: {lines[idx].strip()}\n".encode('utf-8'))
