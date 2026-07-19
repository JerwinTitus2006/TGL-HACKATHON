import sys

with open(r'c:\Users\Jerwin titus\Desktop\Radix\frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

found = False
for i, line in enumerate(lines):
    if 'activeTab === \'benchmarking\'' in line or 'activeTab===\'benchmarking\'' in line:
        print(f"Line {i+1}: {line.strip()}")
        found = True
        # Print next 100 lines
        for j in range(i, min(i+150, len(lines))):
            sys.stdout.buffer.write(f"{j+1}: {lines[j].strip()}\n".encode('utf-8'))
        break

if not found:
    print("Not found benchmarking tab JSX")
