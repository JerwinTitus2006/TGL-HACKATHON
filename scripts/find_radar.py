with open(r'c:\Users\Jerwin titus\Desktop\Radix\frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

found = False
start_idx = 0
for i, line in enumerate(lines):
    if 'const RadarChart' in line or 'function RadarChart' in line:
        start_idx = i
        found = True
        break

if found:
    print(f"Found RadarChart starting at line {start_idx+1}")
    for j in range(start_idx, min(start_idx + 100, len(lines))):
        print(f"{j+1}: {lines[j].strip()}")
else:
    print("RadarChart not found")
