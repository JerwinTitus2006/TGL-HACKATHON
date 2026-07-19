with open(r'c:\Users\Jerwin titus\Desktop\Radix\frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

found = False
start_idx = 0
for i, line in enumerate(lines):
    if 'const triggerTalentCheck' in line or 'function triggerTalentCheck' in line:
        start_idx = i
        found = True
        break

if found:
    print(f"Found triggerTalentCheck starting at line {start_idx+1}")
    for j in range(start_idx - 5, min(start_idx + 80, len(lines))):
        print(f"{j+1}: {lines[j].strip()}")
else:
    print("triggerTalentCheck not found")
